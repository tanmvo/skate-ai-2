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

Never just return raw search results - always synthesize into meaningful insights with proper analysis and evidence.`;

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