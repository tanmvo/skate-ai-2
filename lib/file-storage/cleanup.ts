/**
 * Enhanced File Storage Cleanup Utilities
 * 
 * Provides comprehensive file cleanup operations for both development
 * and production storage systems with detailed error reporting.
 */

import { deleteFile } from "../file-storage";
import { prisma } from "../prisma";

export interface CleanupResult {
  success: boolean;
  error?: string;
}

export interface BatchCleanupResult {
  deletedCount: number;
  errors: string[];
}

/**
 * Delete files associated with a document from storage
 */
export async function deleteDocumentFiles(
  documentId: string, 
  storagePath: string
): Promise<CleanupResult> {
  try {
    // Use the existing deleteFile function which handles both dev and prod
    await deleteFile(storagePath);
    
    console.log(`Successfully deleted file for document ${documentId}: ${storagePath}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`File cleanup failed for document ${documentId}:`, errorMessage);
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

/**
 * Clean up orphaned files that exist in storage but not in database
 * This is useful for maintenance and preventing storage bloat
 */
export async function cleanupOrphanedFiles(): Promise<BatchCleanupResult> {
  const result: BatchCleanupResult = {
    deletedCount: 0,
    errors: []
  };

  try {
    // For development (filesystem storage)
    if (process.env.NODE_ENV === 'development') {
      result.errors.push('Orphaned file cleanup for filesystem storage not implemented yet - use npm run dev:clean-files');
      return result;
    }

    // For production (Vercel Blob storage)
    if (process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN) {
      result.errors.push('Orphaned file cleanup for Vercel Blob storage not implemented yet - requires blob listing API');
      return result;
    }

    result.errors.push('No storage system configured for cleanup');
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Cleanup operation failed: ${errorMessage}`);
    return result;
  }
}

/**
 * Batch delete multiple documents and their files
 * Used by bulk operations to efficiently clean up multiple documents
 */
export async function batchDeleteDocuments(
  documentIds: string[],
  userId: string
): Promise<BatchCleanupResult> {
  const result: BatchCleanupResult = {
    deletedCount: 0,
    errors: []
  };

  if (documentIds.length === 0) {
    return result;
  }

  try {
    // Get all documents with their storage paths, ensuring user ownership
    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        study: {
          userId: userId,
        }
      },
      select: {
        id: true,
        storagePath: true,
        fileName: true,
      }
    });

    // Verify all requested documents were found and owned by user
    const foundIds = documents.map(doc => doc.id);
    const missingIds = documentIds.filter(id => !foundIds.includes(id));
    
    if (missingIds.length > 0) {
      result.errors.push(`Documents not found or not owned: ${missingIds.join(', ')}`);
    }

    // Delete database records first (will cascade to chunks)
    const deleteResult = await prisma.document.deleteMany({
      where: {
        id: { in: foundIds },
        study: {
          userId: userId,
        }
      }
    });

    result.deletedCount = deleteResult.count;

    // Clean up files for successfully deleted documents
    for (const document of documents) {
      if (document.storagePath) {
        try {
          await deleteFile(document.storagePath);
          console.log(`Batch cleanup: Deleted file for ${document.fileName}`);
        } catch (fileError) {
          const errorMsg = `Failed to delete file for ${document.fileName}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Batch deletion failed: ${errorMessage}`);
    console.error('Batch delete documents error:', error);
    return result;
  }
}

/**
 * Verify file exists in storage (useful for debugging)
 */
export async function verifyFileExists(storagePath: string): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === 'development') {
      // For filesystem, check if file exists
      const fs = await import('fs/promises');
      await fs.access(storagePath);
      return true;
    } else {
      // For Vercel Blob, we can't easily check existence without listing
      // This would require implementing blob listing functionality
      return true; // Assume exists for now
    }
  } catch {
    return false;
  }
}