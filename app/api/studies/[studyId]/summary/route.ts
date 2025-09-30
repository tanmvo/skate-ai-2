import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, validateStudyOwnership } from "@/lib/auth";
import { trackStudyEvent, trackErrorEvent } from "@/lib/analytics/server-analytics";
import { generateStudySummary } from "@/lib/summary-generation";

/**
 * GET /api/studies/[studyId]/summary
 * Fetch existing summary from Study model
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ studyId: string }> }
) {
  const params = await context.params;
  try {
    const userId = await requireAuth();

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
      select: {
        id: true,
        summary: true,
        updatedAt: true,
      },
    });

    if (!study) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    if (!study.summary) {
      return NextResponse.json(
        { error: "No summary found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: study.id,
      content: study.summary,
      timestamp: study.updatedAt.toISOString(),
    });

  } catch (error) {
    console.error("Error fetching summary:", error);

    await trackErrorEvent('api_error_occurred', {
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error fetching summary',
      endpoint: `/api/studies/${params.studyId}/summary`,
      statusCode: 500,
      stackTrace: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/studies/[studyId]/summary
 * Generate new summary using semantic search + Claude
 * Performs full regeneration (overwrites existing summary if present)
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ studyId: string }> }
) {
  const params = await context.params;

  try {
    const userId = await requireAuth();

    // Validate user owns this study
    const isOwner = await validateStudyOwnership(params.studyId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    // Check if study has documents
    const study = await prisma.study.findFirst({
      where: {
        id: params.studyId,
        userId,
      },
      include: {
        _count: {
          select: {
            documents: true,
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

    if (study._count.documents === 0) {
      return NextResponse.json(
        { error: "Study has no documents" },
        { status: 400 }
      );
    }

    // Generate summary using extracted logic
    const result = await generateStudySummary(params.studyId);

    if (!result) {
      return NextResponse.json(
        { error: "Study has no processed documents" },
        { status: 400 }
      );
    }

    // Save summary to Study model
    const updatedStudy = await prisma.study.update({
      where: {
        id: params.studyId,
      },
      data: {
        summary: result.summary,
      },
      select: {
        id: true,
        summary: true,
        updatedAt: true,
      },
    });

    // Track summary generation
    await trackStudyEvent('summary_generated', {
      studyId: study.id,
      studyName: study.name,
      documentCount: result.metadata.documentCount,
      chunksAnalyzed: result.metadata.totalChunks,
      generationTimeMs: result.metadata.generationTimeMs,
      summaryLength: result.summary.length,
    }, userId);

    return NextResponse.json({
      id: updatedStudy.id,
      content: updatedStudy.summary,
      timestamp: updatedStudy.updatedAt.toISOString(),
    });

  } catch (error) {
    console.error("Error generating summary:", error);

    await trackErrorEvent('api_error_occurred', {
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error generating summary',
      endpoint: `/api/studies/${params.studyId}/summary`,
      statusCode: 500,
      stackTrace: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/studies/[studyId]/summary
 * Clear summary field (set to null)
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ studyId: string }> }
) {
  const params = await context.params;
  try {
    const userId = await requireAuth();

    // Validate user owns this study
    const isOwner = await validateStudyOwnership(params.studyId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    const result = await prisma.study.updateMany({
      where: {
        id: params.studyId,
        userId,
      },
      data: {
        summary: null,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    // Track summary deletion
    await trackStudyEvent('summary_deleted', {
      studyId: params.studyId,
    }, userId);

    return NextResponse.json({
      message: "Summary deleted successfully",
      deletedCount: result.count,
    });

  } catch (error) {
    console.error("Error deleting summary:", error);

    await trackErrorEvent('api_error_occurred', {
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error deleting summary',
      endpoint: `/api/studies/${params.studyId}/summary`,
      statusCode: 500,
      stackTrace: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Failed to delete summary" },
      { status: 500 }
    );
  }
}

