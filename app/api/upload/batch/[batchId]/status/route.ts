import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface BatchStatusResponse {
  batchId: string;
  status: 'validating' | 'processing' | 'completed' | 'failed' | 'cancelled';
  files: {
    [fileName: string]: {
      id?: string;
      status: 'queued' | 'validating' | 'processing' | 'completed' | 'failed';
      progress: number;
      error?: string;
      url?: string;
    };
  };
  summary: {
    total: number;
    completed: number;
    failed: number;
    processing: number;
  };
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ batchId: string }> }
) {
  try {
    const userId = await requireAuth();
    const { batchId } = await context.params;

    // Get batch record with documents
    const batch = await prisma.uploadBatch.findUnique({
      where: { id: batchId },
      include: {
        documents: {
          select: {
            id: true,
            fileName: true,
            status: true,
            storageUrl: true,
            uploadedAt: true,
          },
        },
        study: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      );
    }

    // Validate user owns the batch through study ownership
    if (batch.study.userId !== userId) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      );
    }

    // Build file status map
    const fileStatuses: BatchStatusResponse['files'] = {};
    const metadata = batch.metadata as { fileNames?: string[] } | null;
    const fileNames = metadata?.fileNames || [];

    // Initialize all files with queued status
    fileNames.forEach((fileName: string) => {
      fileStatuses[fileName] = {
        status: 'queued',
        progress: 0,
      };
    });

    // Update status based on documents
    let completedCount = 0;
    let failedCount = 0;
    let processingCount = 0;

    batch.documents.forEach(doc => {
      let status: 'queued' | 'validating' | 'processing' | 'completed' | 'failed';
      let progress: number;

      switch (doc.status) {
        case 'READY':
          status = 'completed';
          progress = 100;
          completedCount++;
          break;
        case 'FAILED':
          status = 'failed';
          progress = 0;
          failedCount++;
          break;
        case 'PROCESSING':
          status = 'processing';
          progress = 50; // Assume halfway through when processing
          processingCount++;
          break;
        default:
          status = 'queued';
          progress = 0;
      }

      fileStatuses[doc.fileName] = {
        id: doc.id,
        status,
        progress,
        url: doc.status === 'READY' ? doc.storageUrl || undefined : undefined,
      };
    });

    // Calculate queued count
    const queuedCount = Math.max(0, batch.totalFiles - completedCount - failedCount - processingCount);
    if (queuedCount > 0) {
      processingCount += queuedCount;
    }

    const response: BatchStatusResponse = {
      batchId: batch.id,
      status: mapBatchStatus(batch.status),
      files: fileStatuses,
      summary: {
        total: batch.totalFiles,
        completed: completedCount,
        failed: failedCount,
        processing: processingCount,
      },
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
      metadata: batch.metadata as Record<string, unknown> | undefined,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Batch status error:", error);
    return NextResponse.json(
      { error: "Failed to get batch status" },
      { status: 500 }
    );
  }
}

function mapBatchStatus(status: string): BatchStatusResponse['status'] {
  switch (status) {
    case 'VALIDATING':
      return 'validating';
    case 'PROCESSING':
      return 'processing';
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'processing';
  }
}