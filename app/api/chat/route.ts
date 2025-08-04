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

        // Build enhanced system prompt with metadata context and function calling guidance
        const systemPrompt = `You are a research assistant helping analyze documents. Your role is to:

1. **Extract themes and patterns** from research documents
2. **Find specific quotes and insights** relevant to user questions  
3. **Compare and contrast** information across multiple documents
4. **Synthesize findings** into clear, actionable insights

## Study Context:
${studyContext}

## Search Tools Available:
You have access to three search tools:
- **find_document_ids**: Convert document filenames to IDs. Use when users mention specific document names
- **search_all_documents**: Search across all available documents for general queries
- **search_specific_documents**: Search within specific documents using document IDs

## Document Search Workflow:
⚠️ **CRITICAL**: NEVER pass filenames to search_specific_documents!

**STEP 1**: ALWAYS call find_document_ids first with document filenames
**STEP 2**: Use the returned document IDs (UUIDs) in search_specific_documents

When responding:
1. If user mentions specific documents: find_document_ids → search_specific_documents
   - find_document_ids receives: ["filename.txt"] 
   - search_specific_documents receives: ["uuid-123-456"]
2. If general query: search_all_documents  
3. Present search results and analysis directly - no preliminary messages before calling tools
4. Provide analysis based on search results with proper citations
5. If searches fail, offer constructive alternatives and next steps`;

        // Generate AI response with function calling enabled
        const result = streamText({
          model: anthropic('claude-3-haiku-20240307'),
          system: systemPrompt,
          messages: messages.map((msg: { role: string; content: string }) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          tools: createSearchTools(studyId, dataStream),
          maxSteps: 5, // Allow multiple tool calls for find_document_ids → search_specific_documents workflow
          temperature: 0.1,
          maxTokens: 2000,
        });

        // Merge text stream with data stream
        result.mergeIntoDataStream(dataStream);
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