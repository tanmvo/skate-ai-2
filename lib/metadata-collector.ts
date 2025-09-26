import { prisma } from './prisma';
import { getCurrentUserId } from './auth';
import { StudyMetadata, DocumentMetadata, MetadataContext } from './types/metadata';
import {
  getCachedData,
  studyMetadataKey,
  invalidateStudyCache
} from './metadata-cache';
import { trackCacheEvent } from './analytics/server-analytics';

/**
 * Collects comprehensive metadata for studies and documents
 */

export async function getStudyMetadata(studyId: string): Promise<StudyMetadata | null> {
  return await getCachedData(
    studyMetadataKey(studyId),
    () => fetchStudyMetadata(studyId),
    1800000 // 30 minutes TTL
  );
}

async function fetchStudyMetadata(studyId: string): Promise<StudyMetadata | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    
    const study = await prisma.study.findFirst({
      where: {
        id: studyId,
        userId,
      },
      include: {
        documents: {
          include: {
            _count: {
              select: {
                chunks: true,
              },
            },
            chunks: {
              select: {
                id: true,
                embedding: true,
              },
            },
          },
          orderBy: { uploadedAt: 'desc' },
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
      return null;
    }

    // Process document metadata
    const documents: DocumentMetadata[] = study.documents.map((doc) => {
      const chunkCount = doc._count.chunks;
      const hasEmbeddings = doc.chunks.some(chunk => chunk.embedding !== null);
      
      return {
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        status: doc.status as 'PROCESSING' | 'READY' | 'FAILED',
        uploadedAt: doc.uploadedAt,
        chunkCount,
        hasEmbeddings,
      };
    });

    // Calculate totals
    const totalChunks = documents.reduce((sum, doc) => sum + doc.chunkCount, 0);
    const chunksWithEmbeddings = study.documents.reduce((sum, doc) => {
      return sum + doc.chunks.filter(chunk => chunk.embedding !== null).length;
    }, 0);

    return {
      id: study.id,
      name: study.name,
      createdAt: study.createdAt,
      updatedAt: study.updatedAt,
      documentCount: study._count.documents,
      messageCount: study._count.messages,
      documents,
      totalChunks,
      chunksWithEmbeddings,
    };

  } catch (error) {
    console.error('Error fetching study metadata:', error);
    throw new Error(`Failed to fetch study metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getDocumentMetadata(documentIds: string[]): Promise<DocumentMetadata[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    
    if (documentIds.length === 0) {
      return [];
    }

    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        study: { userId },
      },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
        chunks: {
          select: {
            id: true,
            embedding: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return documents.map((doc) => {
      const chunkCount = doc._count.chunks;
      const hasEmbeddings = doc.chunks.some(chunk => chunk.embedding !== null);
      
      return {
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        status: doc.status as 'PROCESSING' | 'READY' | 'FAILED',
        uploadedAt: doc.uploadedAt,
        chunkCount,
        hasEmbeddings,
      };
    });

  } catch (error) {
    console.error('Error fetching document metadata:', error);
    throw new Error(`Failed to fetch document metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getMetadataContext(studyId: string): Promise<MetadataContext | null> {
  try {
    console.log('📋 Getting metadata context for study:', studyId);
    const studyMetadata = await getStudyMetadata(studyId);

    if (!studyMetadata) {
      console.log('❌ No study metadata found for:', studyId);
      return null;
    }

    console.log('📄 All documents in study metadata:', studyMetadata.documents.map(d => ({
      id: d.id,
      fileName: d.fileName,
      status: d.status,
      hasEmbeddings: d.hasEmbeddings,
      chunkCount: d.chunkCount
    })));

    const availableDocuments = studyMetadata.documents.filter(doc =>
      doc.status === 'READY' && doc.hasEmbeddings
    );

    const readyDocuments = studyMetadata.documents.filter(doc =>
      doc.status === 'READY'
    ).length;

    console.log('✅ Available documents after filtering:', availableDocuments.map(d => ({
      id: d.id,
      fileName: d.fileName,
      chunkCount: d.chunkCount
    })));

    return {
      study: studyMetadata,
      availableDocuments,
      totalDocuments: studyMetadata.documentCount,
      readyDocuments,
      searchableChunks: studyMetadata.chunksWithEmbeddings,
    };

  } catch (error) {
    console.error('Error building metadata context:', error);
    throw new Error(`Failed to build metadata context: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getDocumentsByStudy(studyId: string): Promise<DocumentMetadata[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    
    const documents = await prisma.document.findMany({
      where: {
        studyId,
        study: { userId },
      },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
        chunks: {
          select: {
            id: true,
            embedding: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return documents.map((doc) => {
      const chunkCount = doc._count.chunks;
      const hasEmbeddings = doc.chunks.some(chunk => chunk.embedding !== null);
      
      return {
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        status: doc.status as 'PROCESSING' | 'READY' | 'FAILED',
        uploadedAt: doc.uploadedAt,
        chunkCount,
        hasEmbeddings,
      };
    });

  } catch (error) {
    console.error('Error fetching documents by study:', error);
    throw new Error(`Failed to fetch documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cache invalidation helpers for document changes
 */
export function invalidateStudyMetadata(studyId: string): void {
  try {
    const removed = invalidateStudyCache(studyId);
    console.log(`Invalidated ${removed} cache entries for study ${studyId}`);
  } catch (error) {
    console.warn('Error invalidating study metadata cache:', error);
  }
}

export async function invalidateStudyMetadataOnDocumentChange(studyId: string): Promise<void> {
  const maxRetries = 3;
  const baseDelay = 100; // milliseconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const removed = invalidateStudyCache(studyId);
      console.log(`Invalidated ${removed} cache entries for study ${studyId}`);

      // Track successful invalidation (fire-and-forget)
      try {
        await trackCacheEvent('cache_invalidation_success', { studyId, attempt, removed });
      } catch (analyticsError) {
        console.warn('Analytics tracking failed for cache invalidation success:', analyticsError);
      }
      return;

    } catch (error) {
      if (attempt === maxRetries) {
        // Track failure and throw (fire-and-forget analytics)
        try {
          await trackCacheEvent('cache_invalidation_failed', {
            studyId,
            attempts: maxRetries,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        } catch (analyticsError) {
          console.warn('Analytics tracking failed for cache invalidation failure:', analyticsError);
        }
        throw new Error(`Cache invalidation failed after ${maxRetries} attempts`);
      }

      // Exponential backoff
      await sleep(baseDelay * Math.pow(2, attempt - 1));
    }
  }
}