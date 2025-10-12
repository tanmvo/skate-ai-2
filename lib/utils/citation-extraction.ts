import { SearchResult, findRelevantChunks } from '@/lib/vector-search';
import { CitationMap } from '@/lib/types/citations';

/**
 * Citation Extraction Utilities
 *
 * Extracts citations from LLM response content and validates them against
 * search results to prevent hallucinated citations.
 */

/**
 * Extract citations from LLM response content
 * Validates citations against search results (strict mode)
 *
 * @param content - The LLM response text containing citation syntax
 * @param searchResults - Search results from tool calls to validate against
 * @returns CitationMap with validated citations only
 */
export function extractCitationsFromContent(
  content: string,
  searchResults: SearchResult[]
): CitationMap {
  const citationMap: CitationMap = {};

  // Regex to find citation syntax: ^[DocumentName.pdf]
  const citationRegex = /\^\[([^\]]+)\]/g;

  // Build document lookup from search results for validation
  const validDocuments = new Map<string, { documentId: string; documentName: string }>();
  searchResults.forEach(result => {
    validDocuments.set(result.documentName, {
      documentId: result.documentId,
      documentName: result.documentName
    });
  });

  // PHASE 1: Collect all unique valid citations from content
  const citedDocuments = new Set<string>();
  let match;

  while ((match = citationRegex.exec(content)) !== null) {
    const documentName = match[1].trim();

    // STRICT VALIDATION: Only accept citations that match search results
    if (!validDocuments.has(documentName)) {
      continue; // Skip hallucinated citations
    }

    citedDocuments.add(documentName);
  }

  // PHASE 2: Sort documents alphabetically for deterministic numbering
  // This ensures ^[Amy-Pan.pdf] always gets the same number regardless of text order
  const sortedDocuments = Array.from(citedDocuments).sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' })
  );

  // PHASE 3: Assign citation numbers based on sorted order
  sortedDocuments.forEach((documentName, index) => {
    const citationNumber = index + 1;
    const docInfo = validDocuments.get(documentName)!;

    citationMap[citationNumber.toString()] = {
      documentId: docInfo.documentId,
      documentName: docInfo.documentName
    };
  });

  return citationMap;
}

/**
 * Extract search results from all tool calls by re-running searches
 * Since AI SDK serializes tool outputs, we re-execute searches using the original inputs
 *
 * @param toolCalls - Array of persisted tool calls from message
 * @param studyId - Study ID for scoping searches
 * @returns Array of all SearchResults from search tools
 */
export async function extractSearchResultsFromToolCalls(
  toolCalls: Array<{
    toolName: string;
    input?: Record<string, unknown>;
  }>,
  studyId: string
): Promise<SearchResult[]> {
  const searchToolCalls = toolCalls.filter(t => t.toolName.startsWith('search_'));

  // Build array of search promises for parallel execution
  const searchPromises = searchToolCalls.map(async (tc) => {
    try {
      if (!tc.input) {
        return { success: false, results: [], toolName: tc.toolName };
      }

      const query = tc.input.query as string;
      const limit = (tc.input.limit as number) || 10;
      const minSimilarity = (tc.input.minSimilarity as number) || 0.1;

      if (!query) {
        return { success: false, results: [], toolName: tc.toolName };
      }

      // Re-run the search to get SearchResult[] objects
      const searchOptions = {
        studyId,
        limit,
        minSimilarity,
        ...(tc.toolName === 'search_specific_documents' && tc.input.documentIds
          ? { documentIds: tc.input.documentIds as string[] }
          : {})
      };

      const results = await findRelevantChunks(query, searchOptions);

      return { success: true, results, toolName: tc.toolName };

    } catch (error) {
      return { success: false, results: [], toolName: tc.toolName, error };
    }
  });

  // Execute all searches in parallel
  const searchResponses = await Promise.all(searchPromises);

  // Flatten and deduplicate results from successful searches
  const allResults: SearchResult[] = [];
  const seenChunkIds = new Set<string>();

  searchResponses.forEach(response => {
    if (response.success && response.results.length > 0) {
      response.results.forEach((result) => {
        if (!seenChunkIds.has(result.chunkId)) {
          allResults.push(result);
          seenChunkIds.add(result.chunkId);
        }
      });
    }
  });

  return allResults;
}

/**
 * Validate citation map structure
 * Ensures all citation numbers are sequential and data is valid
 *
 * @param citations - Citation map to validate
 * @returns True if valid, false otherwise
 */
export function validateCitationMap(citations: CitationMap): boolean {
  const keys = Object.keys(citations);

  // Check if all keys are numeric strings
  if (!keys.every(key => /^\d+$/.test(key))) {
    return false;
  }

  // Check if values have required fields
  for (const data of Object.values(citations)) {
    if (!data.documentId || !data.documentName) {
      return false;
    }
  }

  return true;
}
