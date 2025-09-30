import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, validateDocumentOwnership } from "@/lib/auth";
import { deleteDocumentFiles } from "@/lib/file-storage/cleanup";
import { invalidateStudyMetadataOnDocumentChange } from "@/lib/metadata-collector";
import { generateStudySummary } from "@/lib/summary-generation";
import { trackStudyEvent, trackErrorEvent } from "@/lib/analytics/server-analytics";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  const params = await context.params;
  try {
    const userId = await requireAuth();
    const documentId = params.documentId;

    // Validate ownership
    const isOwner = await validateDocumentOwnership(documentId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const document = await prisma.document.findFirst({
      where: { 
        id: documentId,
        study: {
          userId,
        },
      },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  const params = await context.params;
  try {
    await requireAuth(); // Validate user authentication
    const documentId = params.documentId;
    const { fileName, description } = await request.json();

    // Validate ownership
    const isOwner = await validateDocumentOwnership(documentId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    
    if (fileName) {
      // Validate filename
      if (!fileName.trim() || fileName.length > 255) {
        return NextResponse.json(
          { error: "Invalid filename" }, 
          { status: 400 }
        );
      }
    }

    // Update document
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        ...(fileName && { fileName: fileName.trim() }),
        ...(description && { description }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Document update error:", error);
    return NextResponse.json(
      { error: "Failed to update document" }, 
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  const params = await context.params;
  try {
    const userId = await requireAuth();
    const documentId = params.documentId;

    // Validate ownership and get document info for cleanup
    const document = await prisma.document.findFirst({
      where: { 
        id: documentId,
        study: {
          userId,
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete chunks first (should be handled by cascade, but being explicit)
    await prisma.documentChunk.deleteMany({
      where: { documentId },
    });

    // Delete document record
    await prisma.document.delete({
      where: { id: documentId },
    });

    // Clean up physical file (non-blocking)
    if (document.storagePath) {
      const cleanup = await deleteDocumentFiles(documentId, document.storagePath);
      if (!cleanup.success) {
        console.error(`File cleanup failed for document ${documentId}:`, cleanup.error);
        // Continue - database cleanup succeeded
      }
    }

    // Invalidate study metadata cache so deleted document disappears from context immediately
    try {
      await invalidateStudyMetadataOnDocumentChange(document.studyId);
    } catch (cacheError) {
      console.error(`Cache invalidation failed for study ${document.studyId} after deleting document ${documentId}:`, cacheError);
      return NextResponse.json(
        { error: `Document deleted but cache synchronization failed: ${cacheError instanceof Error ? cacheError.message : 'Unknown cache error'}` },
        { status: 500 }
      );
    }

    // Check remaining document count and handle summary
    try {
      const remainingDocCount = await prisma.document.count({
        where: {
          studyId: document.studyId,
          status: 'READY',
        },
      });

      if (remainingDocCount === 0) {
        // Delete summary when no documents remain
        console.log(`Deleting summary for study ${document.studyId} (no documents remaining)`);
        await prisma.study.update({
          where: { id: document.studyId },
          data: { summary: null },
        });

        // Track deletion
        await trackStudyEvent('summary_deleted', {
          studyId: document.studyId,
          reason: 'document_deleted',
          deletedDocumentId: documentId,
        }, userId);
      } else {
        // Regenerate summary with remaining documents
        console.log(`Triggering summary regeneration for study ${document.studyId} after document deletion (${remainingDocCount} documents remaining)`);
        const result = await generateStudySummary(document.studyId);

        if (result) {
          await prisma.study.update({
            where: { id: document.studyId },
            data: { summary: result.summary },
          });

          console.log(`Summary regenerated for study ${document.studyId} (${result.summary.length} chars, ${result.metadata.generationTimeMs}ms)`);

          // Track analytics
          await trackStudyEvent('summary_generated', {
            studyId: document.studyId,
            documentCount: result.metadata.documentCount,
            chunksAnalyzed: result.metadata.totalChunks,
            generationTimeMs: result.metadata.generationTimeMs,
            summaryLength: result.summary.length,
            reason: 'document_deleted',
            deletedDocumentId: documentId,
          }, userId);
        }
      }
    } catch (error) {
      // Silent failure - don't block document deletion
      console.error(`Summary handling failed for study ${document.studyId} after deleting document ${documentId}:`, error);
      await trackErrorEvent('summary_generation_failed', {
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        endpoint: 'DELETE /api/documents/[documentId]',
        statusCode: 500,
        deletedDocumentId: documentId,
      }, userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Document deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" }, 
      { status: 500 }
    );
  }
}