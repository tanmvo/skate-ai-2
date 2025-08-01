import { streamText, createDataStreamResponse } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { NextRequest } from 'next/server';
import { validateStudyOwnership, getCurrentUserId } from '@/lib/auth';
import { findRelevantChunks } from '@/lib/vector-search';
import { Citation } from '@/lib/types/citations';
import { 
  sanitizeError, 
  withTimeout, 
  checkRateLimit, 
  ServiceUnavailableError,
  RateLimitError 
} from '@/lib/error-handling';

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

    // Use createDataStreamResponse for citation streaming
    return createDataStreamResponse({
      execute: async (dataStream) => {
        // Find relevant document chunks for context with timeout
        let documentContext = '';
        let citations: Citation[] = [];
        
        try {
          const relevantChunks = await withTimeout(
            findRelevantChunks(latestMessage.content, {
              studyId,
              limit: 5,
              minSimilarity: 0.1,
            }),
            10000 // 10 second timeout
          );

          if (relevantChunks.length > 0) {
            // Build document context for the AI
            documentContext = relevantChunks
              .map((chunk) => 
                `Document: ${chunk.documentName}\nContent: ${chunk.content.trim()}\n`
              )
              .join('\n---\n\n');

            // Format citations for streaming
            citations = relevantChunks.map((chunk) => ({
              documentId: chunk.documentId,
              documentName: chunk.documentName,
              chunkId: chunk.chunkId,
              content: chunk.content.slice(0, 200) + (chunk.content.length > 200 ? '...' : ''),
              similarity: chunk.similarity,
              chunkIndex: chunk.chunkIndex,
            }));

            // Stream citations immediately
            dataStream.writeData({
              type: 'citations',
              citations: citations.map(citation => ({
                documentId: citation.documentId,
                documentName: citation.documentName,
                chunkId: citation.chunkId,
                content: citation.content,
                similarity: citation.similarity,
                chunkIndex: citation.chunkIndex
              }))
            });
          }
        } catch (error) {
          console.warn('Failed to retrieve document context:', error);
          // Continue without context rather than failing
        }

        // Build system prompt with document context
        const systemPrompt = `You are a research assistant helping analyze documents. Your role is to:

1. **Extract themes and patterns** from research documents
2. **Find specific quotes and insights** relevant to user questions  
3. **Compare and contrast** information across multiple documents
4. **Synthesize findings** into clear, actionable insights

When responding:
- Reference specific documents when citing information
- Provide direct quotes when relevant
- Identify patterns and themes across documents
- Be precise and research-focused in your analysis

${documentContext ? `

## Available Document Context:
${documentContext}

Base your responses on this document content when relevant to the user's question.` : ''}`;

        // Generate AI response and merge with data stream
        const result = streamText({
          model: anthropic('claude-3-haiku-20240307'),
          system: systemPrompt,
          messages: messages.map((msg: { role: string; content: string }) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          temperature: 0.1, // Lower temperature for more focused, research-oriented responses
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