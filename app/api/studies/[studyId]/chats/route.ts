import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateStudyOwnership, getCurrentUserId } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studyId: string }> }
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

    const chats = await prisma.chat.findMany({
      where: {
        studyId: params.studyId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return NextResponse.json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ studyId: string }> }
) {
  const params = await context.params;
  
  try {
    const { title }: { title?: string } = await request.json().catch(() => ({}));
    
    // Validate user owns this study
    const isOwner = await validateStudyOwnership(params.studyId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    const userId = getCurrentUserId();

    const chat = await prisma.chat.create({
      data: {
        title: title || "New Chat",
        studyId: params.studyId,
        userId,
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return NextResponse.json(chat, { status: 201 });
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 }
    );
  }
}