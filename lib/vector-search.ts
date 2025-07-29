import { prisma } from './prisma';
import { generateEmbedding, deserializeEmbedding } from './voyage-embeddings';
import { getCurrentUserId } from './auth';

export interface SearchResult {
  chunkId: string;
  content: string;
  similarity: number;
  documentId: string;
  documentName: string;
  chunkIndex: number;
}

export interface SearchOptions {
  limit: number;
  minSimilarity: number;
  studyId?: string;
  documentIds?: string[];
}

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  limit: 5,
  minSimilarity: 0.1,
};

export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (magnitude === 0) {
    return 0; // Handle zero vectors
  }

  return dotProduct / magnitude;
}

export async function findRelevantChunks(
  query: string,
  options: Partial<SearchOptions> = {}
): Promise<SearchResult[]> {
  const config = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const userId = getCurrentUserId();

  try {
    // Generate embedding for the query
    const queryEmbeddingResult = await generateEmbedding(query);
    const queryEmbedding = queryEmbeddingResult.embedding;

    // Build database query filters
    const whereClause: {
      document: {
        study: {
          userId: string;
        };
        studyId?: string;
      };
      embedding: {
        not: null;
      };
      documentId?: {
        in: string[];
      };
    } = {
      document: {
        study: {
          userId: userId, // Ensure user scoping
        },
      },
      embedding: {
        not: null, // Only get chunks with embeddings
      },
    };

    // Add study filter if provided
    if (config.studyId) {
      whereClause.document.studyId = config.studyId;
    }

    // Add document filter if provided
    if (config.documentIds && config.documentIds.length > 0) {
      whereClause.documentId = {
        in: config.documentIds,
      };
    }

    // Fetch all chunks with embeddings
    const chunks = await prisma.documentChunk.findMany({
      where: whereClause,
      include: {
        document: {
          select: {
            id: true,
            fileName: true,
          },
        },
      },
    });

    if (chunks.length === 0) {
      return [];
    }

    // Calculate similarities
    const results: SearchResult[] = [];

    for (const chunk of chunks) {
      if (!chunk.embedding) continue;

      try {
        const chunkEmbedding = deserializeEmbedding(chunk.embedding);
        const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

        if (similarity >= config.minSimilarity) {
          results.push({
            chunkId: chunk.id,
            content: chunk.content,
            similarity,
            documentId: chunk.document.id,
            documentName: chunk.document.fileName,
            chunkIndex: chunk.chunkIndex,
          });
        }
      } catch (error) {
        console.warn(`Failed to process chunk ${chunk.id}:`, error);
        // Continue processing other chunks
      }
    }

    // Sort by similarity (highest first) and limit results
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, config.limit);

  } catch (error) {
    console.error('Error in findRelevantChunks:', error);
    throw new Error(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function findSimilarChunks(
  chunkId: string,
  options: Partial<SearchOptions> = {}
): Promise<SearchResult[]> {
  const config = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const userId = getCurrentUserId();

  try {
    // Get the source chunk
    const sourceChunk = await prisma.documentChunk.findFirst({
      where: {
        id: chunkId,
        document: {
          study: {
            userId: userId,
          },
        },
      },
      include: {
        document: true,
      },
    });

    if (!sourceChunk || !sourceChunk.embedding) {
      throw new Error('Source chunk not found or has no embedding');
    }

    const sourceEmbedding = deserializeEmbedding(sourceChunk.embedding);

    // Find similar chunks in the same study
    const studyId = sourceChunk.document.studyId;
    return findRelevantChunksWithEmbedding(
      sourceEmbedding,
      { ...config, studyId },
      chunkId // Exclude the source chunk itself
    );

  } catch (error) {
    console.error('Error in findSimilarChunks:', error);
    throw new Error(`Similar chunk search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function findRelevantChunksWithEmbedding(
  queryEmbedding: number[],
  options: SearchOptions,
  excludeChunkId?: string
): Promise<SearchResult[]> {
  const userId = getCurrentUserId();

  const whereClause: {
    document: {
      study: {
        userId: string;
      };
      studyId?: string;
    };
    embedding: {
      not: null;
    };
    documentId?: {
      in: string[];
    };
    id?: {
      not: string;
    };
  } = {
    document: {
      study: {
        userId: userId,
      },
    },
    embedding: {
      not: null,
    },
  };

  if (options.studyId) {
    whereClause.document.studyId = options.studyId;
  }

  if (options.documentIds && options.documentIds.length > 0) {
    whereClause.documentId = {
      in: options.documentIds,
    };
  }

  if (excludeChunkId) {
    whereClause.id = {
      not: excludeChunkId,
    };
  }

  const chunks = await prisma.documentChunk.findMany({
    where: whereClause,
    include: {
      document: {
        select: {
          id: true,
          fileName: true,
        },
      },
    },
  });

  const results: SearchResult[] = [];

  for (const chunk of chunks) {
    if (!chunk.embedding) continue;

    try {
      const chunkEmbedding = deserializeEmbedding(chunk.embedding);
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

      if (similarity >= options.minSimilarity) {
        results.push({
          chunkId: chunk.id,
          content: chunk.content,
          similarity,
          documentId: chunk.document.id,
          documentName: chunk.document.fileName,
          chunkIndex: chunk.chunkIndex,
        });
      }
    } catch (error) {
      console.warn(`Failed to process chunk ${chunk.id}:`, error);
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, options.limit);
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No relevant content found.';
  }

  return results
    .map((result, index) => {
      const similarityPercent = Math.round(result.similarity * 100);
      return `[${index + 1}] ${result.documentName} (${similarityPercent}% match)\n${result.content.trim()}\n`;
    })
    .join('\n---\n\n');
}

export async function getEmbeddingStats(studyId?: string): Promise<{
  totalChunks: number;
  chunksWithEmbeddings: number;
  documentsWithEmbeddings: number;
  averageChunkLength: number;
}> {
  const userId = getCurrentUserId();

  const whereClause: {
    document: {
      study: {
        userId: string;
      };
      studyId?: string;
    };
  } = {
    document: {
      study: {
        userId: userId,
      },
    },
  };

  if (studyId) {
    whereClause.document.studyId = studyId;
  }

  const allChunks = await prisma.documentChunk.findMany({
    where: whereClause,
    select: {
      id: true,
      content: true,
      embedding: true,
      documentId: true,
    },
  });

  const chunksWithEmbeddings = allChunks.filter(chunk => chunk.embedding !== null);
  const uniqueDocuments = new Set(chunksWithEmbeddings.map(chunk => chunk.documentId));
  
  const totalLength = allChunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
  const averageChunkLength = allChunks.length > 0 ? Math.round(totalLength / allChunks.length) : 0;

  return {
    totalChunks: allChunks.length,
    chunksWithEmbeddings: chunksWithEmbeddings.length,
    documentsWithEmbeddings: uniqueDocuments.size,
    averageChunkLength,
  };
}