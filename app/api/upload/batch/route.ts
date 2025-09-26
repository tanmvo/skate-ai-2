import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, validateStudyOwnership } from "@/lib/auth";
import { storeFile, validateFile } from "@/lib/file-storage";
import { extractTextFromBuffer } from "@/lib/document-processing";
import { chunkText } from "@/lib/document-chunking";
import { generateBatchEmbeddings, serializeEmbedding } from "@/lib/voyage-embeddings";
import { trackBatchUploadEvent, trackErrorEvent } from "@/lib/analytics/server-analytics";
import { invalidateStudyMetadataOnDocumentChange } from "@/lib/metadata-collector";

// In-memory concurrency tracking
const userConcurrency = new Map<string, number>();
const MAX_CONCURRENT_FILES_PER_USER = 3;
const MAX_FILES_PER_BATCH = 5;
const MAX_BATCH_SIZE_MB = 50;

interface BatchUploadResponse {
  batchId: string;
  status: 'started' | 'validating' | 'processing' | 'completed' | 'failed';
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
}

/**
 * Determine the actual storage type used based on headers and environment
 */
function determineStorageType(request: NextRequest): string {
  const storageType = request.headers.get('X-Storage-Type');
  const forceLocal = request.headers.get('X-Storage-Local') === 'true';

  if (storageType) {
    return storageType;
  } else if (forceLocal) {
    return 'filesystem';
  } else {
    return (process.env.NODE_ENV === "production" && process.env.BLOB_READ_WRITE_TOKEN)
      ? "vercel-blob"
      : "filesystem";
  }
}

export async function POST(request: NextRequest) {
  const userId = await requireAuth();

  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const studyId = formData.get("studyId") as string;

    // Collect all files from formData
    const files: File[] = [];
    const fileEntries = formData.getAll("files");

    for (const entry of fileEntries) {
      if (entry instanceof File) {
        files.push(entry);
      }
    }

    if (files.length === 0) {
      await trackErrorEvent('batch_upload_error_occurred', {
        errorType: 'ValidationError',
        errorMessage: 'No files provided',
        endpoint: '/api/upload/batch',
        statusCode: 400,
      }, userId);

      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    if (!studyId) {
      await trackErrorEvent('batch_upload_error_occurred', {
        errorType: 'ValidationError',
        errorMessage: 'Study ID is required',
        endpoint: '/api/upload/batch',
        statusCode: 400,
      }, userId);

      return NextResponse.json(
        { error: "Study ID is required" },
        { status: 400 }
      );
    }

    // Validate user owns the study
    const isOwner = await validateStudyOwnership(studyId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    // Batch validation
    const validationResult = await validateBatch(userId, studyId, files);
    if (!validationResult.valid) {
      await trackErrorEvent('batch_upload_error_occurred', {
        errorType: 'BatchValidationError',
        errorMessage: validationResult.error!,
        endpoint: '/api/upload/batch',
        statusCode: 400,
      }, userId);

      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    // Check concurrency limits
    const currentConcurrency = userConcurrency.get(userId) || 0;
    if (currentConcurrency + files.length > MAX_CONCURRENT_FILES_PER_USER) {
      await trackErrorEvent('batch_upload_error_occurred', {
        errorType: 'ConcurrencyLimitError',
        errorMessage: `Concurrent file limit exceeded: ${currentConcurrency + files.length}/${MAX_CONCURRENT_FILES_PER_USER}`,
        endpoint: '/api/upload/batch',
        statusCode: 429,
      }, userId);

      return NextResponse.json(
        { error: `Too many concurrent uploads. Maximum ${MAX_CONCURRENT_FILES_PER_USER} files can be processed at once.` },
        { status: 429 }
      );
    }

    // Create batch record in database
    const batch = await prisma.uploadBatch.create({
      data: {
        userId,
        studyId,
        status: "VALIDATING",
        totalFiles: files.length,
        metadata: {
          fileNames: files.map(f => f.name),
          totalSize: files.reduce((sum, f) => sum + f.size, 0),
          concurrency: Math.min(files.length, MAX_CONCURRENT_FILES_PER_USER),
        },
      },
    });

    // Track batch upload started
    await trackBatchUploadEvent('batch_upload_started', {
      batchId: batch.id,
      studyId,
      fileCount: files.length,
      totalSizeMb: Math.round(files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024) * 100) / 100,
      concurrentFiles: Math.min(files.length, MAX_CONCURRENT_FILES_PER_USER),
    }, userId);

    // Initialize file status tracking
    const fileStatuses: BatchUploadResponse['files'] = {};
    files.forEach(file => {
      fileStatuses[file.name] = {
        status: 'queued',
        progress: 0,
      };
    });

    // Update concurrency counter
    userConcurrency.set(userId, currentConcurrency + files.length);

    // Process batch asynchronously
    processBatchAsync(batch.id, files, studyId, userId, request).finally(() => {
      // Decrement concurrency counter when done
      const current = userConcurrency.get(userId) || 0;
      const newCount = Math.max(0, current - files.length);
      if (newCount === 0) {
        userConcurrency.delete(userId);
      } else {
        userConcurrency.set(userId, newCount);
      }
    });

    // Return initial response
    return NextResponse.json({
      batchId: batch.id,
      status: 'started',
      files: fileStatuses,
      summary: {
        total: files.length,
        completed: 0,
        failed: 0,
        processing: files.length,
      },
    } as BatchUploadResponse);

  } catch (error) {
    console.error("Batch upload error:", error);

    await trackErrorEvent('batch_upload_error_occurred', {
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown batch upload error',
      endpoint: '/api/upload/batch',
      statusCode: 500,
      stackTrace: error instanceof Error ? error.stack : undefined,
    }, userId);

    return NextResponse.json(
      { error: "Failed to start batch upload. Please try again." },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  const allowOrigin = process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_APP_URL || "https://yourdomain.com"
    : "*";

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    },
  });
}

