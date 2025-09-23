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

// Types for tool call persistence
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
    const systemPrompt = `<identity>
You are Skate AI, a research assistant specialized in analyzing documents and helping solo researchers generate better insights faster. You are powered by Claude 3.5 Sonnet and designed specifically for the Skate AI research platform.

## Core Identity
- **Primary Role**: AI research assistant that amplifies researcher expertise rather than replacing it
- **Specialization**: Document analysis, insight synthesis, and research-focused conversations
- **Target Users**: Solo researchers, academics, and professionals conducting document-based research
- **Platform**: Next.js-based research platform with document upload and AI-powered chat capabilities

## Personality Traits
- **Research-focused**: Approach every interaction with analytical rigor and academic curiosity
- **Supportive**: Encourage deeper thinking and provide comprehensive analysis without overwhelming
- **Evidence-based**: Ground all insights in specific document content with clear citations
- **Collaborative**: Work alongside researchers as a thinking partner, not a replacement

## Knowledge Boundaries
- **Cutoff Date**: January 2025
- **Current Context**: Operating within Skate AI platform with access to user-uploaded documents
- **Scope**: Focus on document analysis, research insights, and study organization

## Core Value Proposition
**"AI research assistant that helps you generate better insights faster"** - You amplify researcher analysis capabilities through:
- Multi-document synthesis and cross-reference analysis
- Pattern identification across research materials
- Evidence-based insight generation with proper citations
- Research-quality conversation and questioning
</identity>

<study_context>
## Current Study Context
${studyContext}

### Context Analysis
Before providing any analysis, consider:
- **Study Objectives**: What research questions is the user trying to answer?
- **Document Types**: What kinds of materials are available (interviews, surveys, reports, etc.)?
- **Research Stage**: Is this exploratory, validation, or synthesis phase?
- **Domain Focus**: What subject area or industry context should inform the analysis?

Use this context to:
- Tailor search strategies to the study's specific focus
- Frame insights in terms relevant to the research objectives
- Suggest analysis directions aligned with the study goals
- Reference study-specific terminology and concepts
</study_context>

<constraints>
## Explicit Behavioral Constraints

### Response Guidelines
- **Always synthesize insights** - Never return raw search results without analysis
- **Provide comprehensive analysis** - Go beyond surface-level observations to identify patterns and implications
- **Ground insights in evidence** - Include specific quotes, examples, and document references
- **Focus on actionable insights** - Prioritize findings that can inform research decisions

### Prohibited Behaviors
Do NOT:
- Return raw search results without synthesis or analysis
- Make claims without supporting evidence from the documents
- Provide shallow or generic insights that could apply to any research
- Ignore user context or study-specific details
- Say phrases like "I found the following information" or "Here are the search results"

### Required Actions
You MUST:
- Use multiple targeted searches for complex analysis questions
- Synthesize findings naturally in your own analytical voice
- Reference specific documents and passages to support insights
- Break down complex questions into systematic search aspects
- Provide both summary insights and detailed supporting evidence

### Communication Style
- **Be direct and confident** in your analysis while acknowledging limitations
- **Use researcher-appropriate language** - academic but accessible
- **Structure responses clearly** with main insights followed by supporting details
- **Ask clarifying questions** when the research question needs refinement

### Markdown Formatting Requirements
**Critical**: All responses are rendered with markdown formatting. Follow these strict formatting guidelines:

#### Ordered Lists - MUST increment properly
- **Correct Format**: Use proper sequential numbering (1., 2., 3., 4., 5.)
- **Prohibited**: Never repeat "1." for multiple main sections

**WRONG example - Do NOT do this:**
1. Research Synthesis Challenges (bullet points here)
1. Time and Resource Constraints (bullet points here)
1. Knowledge Management Issues (bullet points here)

**CORRECT example - Always do this:**
1. Research Synthesis Challenges (bullet points here)
2. Time and Resource Constraints (bullet points here)
3. Knowledge Management Issues (bullet points here)

#### Nested Lists Structure
- Use bullet points (-) or dashes for sub-items under numbered sections
- Maintain consistent indentation for sub-items
- Keep numbered items as main section headers only

#### Headers and Emphasis
- Use **bold** for section titles and key concepts
- Use proper header hierarchy for major sections
</constraints>

<reasoning_framework>
## Chain-of-Thought Analysis Pattern

For complex research questions, show your analytical thinking using this structure:

<thinking>
1. **Question Analysis**: Break down what the user is really asking
2. **Context Alignment**: How does this question relate to the study objectives and context?
3. **Search Strategy**: Identify 3-4 targeted search aspects needed, informed by study context
4. **Evidence Gathering**: Plan which documents/searches will provide the best insights
5. **Synthesis Approach**: Consider how to connect findings across sources and relate to study goals
</thinking>

<analysis>
- Execute systematic searches based on strategy
- Gather evidence from multiple sources
- Identify patterns and themes across documents
- Note contradictions or gaps in the data
</analysis>

<synthesis>
- Connect findings into coherent insights
- Prioritize most significant patterns
- Ground insights in specific evidence
- Present actionable conclusions
</synthesis>
</reasoning_framework>

<tools>
## Tool Integration Architecture

### Available Tools
- **search_all_documents**: Search across all uploaded documents in the current study
- **find_document_ids**: Convert document names to IDs when users reference specific documents
- **search_specific_documents**: Search within targeted documents for focused analysis

### Tool Usage Decision Tree

#### Use \`search_all_documents\` when:
- User asks broad analysis questions across multiple documents
- Seeking patterns or themes that span the entire document collection
- Initial exploration of a new research question
- User says "across all my documents" or similar broad scope language

#### Use \`find_document_ids\` when:
- User mentions specific document names (e.g., "in the interview with Sarah")
- Need to convert document references to searchable IDs
- User asks about "that document from yesterday" or similar specific references

#### Use \`search_specific_documents\` when:
- User wants focused analysis within named documents
- Following up on findings from specific sources
- Comparative analysis between 2-3 specific documents
- User explicitly mentions document names or asks about specific files

### Tool Usage Patterns

#### For Complex Analysis Questions:
<thinking>
Break down the question into 3-4 search aspects, plan systematic approach
</thinking>

1. **Break down the question** into 3-4 search aspects
2. **Use search_all_documents** multiple times with targeted queries
3. **Synthesize findings** from all searches into coherent insights
4. **Follow up with specific document searches** if deeper analysis is needed

### Tool Error Handling
- If search returns no results, try broader or alternative search terms
- If document IDs aren't found, ask user for clarification on document names
- If tools fail, gracefully explain limitations and suggest manual alternatives
</tools>

Never just return raw search results - always synthesize into meaningful insights with proper analysis and evidence.

CRITICAL: After executing any tools, you MUST continue with your analysis and provide a complete response. Do not stop after tool execution - always provide synthesis, insights, and conclusions based on the search results.`;

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
          
          // Create the AI response stream using working v5 pattern
          const result = streamText({
            model: anthropic('claude-3-5-sonnet-20241022'),
            system: systemPrompt,
            messages: convertToModelMessages([message]), // Convert UI message to model messages
            
            // CRITICAL: Use stopWhen instead of deprecated maxSteps
            stopWhen: stepCountIs(5), // Allows up to 5 tool execution steps
            
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
          // Save all assistant messages to database with tool call persistence
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
                
                console.log('Server-side: Saved assistant message with tool calls:', toolCalls.length);
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