import { streamText } from 'ai';
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
    }

    // Build enhanced system prompt for natural synthesis using search tools
    const systemPrompt = `You are a research assistant. For analysis questions, use multiple targeted searches to gather comprehensive information, then synthesize insights naturally in your own voice.

## Study Context:
${studyContext}

## Analysis Approach for Complex Questions:
1. **Break down** analysis questions into 3-4 specific search aspects
2. **Search systematically** using search_all_documents for each aspect  
3. **Synthesize findings** naturally in your response based on search results
4. **Reference sources** from search results in your analysis

## Available Tools:
- **search_all_documents**: Search across all documents (use multiple times for thorough analysis)
- **find_document_ids**: Convert document names to IDs when specific documents are mentioned
- **search_specific_documents**: Search within specific documents when targeted analysis is needed

## Example Analysis Pattern:
**User asks: "What are the main themes across these interviews?"**

Your approach:
1. Search "key challenges problems difficulties" 
2. Search "main goals objectives priorities"
3. Search "processes workflows methods"
4. Search "team collaboration communication"
5. Then synthesize: "Based on my analysis across the documents, several key themes emerge: [provide comprehensive analysis with specific examples and citations from search results]"

## Response Guidelines:
- Provide thoughtful analysis supported by evidence from searches
- Include specific quotes or examples when relevant  
- Reference source documents naturally in your analysis
- Focus on actionable insights and patterns
- Be comprehensive but concise

Never just return raw search results - always synthesize into meaningful insights.`;

    // Generate AI response with function calling enabled
    try {
      // Initialize search tools
      let searchTools = {};
      
      try {
        // Note: Search tools still need dataStream parameter for now
        // We'll create a dummy dataStream to avoid breaking them during this migration
        const dummyDataStream = {
          writeData: () => {} // No-op function
        };
        searchTools = createSearchTools(studyId, dummyDataStream);
      } catch (error) {
        console.error('Failed to create search tools:', error);
      }
      
      // Using search-only approach - no synthesis tools needed
      const allTools = { ...searchTools };
      
      const result = streamText({
        model: anthropic('claude-3-5-sonnet-20241022'),
        system: systemPrompt,
        messages: messages.map((msg: { role: string; content: string }) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        tools: allTools,
        maxSteps: 5, // Allow multiple tool calls for find_document_ids → search_specific_documents workflow
        temperature: 0.0, // More deterministic to follow instructions exactly
        maxTokens: 4000,
        toolChoice: 'auto', // Let AI decide when to use tools
        onStepFinish: ({ toolCalls }) => {
          // Log tool usage for monitoring
          if (toolCalls && toolCalls.length > 0) {
            console.log(`Tools called: ${toolCalls.map((tc: { toolName: string }) => tc.toolName).join(', ')}`);
          }
        },
      });

      // Return standard AI SDK response (no manual stream merging needed)
      return result.toDataStreamResponse();
      
    } catch (streamError) {
      console.error('Streaming generation error:', streamError);
      
      return Response.json(
        { error: 'AI response generation failed', details: sanitizeError(streamError).message, retryable: true },
        { status: 500 }
      );
    }

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