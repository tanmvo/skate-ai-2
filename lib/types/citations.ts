export interface Citation {
  documentId: string;
  documentName: string;
  chunkId: string;
  content: string;
  similarity: number;
  chunkIndex: number;
}

export interface MessageWithCitations {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  citations?: Citation[];
  timestamp: Date;
  studyId: string;
}