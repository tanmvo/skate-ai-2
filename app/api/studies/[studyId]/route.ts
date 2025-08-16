import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, validateStudyOwnership } from "@/lib/auth";
import { trackStudyEvent, trackErrorEvent } from "@/lib/analytics/server-analytics";

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

    // Track study access
    await trackStudyEvent('study_accessed', {
      studyId: study.id,
      studyName: study.name,
      documentCount: study._count.documents,
      messageCount: study._count.messages,
    }, userId);

    return NextResponse.json(study);
  } catch (error) {
    console.error("Error fetching study:", error);
    
    await trackErrorEvent('api_error_occurred', {
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error fetching study',
      endpoint: `/api/studies/${params.studyId}`,
      statusCode: 500,
      stackTrace: error instanceof Error ? error.stack : undefined,
    });
    
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

    // Track study rename
    if (updatedStudy) {
      await trackStudyEvent('study_renamed', {
        studyId: updatedStudy.id,
        studyName: updatedStudy.name,
        documentCount: updatedStudy._count.documents,
        messageCount: updatedStudy._count.messages,
      }, userId);
    }

    return NextResponse.json(updatedStudy);
  } catch (error) {
    console.error("Error updating study:", error);
    
    await trackErrorEvent('api_error_occurred', {
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error updating study',
      endpoint: `/api/studies/${params.studyId}`,
      statusCode: 500,
      stackTrace: error instanceof Error ? error.stack : undefined,
    });
    
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

    // Get study info before deletion for tracking
    const studyToDelete = await prisma.study.findFirst({
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

    // Track study deletion
    if (studyToDelete) {
      await trackStudyEvent('study_deleted', {
        studyId: studyToDelete.id,
        studyName: studyToDelete.name,
        documentCount: studyToDelete._count.documents,
        messageCount: studyToDelete._count.messages,
      }, userId);
    }

    return NextResponse.json({ message: "Study deleted successfully" });
  } catch (error) {
    console.error("Error deleting study:", error);
    
    await trackErrorEvent('api_error_occurred', {
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error deleting study',
      endpoint: `/api/studies/${params.studyId}`,
      statusCode: 500,
      stackTrace: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { error: "Failed to delete study" },
      { status: 500 }
    );
  }
}