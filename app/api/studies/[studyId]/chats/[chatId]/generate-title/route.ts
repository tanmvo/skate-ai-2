import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateStudyOwnership } from "@/lib/auth";
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ studyId: string; chatId: string }> }
) {
  const params = await context.params;
  
  try {
    // Validate user owns this study
    const isOwner = await validateStudyOwnership(params.studyId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    // Verify chat exists and belongs to the study
    const chat = await prisma.chat.findFirst({
      where: {
        id: params.chatId,
        studyId: params.studyId,
      },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 6, // Get first 6 messages (3 exchanges)
        },
        _count: {
          select: { messages: true }
        }
      }
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    // Check if chat has enough messages for title generation (at least 6 messages = 3 exchanges)
    if (chat._count.messages < 6) {
      return NextResponse.json(
        { error: "Insufficient messages for title generation" },
        { status: 400 }
      );
    }

    // Extract conversation context for title generation
    const messages = chat.messages;
    const conversationSummary = messages
      .map(msg => `${msg.role === 'USER' ? 'Researcher' : 'AI'}: ${msg.content.substring(0, 200)}`)
      .join('\n');

    // Generate title using Claude Haiku
    const titlePrompt = `Generate a concise, descriptive title (2-6 words) for this research conversation.

Focus on:
- Main research topic or question being explored  
- Key documents or themes mentioned
- Specific analysis type (e.g., "User Interview Analysis", "Survey Data Patterns")

Conversation context:
${conversationSummary}

Title (no quotes, no explanations):`;

    const result = await generateText({
      model: anthropic('claude-3-haiku-20240307'),
      temperature: 0.3, // Slight creativity for varied titles
      prompt: titlePrompt
    });

    // Clean up the generated title
    const generatedTitle = result.text
      .trim()
      .replace(/^["']|["']$/g, '') // Remove quotes if present
      .replace(/\.$/, '') // Remove trailing period
      .substring(0, 100); // Ensure reasonable length

    // Update the chat title in database
    const updatedChat = await prisma.chat.update({
      where: { id: params.chatId },
      data: { 
        title: generatedTitle,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    return NextResponse.json(updatedChat);

  } catch (error) {
    console.error("Error generating chat title:", error);
    
    // Check if it's an API key or model error
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: "AI service configuration error" },
          { status: 503 }
        );
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: "Rate limit exceeded, please try again later" },
          { status: 429 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to generate title" },
      { status: 500 }
    );
  }
}