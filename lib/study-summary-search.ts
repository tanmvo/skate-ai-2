import { findRelevantChunks, SearchResult } from './vector-search';

/**
 * Hybrid semantic search strategy for study summaries
 * Extracts representative content covering both study context and interesting details
 */

export interface RepresentativeContent {
  formattedContent: string;
  totalChunks: number;
  documentCount: number;
  queries: {
    context: number;
    detail: number;
  };
}

/**
 * Get representative content from study documents for summary generation
 * Uses hybrid query strategy: context queries + detail queries
 *
 * @param studyId - The study to analyze
 * @returns Formatted content string for LLM consumption + metadata
 */
export async function getStudyRepresentativeContent(
  studyId: string
): Promise<RepresentativeContent> {
  // STUDY CONTEXT QUERIES - Extract research design and methodology
  const contextQueries = [
    "research objective goal purpose aim study",
    "methodology method approach interview protocol",
    "key findings main themes important insights"
  ];

  // INTERESTING DETAILS QUERIES - Extract memorable specifics
  const detailQueries = [
    "surprising unexpected interesting notable specific",
    "key pain point major challenge significant problem"
  ];

  const allQueries = [...contextQueries, ...detailQueries];

  // Execute all queries in parallel
  const searchPromises = allQueries.map(query =>
    findRelevantChunks(query, {
      studyId,
      limit: 2, // Top 2 results per query (reduced from 3)
      minSimilarity: 0.1,
    })
  );

  const allResults = await Promise.all(searchPromises);

  // Flatten results
  const flatResults = allResults.flat();

  if (flatResults.length === 0) {
    // Return empty state - caller will generate basic fallback summary
    return {
      formattedContent: '',
      totalChunks: 0,
      documentCount: 0,
      queries: {
        context: contextQueries.length,
        detail: detailQueries.length,
      },
    };
  }

  // Deduplicate based on first 100 characters
  const uniqueResults = deduplicateChunks(flatResults);

  // Balance representation across documents (max 4-5 chunks per document)
  const balancedResults = balanceDocumentRepresentation(uniqueResults, 5);

  // Sort by similarity and limit to top 20
  const topResults = balancedResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 20);

  // Format content grouped by document
  const formattedContent = formatContentForLLM(topResults);

  // Count unique documents
  const uniqueDocuments = new Set(topResults.map(r => r.documentId));

  return {
    formattedContent,
    totalChunks: topResults.length,
    documentCount: uniqueDocuments.size,
    queries: {
      context: contextQueries.length,
      detail: detailQueries.length,
    },
  };
}

/**
 * Deduplicate chunks by comparing first 100 characters
 */
function deduplicateChunks(chunks: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const unique: SearchResult[] = [];

  for (const chunk of chunks) {
    const signature = chunk.content.slice(0, 100).toLowerCase().trim();

    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(chunk);
    }
  }

  return unique;
}

/**
 * Balance representation across documents
 * Ensures no single document dominates the results
 *
 * @param chunks - Deduplicated chunks
 * @param maxPerDocument - Maximum chunks per document (default: 5)
 */
function balanceDocumentRepresentation(
  chunks: SearchResult[],
  maxPerDocument: number = 5
): SearchResult[] {
  // Group chunks by document
  const byDocument = new Map<string, SearchResult[]>();

  for (const chunk of chunks) {
    const existing = byDocument.get(chunk.documentId) || [];
    existing.push(chunk);
    byDocument.set(chunk.documentId, existing);
  }

  // Take max N chunks per document (sorted by similarity)
  const balanced: SearchResult[] = [];

  for (const documentChunks of byDocument.values()) {
    const sorted = documentChunks.sort((a, b) => b.similarity - a.similarity);
    const limited = sorted.slice(0, maxPerDocument);
    balanced.push(...limited);
  }

  return balanced;
}

/**
 * Format content for LLM consumption
 * Groups chunks by document with clear structure
 */
function formatContentForLLM(chunks: SearchResult[]): string {
  // Group by document
  const byDocument = new Map<string, SearchResult[]>();

  for (const chunk of chunks) {
    const existing = byDocument.get(chunk.documentName) || [];
    existing.push(chunk);
    byDocument.set(chunk.documentName, existing);
  }

  // Format each document group
  const documentSections: string[] = [];

  for (const [documentName, documentChunks] of byDocument) {
    // Sort chunks by similarity within document
    const sorted = documentChunks.sort((a, b) => b.similarity - a.similarity);

    // Format chunks with numbering
    const chunkTexts = sorted.map((chunk, index) => {
      return `${index + 1}. ${chunk.content.trim()}`;
    }).join('\n\n');

    // Create document section
    const section = `**Document: ${documentName}**\n(${sorted.length} key excerpts)\n\n${chunkTexts}`;
    documentSections.push(section);
  }

  // Join all document sections
  return documentSections.join('\n\n---\n\n');
}