/**
 * Citation types for the search-only approach
 */

export interface Citation {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  pageNumber?: number;
  confidence: number;
  timestamp: number;
  chunkId: string;
  similarity: number;
}

export interface DocumentCitation {
  id?: string;
  documentId: string;
  documentName: string;
  relevantText: string;
  pageNumber?: number;
}

/**
 * Message interface with citation support (simplified for search-only approach)
 */
export interface MessageWithCitations {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  citations?: DocumentCitation[];
  timestamp: Date;
  studyId: string;
}