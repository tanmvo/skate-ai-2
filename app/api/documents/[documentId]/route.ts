import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, validateDocumentOwnership } from "@/lib/auth";
import { deleteDocumentFiles } from "@/lib/file-storage/cleanup";

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Document deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" }, 
      { status: 500 }
    );
  }
}