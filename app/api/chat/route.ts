import { streamText, createUIMessageStream, smoothStream, convertToModelMessages, JsonToSseTransformStream, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { NextRequest } from 'next/server';
import { requireAuth, validateChatOwnership } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  sanitizeError, 
  checkRateLimit, 
  ServiceUnavailableError,
  RateLimitError 
} from '@/lib/error-handling';
import {
  createSearchTools
} from '@/lib/llm-tools/search-tools';
import { trackChatEvent, trackSearchEvent, trackErrorEvent } from '@/lib/analytics/server-analytics';
import { buildSystemPrompt } from '@/lib/prompts/templates/main-system-prompt';
import { extractCitationsFromContent, extractSearchResultsFromToolCalls } from '@/lib/utils/citation-extraction';
interface AISDKv5MessagePart {
  type: string;
  text?: string;
  toolCallId?: string;
  state?: 'input-available' | 'output-available';
  input?: Record<string, unknown>;
  output?: string | object;
}

interface PersistedToolCall {
  toolCallId: string;
  toolName: string;
  state: 'input-available' | 'output-available';
  input?: Record<string, unknown>;
  output?: string;
  timestamp: number;
  query?: string;
  resultCount?: number;
}
import { buildStudyContext } from '@/lib/metadata-context';
import { getCachedData, studyContextKey } from '@/lib/metadata-cache';

// Tool call extraction function
function extractToolCallsFromParts(parts: AISDKv5MessagePart[]): PersistedToolCall[] {
  if (!parts || !Array.isArray(parts)) return [];

  const toolCalls: PersistedToolCall[] = [];
  const processedToolIds = new Set<string>();
  
  // Extract completed tool calls only (output-available state)
  parts
    .filter(part => part.type?.startsWith('tool-') && part.state === 'output-available')
    .forEach(part => {
      if (!part.toolCallId || processedToolIds.has(part.toolCallId)) return;
      
      const toolName = part.type.substring(5); // Remove "tool-" prefix
      const query = part.input?.query as string;
      
      // Extract result count from output string pattern
      let resultCount: number | undefined;
      if (typeof part.output === 'string') {
        const match = part.output.match(/Found (\d+) relevant passages?/i);
        if (match) resultCount = parseInt(match[1], 10);
      }
      
      toolCalls.push({
        toolCallId: part.toolCallId,
        toolName,
        state: part.state!,
        input: part.input || {},
        output: typeof part.output === 'string' ? part.output : JSON.stringify(part.output || ''),
        timestamp: Date.now(),
        query: query || undefined,
        resultCount: resultCount || undefined
      });
      
      processedToolIds.add(part.toolCallId);
    });
    
  return toolCalls;
}

