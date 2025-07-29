import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, validateStudyOwnership } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studyId: string }> }
) {
  const params = await context.params;
  try {
    const userId = getCurrentUserId();
    
    // Validate user owns this study
    const isOwner = await validateStudyOwnership(params.studyId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    const study = await prisma.study.findFirst({
      where: { 
        id: params.studyId,
        userId,
      },
      include: {
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
        messages: {
          orderBy: { timestamp: "asc" },
        },
        _count: {
          select: {
            documents: true,
            messages: true,
          },
        },
      },
    });

    if (!study) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(study);
  } catch (error) {
    console.error("Error fetching study:", error);
    return NextResponse.json(
      { error: "Failed to fetch study" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ studyId: string }> }
) {
  const params = await context.params;
  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Study name is required" },
        { status: 400 }
      );
    }

    const userId = getCurrentUserId();
    
    // Validate user owns this study
    const isOwner = await validateStudyOwnership(params.studyId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    const study = await prisma.study.updateMany({
      where: { 
        id: params.studyId,
        userId,
      },
      data: { name: name.trim() },
    });

    if (study.count === 0) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    // Fetch the updated study to return
    const updatedStudy = await prisma.study.findFirst({
      where: { 
        id: params.studyId,
        userId,
      },
      include: {
        _count: {
          select: {
            documents: true,
            messages: true,
          },
        },
      },
    });

    return NextResponse.json(updatedStudy);
  } catch (error) {
    console.error("Error updating study:", error);
    return NextResponse.json(
      { error: "Failed to update study" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ studyId: string }> }
) {
  const params = await context.params;
  try {
    const userId = getCurrentUserId();
    
    // Validate user owns this study
    const isOwner = await validateStudyOwnership(params.studyId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    const result = await prisma.study.deleteMany({
      where: { 
        id: params.studyId,
        userId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Study deleted successfully" });
  } catch (error) {
    console.error("Error deleting study:", error);
    return NextResponse.json(
      { error: "Failed to delete study" },
      { status: 500 }
    );
  }
}