/**
 * Validate batch upload request
 */
async function validateBatch(userId: string, studyId: string, files: File[]) {
  // Check batch size limits
  if (files.length > MAX_FILES_PER_BATCH) {
    return { valid: false, error: `Maximum ${MAX_FILES_PER_BATCH} files per batch` };
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalSizeMB = totalSize / (1024 * 1024);
  if (totalSizeMB > MAX_BATCH_SIZE_MB) {
    return { valid: false, error: `Batch too large (max ${MAX_BATCH_SIZE_MB}MB, current: ${Math.round(totalSizeMB * 100) / 100}MB)` };
  }

  // Validate each file
  for (const file of files) {
    const validation = validateFile(file);
    if (!validation.valid) {
      return { valid: false, error: `File "${file.name}": ${validation.error}` };
    }
  }

  return { valid: true };
}

/**
 * Process batch of files asynchronously
 */
async function processBatchAsync(
  batchId: string,
  files: File[],
  studyId: string,
  userId: string,
  request: NextRequest
): Promise<void> {
  const startTime = Date.now();

  try {
    console.log(`Starting batch processing for ${batchId}: ${files.length} files`);

    // Update batch status to processing
    await prisma.uploadBatch.update({
      where: { id: batchId },
      data: { status: "PROCESSING" },
    });

    await trackBatchUploadEvent('batch_processing_started', {
      batchId,
      studyId,
      fileCount: files.length,
      totalSizeMb: Math.round(files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024) * 100) / 100,
    }, userId);

    let completedFiles = 0;
    let failedFiles = 0;
    const fileResults: { fileName: string; documentId?: string; error?: string }[] = [];

    // Process files with controlled concurrency (max 3 at once)
    const processingPromises: (Promise<void> | undefined)[] = new Array(MAX_CONCURRENT_FILES_PER_USER).fill(undefined);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Wait for an available slot
      const semaphoreIndex = i % MAX_CONCURRENT_FILES_PER_USER;
      if (processingPromises[semaphoreIndex]) {
        await processingPromises[semaphoreIndex];
      }

      // Process this file
      processingPromises[semaphoreIndex] = processFileInBatch(
        file, batchId, studyId, userId, request
      ).then((result) => {
        if (result.error) {
          failedFiles++;
          fileResults.push({ fileName: file.name, error: result.error });
        } else {
          completedFiles++;
          fileResults.push({ fileName: file.name, documentId: result.documentId });
        }
      }).catch((error) => {
        failedFiles++;
        fileResults.push({ fileName: file.name, error: error.message });
        console.error(`File processing failed for ${file.name}:`, error);
      });
    }

    // Wait for all remaining files to complete
    await Promise.all(processingPromises.filter((p): p is Promise<void> => p !== undefined));

    // Update batch completion status
    const finalStatus = failedFiles === 0 ? "COMPLETED" : (completedFiles > 0 ? "COMPLETED" : "FAILED");

    await prisma.uploadBatch.update({
      where: { id: batchId },
      data: {
        status: finalStatus as "VALIDATING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED",
        completedFiles,
        failedFiles,
        metadata: {
          ...(await prisma.uploadBatch.findUnique({ where: { id: batchId }, select: { metadata: true } }))?.metadata as Record<string, unknown> || {},
          processingTimeMs: Date.now() - startTime,
          fileResults,
        },
      },
    });

    // Track batch completion
    await trackBatchUploadEvent('batch_upload_completed', {
      batchId,
      studyId,
      fileCount: files.length,
      successCount: completedFiles,
      failureCount: failedFiles,
      processingTimeMs: Date.now() - startTime,
    }, userId);

    console.log(`Batch processing completed for ${batchId}: ${completedFiles}/${files.length} files successful`);

    // Final cache invalidation to ensure all batch documents are visible in context
    try {
      await invalidateStudyMetadataOnDocumentChange(studyId);
    } catch (cacheError) {
      console.error(`Final batch cache invalidation failed for study ${studyId}, batch ${batchId}:`, cacheError);

      // Mark batch as failed since cache sync failed
      await prisma.uploadBatch.update({
        where: { id: batchId },
        data: {
          status: "FAILED",
          metadata: {
            ...(await prisma.uploadBatch.findUnique({ where: { id: batchId }, select: { metadata: true } }))?.metadata as Record<string, unknown> || {},
            processingTimeMs: Date.now() - startTime,
            fileResults,
            cacheError: cacheError instanceof Error ? cacheError.message : 'Unknown cache error',
          },
        },
      });

      throw new Error(`Batch processing completed but final cache synchronization failed: ${cacheError instanceof Error ? cacheError.message : 'Unknown cache error'}`);
    }

  } catch (error) {
    console.error(`Batch processing failed for ${batchId}:`, error);

    await prisma.uploadBatch.update({
      where: { id: batchId },
      data: {
        status: "FAILED",
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs: Date.now() - startTime,
        },
      },
    }).catch(dbError => {
      console.error(`Failed to update batch status:`, dbError);
    });

    await trackBatchUploadEvent('batch_upload_failed', {
      batchId,
      studyId,
      fileCount: files.length,
      processingTimeMs: Date.now() - startTime,
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }, userId);
  }
}

