import { z } from 'zod';

/**
 * Zod schema for structured synthesis responses with inline citations
 */
export const structuredResponseSchema = z.object({
  response: z.string().describe('Main response text with {{cite:id}} markers for inline citations'),
  citations: z.array(z.object({
    id: z.string().describe('Unique citation ID for inline referencing (e.g., "doc1", "interview_sarah")'),
    documentId: z.string().describe('Database document ID'),
    documentName: z.string().describe('Human-readable document name'),
    relevantText: z.string().describe('Representative text snippet from the document'),
    pageNumber: z.number().optional().describe('Optional page reference if available')
  })).describe('Array of document-level citations referenced in the response'),
  metadata: z.object({
    searchQueries: z.array(z.string()).describe('Search queries used to gather information'),
    documentsSearched: z.array(z.string()).describe('Names of documents that were searched'),
    totalChunksAnalyzed: z.number().describe('Total number of document chunks analyzed')
  }).describe('Metadata about the synthesis process')
});

/**
 * TypeScript type derived from the Zod schema
 */
export type StructuredResponse = z.infer<typeof structuredResponseSchema>;

/**
 * Enhanced citation interface for document-level citations
 */
export interface DocumentCitation {
  id: string;                 // Unique citation ID for inline referencing
  documentId: string;         // Database document ID
  documentName: string;       // Human-readable document name  
  relevantText: string;       // Representative text snippet
  pageNumber?: number;        // Optional page reference
}

/**
 * Main citation type for the application
 */
export type Citation = DocumentCitation;