export async function POST(req: NextRequest) {
  const requestStartTime = Date.now();

  try {
    // Check API key availability first
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableError('AI service');
    }

    const { message, id: chatId } = await req.json();

    // Validate required fields
    if (!message) {
      return Response.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!chatId) {
      return Response.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // Authenticate user first
    const userId = await requireAuth();

    // Validate chat ownership using consistent helper pattern
    const chat = await validateChatOwnership(chatId);

    if (!chat) {
      return Response.json(
        { error: 'Study not found or access denied' },
        { status: 404 }
      );
    }

    const studyId = chat.studyId;

    // Rate limiting check
    const rateLimitKey = `chat:${userId}:${studyId}`;
    const rateCheck = checkRateLimit(rateLimitKey, 20, 60000); // 20 requests per minute
    
    if (!rateCheck.allowed) {
      throw new RateLimitError(rateCheck.retryAfter);
    }

    // Validate that the message is from user
    if (message.role !== 'user') {
      return Response.json(
        { error: 'Message must be from user' },
        { status: 400 }
      );
    }

    // Save user message to database first
    let userMessageLength = 0;
    try {
      const userContent = message.parts
        ?.filter((part: { type: string; text?: string }) => part.type === 'text')
        .map((part: { type: string; text?: string }) => part.text)
        .join('') || '';

      userMessageLength = userContent.trim().length;

      await prisma.chatMessage.create({
        data: {
          role: 'USER',
          content: userContent.trim(),
          chatId: chatId,
          studyId: studyId,
        },
      });
      
      // Track message sent
      await trackChatEvent('message_sent', {
        studyId,
        messageLength: userMessageLength,
      }, userId);
      
      console.log('Server-side: Saved user message');
    } catch (error) {
      console.error('Server-side: Failed to save user message:', error);
    }

    // Get study metadata context (with caching)
    let studyContext = '';
    
    try {
      // Use cached study context for optimal performance
      studyContext = await getCachedData(
        studyContextKey(studyId),
        () => buildStudyContext(studyId),
        1800000 // 30 minutes TTL
      );
    } catch (error) {
      console.warn('Failed to load study context:', error);
      studyContext = `Study context unavailable. Using fallback search.`;
    }

    const systemPrompt = await buildSystemPrompt({ studyContext });

    // Track AI response started
    await trackChatEvent('ai_response_started', {
      studyId,
      messageLength: userMessageLength,
    }, userId);

    // Generate AI response using v5 createUIMessageStream pattern
    try {
      const stream = createUIMessageStream({
        execute: ({ writer: dataStream }) => {
          // Initialize search tools
          const searchTools = createSearchTools(studyId);

          // Convert messages and validate
          const convertedMessages = convertToModelMessages([message]);

          // Create the AI response stream using working v5 pattern
          const result = streamText({
            model: anthropic('claude-sonnet-4-20250514'),
            system: systemPrompt,
            messages: convertedMessages,

            // CRITICAL: Use stopWhen instead of deprecated maxSteps
            stopWhen: stepCountIs(10), // Allows up to 10 tool execution steps for multi-document analysis

            // Tool activation control
            experimental_activeTools: Object.keys(searchTools) as ('search_all_documents' | 'find_document_ids' | 'search_specific_documents')[],

            tools: searchTools,
            temperature: 0.0, // More deterministic to follow instructions exactly
            toolChoice: 'auto', // Let AI decide when to use tools
            experimental_transform: smoothStream({
              chunking: 'word' // Word-level chunking for smooth rendering
            }),
          });

          // CRITICAL: Must call consumeStream() for proper streaming
          result.consumeStream();

          // CRITICAL: Merge AI stream with UI message stream
          dataStream.merge(result.toUIMessageStream({
            sendReasoning: true, // Include reasoning steps
          }));
        },
        generateId: () => `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`, // Simple ID generator
        onFinish: async ({ messages }) => {
          try {
            let totalToolCalls = 0;

            for (const msg of messages) {
              if (msg.role === 'assistant') {
                const messageParts = (msg as unknown as { parts?: AISDKv5MessagePart[] }).parts;
                if (!messageParts?.length) continue;

                const toolCalls = extractToolCallsFromParts(messageParts);
                totalToolCalls += toolCalls.length;

                const textContent = messageParts
                  .filter(part => part.type === 'text' && part.text)
                  .map(part => part.text!)
                  .join('').trim();

                // Response length tracking removed - not currently used

                if (!textContent && !toolCalls.length) continue;

                // NEW: Extract search results from tool calls for citation validation
                // Re-run searches to get SearchResult[] objects (AI SDK serializes outputs to strings)
                const searchResults = await extractSearchResultsFromToolCalls(toolCalls, studyId);

                // NEW: Extract and validate citations from content
                const citations = extractCitationsFromContent(textContent, searchResults);

                // Re-validate chat ownership before saving assistant message
                const chatExists = await validateChatOwnership(chatId);

                if (!chatExists) {
                  console.error('Chat ownership validation failed during assistant message save');
                  continue; // Skip this message but continue processing
                }

                await prisma.chatMessage.create({
                  data: {
                    role: 'ASSISTANT',
                    content: textContent,
                    toolCalls: toolCalls.length > 0 ? JSON.parse(JSON.stringify(toolCalls)) : undefined,
                    messageParts: JSON.parse(JSON.stringify(messageParts)), // Full backup for debugging
                    citations: Object.keys(citations).length > 0 ? JSON.parse(JSON.stringify(citations)) : undefined, // NEW
                    chatId: chatId,
                    studyId: studyId,
                  },
                });

                // Track individual tool calls
                for (const toolCall of toolCalls) {
                  await trackSearchEvent('tool_call_completed', {
                    studyId,
                    toolName: toolCall.toolName,
                    query: toolCall.query,
                    resultCount: toolCall.resultCount,
                    processingTimeMs: Date.now() - toolCall.timestamp,
                  }, userId);
                }

                console.log('Server-side: Saved assistant message with tool calls:', toolCalls.length, 'citations:', Object.keys(citations).length);
              }
            }

            // Track AI response completed
            await trackChatEvent('ai_response_completed', {
              studyId,
              messageLength: userMessageLength,
              responseTimeMs: Date.now() - requestStartTime,
              toolCallsCount: totalToolCalls,
            }, userId);

          } catch (error) {
            console.error('Server-side: Tool call persistence failed:', error);
            // Non-blocking - chat continues even if persistence fails
          }
        },
        onError: (error) => {
          // Track AI response failure (non-blocking)
          trackChatEvent('ai_response_failed', {
            studyId,
            messageLength: userMessageLength,
            responseTimeMs: Date.now() - requestStartTime,
            errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          }, userId).catch(console.error);

          return 'An error occurred while processing your request. Please try again.';
        },
      });

      // Return v5 streaming response
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
      
    } catch (streamError) {
      console.error('Streaming generation error:', streamError);

      return Response.json(
        { error: 'AI response generation failed', details: sanitizeError(streamError).message, retryable: true },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Track chat error
    await trackErrorEvent('chat_error_occurred', {
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown chat error',
      endpoint: '/api/chat',
      statusCode: error instanceof ServiceUnavailableError ? 503 : error instanceof RateLimitError ? 429 : 500,
      stackTrace: error instanceof Error ? error.stack : undefined,
    });
    
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