/**
 * Process a single file within a batch
 */
async function processFileInBatch(
  file: File,
  batchId: string,
  studyId: string,
  userId: string,
  request: NextRequest
): Promise<{ documentId?: string; error?: string }> {
  try {
    console.log(`Processing file in batch ${batchId}: ${file.name}`);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Pre-validate text extraction
    const extractionResult = await extractTextFromBuffer(buffer, file.type, file.name);
    if ('error' in extractionResult) {
      return { error: `Text extraction failed: ${extractionResult.error}` };
    }

    // Store the file
    const storageResult = await storeFile(file.name, buffer, studyId, request);

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        status: "PROCESSING",
        studyId: studyId,
        batchId: batchId,
        storagePath: storageResult.pathname,
        storageUrl: storageResult.url,
        storageType: determineStorageType(request),
        extractedText: extractionResult.text,
      },
    });

    // Process document (chunking and embeddings)
    await processDocumentContentAsync(document.id, extractionResult.text, userId, studyId, file.name);

    return { documentId: document.id };

  } catch (error) {
    console.error(`File processing error in batch ${batchId} for ${file.name}:`, error);
    return { error: error instanceof Error ? error.message : 'Unknown processing error' };
  }
}

/**
 * Process document content (chunking and embeddings)
 */
async function processDocumentContentAsync(
  documentId: string,
  extractedText: string,
  userId: string,
  studyId: string,
  fileName: string
): Promise<void> {
  try {
    // Chunk the text
    const chunks = chunkText(extractedText);
    console.log(`Created ${chunks.length} chunks for ${fileName}`);

    if (chunks.length === 0) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "READY" },
      });
      return;
    }

    // Generate embeddings for all chunks
    const chunkTexts = chunks.map(chunk => chunk.content);
    const embeddingResult = await generateBatchEmbeddings(chunkTexts);

    // Store chunks with embeddings in database
    const chunkData = chunks.map((chunk, index) => ({
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      documentId: documentId,
      embedding: serializeEmbedding(embeddingResult.embeddings[index]),
    }));

    await prisma.documentChunk.createMany({
      data: chunkData,
    });

    // Mark document as ready
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "READY" },
    });

    console.log(`Successfully processed document content for ${documentId}: ${fileName}`);

    // Invalidate study metadata cache so new document appears in context immediately
    try {
      await invalidateStudyMetadataOnDocumentChange(studyId);
    } catch (cacheError) {
      console.error(`Cache invalidation failed for study ${studyId} during document ${documentId} processing:`, cacheError);

      // Mark document as failed since cache sync failed
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "FAILED",
          extractedText: `Processing completed but cache synchronization failed: ${cacheError instanceof Error ? cacheError.message : 'Unknown cache error'}`
        },
      });

      throw new Error(`Document processing completed but cache synchronization failed: ${cacheError instanceof Error ? cacheError.message : 'Unknown cache error'}`);
    }

  } catch (error) {
    console.error(`Document content processing failed for ${documentId}:`, error);

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        extractedText: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    }).catch(dbError => {
      console.error(`Failed to update document status:`, dbError);
    });

    throw error;
  }
}