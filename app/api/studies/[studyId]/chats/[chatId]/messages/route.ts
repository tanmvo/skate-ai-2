import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateStudyOwnership } from "@/lib/auth";

export async function GET(
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
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        chatId: params.chatId,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ studyId: string; chatId: string }> }
) {
  const params = await context.params;

  try {
    const { role, content }: {
      role: string;
      content: string;
    } = await request.json();

    if (!role || !content) {
      return NextResponse.json(
        { error: "Role and content are required" },
        { status: 400 }
      );
    }

    if (!['USER', 'ASSISTANT'].includes(role)) {
      return NextResponse.json(
        { error: "Role must be USER or ASSISTANT" },
        { status: 400 }
      );
    }

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
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    const message = await prisma.chatMessage.create({
      data: {
        role: role as 'USER' | 'ASSISTANT',
        content,
        chatId: params.chatId,
        studyId: params.studyId, // Denormalized for easier queries
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}