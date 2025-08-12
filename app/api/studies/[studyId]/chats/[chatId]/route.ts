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

    const chat = await prisma.chat.findFirst({
      where: {
        id: params.chatId,
        studyId: params.studyId, // Ensure chat belongs to the study
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ studyId: string; chatId: string }> }
) {
  const params = await context.params;
  
  try {
    const { title }: { title?: string } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
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

    const chat = await prisma.chat.updateMany({
      where: {
        id: params.chatId,
        studyId: params.studyId, // Ensure chat belongs to the study
      },
      data: {
        title,
        updatedAt: new Date(),
      },
    });

    if (chat.count === 0) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    // Fetch and return updated chat
    const updatedChat = await prisma.chat.findUnique({
      where: {
        id: params.chatId,
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("Error updating chat:", error);
    return NextResponse.json(
      { error: "Failed to update chat" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const deleteResult = await prisma.chat.deleteMany({
      where: {
        id: params.chatId,
        studyId: params.studyId, // Ensure chat belongs to the study
      },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}