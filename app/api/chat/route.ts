import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { NextRequest } from 'next/server';
import { validateStudyOwnership } from '@/lib/auth';
import { findRelevantChunks } from '@/lib/vector-search';

export async function POST(req: NextRequest) {
  try {
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

    // Find relevant document chunks for context
    let documentContext = '';
    try {
      const relevantChunks = await findRelevantChunks(latestMessage.content, {
        studyId,
        limit: 5,
        minSimilarity: 0.1,
      });

      if (relevantChunks.length > 0) {
        documentContext = relevantChunks
          .map((chunk) => 
            `Document: ${chunk.documentName}\nContent: ${chunk.content.trim()}\n`
          )
          .join('\n---\n\n');
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

    // Stream the AI response
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

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}