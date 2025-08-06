import { streamText, createDataStreamResponse } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { NextRequest } from 'next/server';
import { validateStudyOwnership, getCurrentUserId } from '@/lib/auth';
import { 
  sanitizeError, 
  checkRateLimit, 
  ServiceUnavailableError,
  RateLimitError 
} from '@/lib/error-handling';
import { 
  createSearchTools
} from '@/lib/llm-tools/search-tools';
import { createSynthesisTools } from '@/lib/llm-tools/synthesis-tools';
import { buildStudyContext } from '@/lib/metadata-context';
import { getCachedData, studyContextKey } from '@/lib/metadata-cache';

export async function POST(req: NextRequest) {
  try {
    // Check API key availability first
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableError('AI service');
    }

    const { messages, studyId } = await req.json();

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    if (!studyId) {
      return Response.json(
        { error: 'Study ID is required' },
        { status: 400 }
      );
    }

    // Rate limiting check
    const userId = getCurrentUserId();
    const rateLimitKey = `chat:${userId}:${studyId}`;
    const rateCheck = checkRateLimit(rateLimitKey, 20, 60000); // 20 requests per minute
    
    if (!rateCheck.allowed) {
      throw new RateLimitError(rateCheck.retryAfter);
    }

    // Validate user owns the study
    const isOwner = await validateStudyOwnership(studyId);
    if (!isOwner) {
      return Response.json(
        { error: 'Study not found' },
        { status: 404 }
      );
    }

    // Get the latest user message for context retrieval
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== 'user') {
      return Response.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      );
    }

    // Use createDataStreamResponse for citation streaming with function calling
    return createDataStreamResponse({
      execute: async (dataStream) => {
        try {
          // Get study metadata context (with caching)
          let studyContext = '';
          
          try {
            studyContext = await getCachedData(
              studyContextKey(studyId),
              () => buildStudyContext(studyId),
              300000 // 5 minutes TTL
            );
          } catch (error) {
            console.warn('Failed to load study context:', error);
            studyContext = `Study context unavailable. Using fallback search.`;
            
            // Send error notification to data stream for UI awareness
            dataStream.writeData({
              type: 'study-context-error',
              error: 'Study context unavailable, using fallback mode',
              timestamp: Date.now(),
            });
          }

        // Build enhanced system prompt with metadata context and intelligent tool routing
        const systemPrompt = `You are a research assistant with advanced analysis capabilities. Your role is to help users discover insights from their documents through two complementary approaches:

## Study Context:
${studyContext}

## Conversation Memory Guidelines:
- **Reference Previous Results**: When users ask follow-up questions, explicitly reference themes, insights, or findings from earlier in the conversation
- **Remember Context**: Retain company details, project context, and user-specific information shared during the conversation
- **Build Incrementally**: Don't repeat full synthesis - build upon previous analysis with new insights or deeper exploration
- **Acknowledge Continuity**: Use phrases like "Building on the themes we identified..." or "As we discussed earlier..." when relevant
- **Cross-Reference**: Connect new questions to previously synthesized themes and patterns

## Available Analysis Tools:

### MODE 1: Quick Search & Response
Use these tools for direct information retrieval:
- **find_document_ids**: Convert document filenames to IDs when users mention specific documents
- **search_all_documents**: Search across all documents for factual queries
- **search_specific_documents**: Search within specific documents (requires document IDs)

### MODE 2: Deep Research Synthesis  
Use this tool for comprehensive analysis:
- **synthesize_research_findings**: Advanced tool that searches multiple queries, analyzes findings across documents, and generates structured insights with precise citations

## Tool Selection Guidelines:

**🚫 DO NOT USE TOOLS for Follow-up Questions:**
- "Tell me more about theme X" (elaborate from memory)
- "Can you expand on that point?" (use previous context)
- "What did you mean by..." (clarify previous response)
- "How does that relate to [previous topic]?" (connect using conversation history)
- Questions about previously synthesized themes/insights

**Use Quick Search Tools for:**
- NEW information requests: "What does document X say about Y?"
- Fact-finding: "Find quotes about Z"
- Specific document queries: "Show me information on topic A"

**Use Research Synthesis for:**
- INITIAL comprehensive analysis: "What are the main themes in these interviews?"
- New pattern discovery: "What patterns emerge across documents?"
- Fresh comparative analysis: "Compare user feedback between versions"
- First-time insights: "Synthesize findings from all research"

## Response Guidelines:
1. **FIRST: Check if this is a follow-up question about previous results - if yes, respond from conversation memory WITHOUT tools**
2. For NEW information needs: choose appropriate tool(s) 
3. For document-specific queries: find_document_ids → search_specific_documents
4. For NEW synthesis requests: synthesize_research_findings
5. Present findings clearly with proper source attribution

**Default to Quick Search for speed unless synthesis is clearly needed for comprehensive analysis.**`;

          // Generate AI response with function calling enabled
          try {
            const result = streamText({
              model: anthropic('claude-3-5-sonnet-20241022'),
              system: systemPrompt,
              messages: messages.map((msg: { role: string; content: string }) => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
              })),
              tools: {
                ...createSearchTools(studyId, dataStream),
                ...createSynthesisTools(studyId, dataStream),
              },
              maxSteps: 5, // Allow multiple tool calls for find_document_ids → search_specific_documents workflow
              temperature: 0.1,
              maxTokens: 4000,
              onStepFinish: ({ stepType, toolCalls }) => {
                // Enhanced streaming data for real-time UI updates
                if (toolCalls && toolCalls.length > 0) {
                  dataStream.writeData({
                    type: 'tool-calls-complete',
                    stepType,
                    toolCount: toolCalls.length,
                    timestamp: Date.now(),
                  });
                }
              },
            });

            // Merge text stream with data stream with error recovery
            result.mergeIntoDataStream(dataStream);
            
          } catch (streamError) {
            console.error('Streaming generation error:', streamError);
            
            // Send error notification to client for graceful handling
            dataStream.writeData({
              type: 'stream-error',
              error: 'AI response generation failed',
              details: sanitizeError(streamError).message,
              timestamp: Date.now(),
              retryable: true,
            });
            
            // Provide fallback response
            dataStream.writeData({
              type: 'fallback-response',
              message: 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.',
              timestamp: Date.now(),
            });
          }

        } catch (executeError) {
          console.error('Stream execution error:', executeError);
          
          // Critical error in stream execution
          dataStream.writeData({
            type: 'execution-error',
            error: 'Failed to execute chat request',
            details: sanitizeError(executeError).message,
            timestamp: Date.now(),
            retryable: false,
          });
        }
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    const sanitized = sanitizeError(error);
    
    // Handle specific error types with appropriate status codes
    if (error instanceof ServiceUnavailableError) {
      return Response.json(
        { error: sanitized.message, code: sanitized.code, retryable: sanitized.retryable },
        { status: 503 }
      );
    }
    
    if (error instanceof RateLimitError) {
      const response = Response.json(
        { error: sanitized.message, code: sanitized.code, retryable: sanitized.retryable },
        { status: 429 }
      );
      
      if (error.retryAfter) {
        response.headers.set('Retry-After', error.retryAfter.toString());
      }
      
      return response;
    }
    
    return Response.json(
      { error: sanitized.message, code: sanitized.code, retryable: sanitized.retryable },
      { status: 500 }
    );
  }
}