import { prisma } from "./prisma";
import { getCurrentUserId } from "./auth";
import { DocumentReference } from "./types/metadata";

export async function getStudies() {
  try {
    const userId = getCurrentUserId();
    const studies = await prisma.study.findMany({
      where: {
        userId,
      },
      include: {
        _count: {
          select: {
            documents: true,
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
    return studies;
  } catch (error) {
    console.error("Error fetching studies:", error);
    throw error;
  }
}

export async function getStudy(studyId: string) {
  try {
    const userId = getCurrentUserId();
    const study = await prisma.study.findFirst({
      where: { 
        id: studyId,
        userId,
      },
      include: {
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
        messages: {
          orderBy: { timestamp: "asc" },
        },
        _count: {
          select: {
            documents: true,
            messages: true,
          },
        },
      },
    });
    return study;
  } catch (error) {
    console.error("Error fetching study:", error);
    throw error;
  }
}

export async function createStudy(name: string) {
  try {
    const userId = getCurrentUserId();
    const study = await prisma.study.create({
      data: { 
        name,
        userId,
      },
      include: {
        _count: {
          select: {
            documents: true,
            messages: true,
          },
        },
      },
    });
    return study;
  } catch (error) {
    console.error("Error creating study:", error);
    throw error;
  }
}

export async function deleteStudy(studyId: string) {
  try {
    const userId = getCurrentUserId();
    const result = await prisma.study.deleteMany({
      where: { 
        id: studyId,
        userId,
      },
    });
    
    if (result.count === 0) {
      throw new Error("Study not found or access denied");
    }
  } catch (error) {
    console.error("Error deleting study:", error);
    throw error;
  }
}

// Metadata helper functions for hybrid search

export async function getStudyDocumentReferences(studyId: string): Promise<DocumentReference[]> {
  try {
    const userId = getCurrentUserId();
    
    const documents = await prisma.document.findMany({
      where: {
        studyId,
        study: { userId },
        status: 'READY',
      },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return documents.map(doc => ({
      id: doc.id,
      name: doc.fileName,
      chunkCount: doc._count.chunks,
    }));

  } catch (error) {
    console.error("Error fetching document references:", error);
    throw error;
  }
}

export async function getDocumentNames(documentIds: string[]): Promise<Record<string, string>> {
  try {
    const userId = getCurrentUserId();
    
    if (documentIds.length === 0) {
      return {};
    }

    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        study: { userId },
      },
      select: {
        id: true,
        fileName: true,
      },
    });

    return documents.reduce((acc, doc) => {
      acc[doc.id] = doc.fileName;
      return acc;
    }, {} as Record<string, string>);

  } catch (error) {
    console.error("Error fetching document names:", error);
    throw error;
  }
}

export async function getStudyStats(studyId: string): Promise<{
  totalDocuments: number;
  readyDocuments: number;
  totalChunks: number;
  chunksWithEmbeddings: number;
}> {
  try {
    const userId = getCurrentUserId();
    
    const study = await prisma.study.findFirst({
      where: {
        id: studyId,
        userId,
      },
      include: {
        documents: {
          include: {
            chunks: {
              select: {
                id: true,
                embedding: true,
              },
            },
          },
        },
      },
    });

    if (!study) {
      throw new Error("Study not found");
    }

    const totalDocuments = study.documents.length;
    const readyDocuments = study.documents.filter(doc => doc.status === 'READY').length;
    const totalChunks = study.documents.reduce((sum, doc) => sum + doc.chunks.length, 0);
    const chunksWithEmbeddings = study.documents.reduce((sum, doc) => {
      return sum + doc.chunks.filter(chunk => chunk.embedding !== null).length;
    }, 0);

    return {
      totalDocuments,
      readyDocuments,
      totalChunks,
      chunksWithEmbeddings,
    };

  } catch (error) {
    console.error("Error fetching study stats:", error);
    throw error;
  }
}

export async function validateDocumentAccess(documentIds: string[], studyId: string): Promise<boolean> {
  try {
    const userId = getCurrentUserId();
    
    const count = await prisma.document.count({
      where: {
        id: { in: documentIds },
        studyId,
        study: { userId },
      },
    });

    return count === documentIds.length;

  } catch (error) {
    console.error("Error validating document access:", error);
    return false;
  }
}

/**
 * Document lookup result interface
 */
export interface DocumentLookupResult {
  found: Array<{name: string, id: string, status: string}>;
  notFound: string[];
  alternatives: Array<{query: string, suggestions: string[]}>;
  availableDocuments: string[];
}

/**
 * Find document IDs by their filenames with smart error handling
 */
export async function findDocumentIdsByNames(
  documentNames: string[], 
  studyId: string
): Promise<DocumentLookupResult> {
  try {
    const userId = getCurrentUserId();
    
    if (documentNames.length === 0) {
      throw new Error('No document names provided');
    }

    // Get all documents for this study
    const documents = await prisma.document.findMany({
      where: {
        studyId,
        study: { userId },
      },
      select: {
        id: true,
        fileName: true,
        status: true,
      },
      orderBy: { uploadedAt: 'desc' },
    });

    const found: Array<{name: string, id: string, status: string}> = [];
    const notFound: string[] = [];
    const alternatives: Array<{query: string, suggestions: string[]}> = [];
    const availableDocuments = documents.map(doc => doc.fileName);

    for (const queryName of documentNames) {
      // First check for exact match (case-insensitive)
      const exactMatch = documents.find(doc => 
        doc.fileName.toLowerCase() === queryName.toLowerCase()
      );
      
      if (exactMatch) {
        found.push({
          name: exactMatch.fileName,
          id: exactMatch.id,
          status: exactMatch.status
        });
        continue;
      }
      
      // If no exact match, look for similar names
      const suggestions = documents
        .filter(doc => 
          doc.fileName.toLowerCase().includes(queryName.toLowerCase()) ||
          queryName.toLowerCase().includes(doc.fileName.toLowerCase()) ||
          levenshteinDistance(doc.fileName.toLowerCase(), queryName.toLowerCase()) <= 2
        )
        .map(doc => doc.fileName)
        .slice(0, 3); // Limit to 3 suggestions
      
      notFound.push(queryName);
      
      if (suggestions.length > 0) {
        alternatives.push({
          query: queryName,
          suggestions
        });
      }
    }

    return {
      found,
      notFound,
      alternatives,
      availableDocuments
    };

  } catch (error) {
    console.error("Error finding document IDs by names:", error);
    throw error;
  }
}

/**
 * Simple Levenshtein distance calculation for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Get study document context for error messages
 */
export async function getStudyDocumentContext(studyId: string): Promise<{
  totalDocuments: number;
  readyDocuments: number;
  processingDocuments: number;
  availableNames: string[];
}> {
  try {
    const userId = getCurrentUserId();
    
    const documents = await prisma.document.findMany({
      where: {
        studyId,
        study: { userId },
      },
      select: {
        fileName: true,
        status: true,
      },
    });

    const totalDocuments = documents.length;
    const readyDocuments = documents.filter(doc => doc.status === 'READY').length;
    const processingDocuments = documents.filter(doc => doc.status === 'PROCESSING').length;
    const availableNames = documents
      .filter(doc => doc.status === 'READY')
      .map(doc => doc.fileName);

    return {
      totalDocuments,
      readyDocuments,
      processingDocuments,
      availableNames
    };

  } catch (error) {
    console.error("Error getting study document context:", error);
    throw error;
  }
}