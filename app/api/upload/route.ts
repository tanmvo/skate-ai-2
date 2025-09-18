import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, validateStudyOwnership } from "@/lib/auth";
import { storeFile, validateFile } from "@/lib/file-storage";
import { extractTextFromBuffer } from "@/lib/document-processing";
import { chunkText } from "@/lib/document-chunking";
import { generateBatchEmbeddings, serializeEmbedding } from "@/lib/voyage-embeddings";
import { trackDocumentUploadEvent, trackErrorEvent } from "@/lib/analytics/server-analytics";

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
    // Default behavior
    return (process.env.NODE_ENV === "production" && process.env.BLOB_READ_WRITE_TOKEN) 
      ? "vercel-blob" 
      : "filesystem";
  }
}

export async function POST(request: NextRequest) {
  // const startTime = Date.now(); // TODO: Use for performance tracking
  const userId = getCurrentUserId();
  
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const studyId = formData.get("studyId") as string;

    if (!file) {
      await trackErrorEvent('upload_error_occurred', {
        errorType: 'ValidationError',
        errorMessage: 'No file provided',
        endpoint: '/api/upload',
        statusCode: 400,
      }, userId);
      
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!studyId) {
      await trackErrorEvent('upload_error_occurred', {
        errorType: 'ValidationError',
        errorMessage: 'Study ID is required',
        endpoint: '/api/upload',
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

    // Track upload started
    await trackDocumentUploadEvent('document_upload_started', {
      studyId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }, userId);

    // Validate file type and size
    const validation = validateFile(file);
    if (!validation.valid) {
      await trackErrorEvent('upload_error_occurred', {
        errorType: 'FileValidationError',
        errorMessage: validation.error!,
        endpoint: '/api/upload',
        statusCode: 400,
      }, userId);
      
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // PRE-VALIDATE: Test text extraction before storing anything
    console.log(`Pre-validating text extraction for ${file.name}...`);
    const extractionResult = await extractTextFromBuffer(buffer, file.type, file.name);

    if ('error' in extractionResult) {
      // Extraction failed - reject the upload
      console.error(`Upload rejected - text extraction failed for ${file.name}:`, extractionResult.error);

      await trackErrorEvent('upload_error_occurred', {
        errorType: 'TextExtractionError',
        errorMessage: `Upload rejected: ${extractionResult.error}`,
        endpoint: '/api/upload',
        statusCode: 422,
      }, userId);

      return NextResponse.json(
        {
          error: "Document processing failed",
          details: extractionResult.details || extractionResult.error,
          suggestion: "This PDF may contain custom fonts, be scanned, or be image-based. Please try a different file format or use OCR tools first."
        },
        { status: 422 } // Unprocessable Entity
      );
    }

    console.log(`Text extraction validated successfully for ${file.name} (${extractionResult.text.length} characters)`);

    // Store the file (pass request for header-based overrides)
    const storageResult = await storeFile(file.name, buffer, studyId, request);

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        status: "PROCESSING",
        studyId: studyId,
        // Store file storage information
        storagePath: storageResult.pathname,
        storageUrl: storageResult.url,
        storageType: determineStorageType(request),
      },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    });

    // Process the document asynchronously (we know extraction works now)
    processDocumentAsync(document.id, buffer, file.type, file.name, studyId, userId, extractionResult.text);

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        status: document.status,
        uploadedAt: document.uploadedAt,
        url: storageResult.url,
      },
    });

  } catch (error) {
    console.error("Upload error:", error);
    
    // Track upload error
    await trackErrorEvent('upload_error_occurred', {
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown upload error',
      endpoint: '/api/upload',
      statusCode: 500,
      stackTrace: error instanceof Error ? error.stack : undefined,
    }, userId);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("File size")) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 10MB." },
          { status: 413 }
        );
      }
      
      if (error.message.includes("File type")) {
        return NextResponse.json(
          { error: "Unsupported file type. Please upload PDF, DOCX, or TXT files." },
          { status: 415 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

async function processDocumentAsync(
  documentId: string,
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  studyId: string,
  userId: string,
  preExtractedText?: string
): Promise<void> {
  const processingStartTime = Date.now();
  
  try {
    console.log(`Starting document processing for ${documentId}: ${fileName}`);
    
    // Track processing started
    await trackDocumentUploadEvent('document_processing_started', {
      studyId,
      fileName,
      fileType: mimeType,
      fileSize: buffer.length,
    }, userId);

    // Use pre-extracted text (validation already passed)
    const extractedText = preExtractedText!;
    console.log(`Extracted ${extractedText.length} characters from ${fileName}`);

    // Step 2: Update document with extracted text
    await prisma.document.update({
      where: { id: documentId },
      data: { extractedText },
    });

    // Step 3: Chunk the text
    const chunks = chunkText(extractedText);
    console.log(`Created ${chunks.length} chunks for ${fileName}`);

    if (chunks.length === 0) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "READY" },
      });
      return;
    }

    // Step 4: Generate embeddings for all chunks
    const chunkTexts = chunks.map(chunk => chunk.content);
    
    console.log(`Generating embeddings for ${chunks.length} chunks...`);
    const embeddingResult = await generateBatchEmbeddings(chunkTexts);
    console.log(`Generated ${embeddingResult.embeddings.length} embeddings, used ${embeddingResult.usage.totalTokens} tokens`);

    // Step 5: Store chunks with embeddings in database
    const chunkData = chunks.map((chunk, index) => ({
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      documentId: documentId,
      embedding: serializeEmbedding(embeddingResult.embeddings[index]),
    }));

    await prisma.documentChunk.createMany({
      data: chunkData,
    });

    // Step 6: Mark document as ready
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "READY" },
    });

    // Track successful processing
    await trackDocumentUploadEvent('document_processing_completed', {
      studyId,
      fileName,
      fileType: mimeType,
      fileSize: buffer.length,
      processingTimeMs: Date.now() - processingStartTime,
    }, userId);

    console.log(`Successfully processed document ${documentId}: ${fileName}`);

  } catch (error) {
    console.error(`Document processing failed for ${documentId}:`, error);
    
    // Track processing failure
    await trackDocumentUploadEvent('document_processing_failed', {
      studyId,
      fileName,
      fileType: mimeType,
      fileSize: buffer.length,
      processingTimeMs: Date.now() - processingStartTime,
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown processing error',
    }, userId);
    
    // Mark document as failed
    await prisma.document.update({
      where: { id: documentId },
      data: { 
        status: "FAILED",
        extractedText: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    }).catch(dbError => {
      console.error(`Failed to update document status:`, dbError);
    });
  }
}