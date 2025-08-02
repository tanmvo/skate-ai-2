/**
 * Metadata types for hybrid search and LLM function calling
 */

export interface DocumentMetadata {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  uploadedAt: Date;
  chunkCount: number;
  wordCount?: number;
  hasEmbeddings: boolean;
}

export interface StudyMetadata {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  documentCount: number;
  messageCount: number;
  documents: DocumentMetadata[];
  totalChunks: number;
  chunksWithEmbeddings: number;
}

export interface MetadataContext {
  study: StudyMetadata;
  availableDocuments: DocumentMetadata[];
  totalDocuments: number;
  readyDocuments: number;
  searchableChunks: number;
}

export interface DocumentReference {
  id: string;
  name: string;
  chunkCount: number;
}

export interface SearchContext {
  studyId: string;
  availableDocuments: DocumentReference[];
  searchScope: 'all' | 'specific';
  targetDocuments?: string[];
}

export interface MetadataCacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}