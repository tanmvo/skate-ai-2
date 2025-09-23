import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, validateStudyOwnership } from "@/lib/auth";
import { trackServerEvent, trackErrorEvent } from "@/lib/analytics/server-analytics";

export async function GET(
  request: NextRequest,
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

    const documents = await prisma.document.findMany({
      where: {
        studyId: params.studyId,
      },
      orderBy: { uploadedAt: "desc" },
    });

    // Track documents access
    await trackServerEvent('documents_list_accessed', {
      study_id: params.studyId,
      document_count: documents.length,
    }, userId);

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);

    await trackErrorEvent('api_error_occurred', {
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error fetching documents',
      endpoint: `/api/studies/${params.studyId}/documents`,
      statusCode: 500,
      stackTrace: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}