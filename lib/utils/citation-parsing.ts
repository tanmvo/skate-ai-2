import { CitationMap, CitationInfo } from '@/lib/types/citations';

/**
 * Citation Parsing Utilities
 *
 * Frontend utilities for parsing citation syntax from markdown content
 * and converting to renderable components.
 */

/**
 * Parse citation syntax from markdown content
 * Returns array of citation occurrences with positions
 *
 * @param content - Markdown content with citation syntax
 * @param citationMap - Citation map from database
 * @returns Array of citations with positions
 */
export function parseCitationPositions(
  content: string,
  citationMap: CitationMap
): CitationInfo[] {
  const citations: CitationInfo[] = [];
  const regex = /\^\[([^\]]+)\]/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const documentName = match[1].trim();

    // Find citation number from map by matching document name
    const entry = Object.entries(citationMap).find(
      ([, data]) => data.documentName === documentName
    );

    if (entry) {
      const [citationNumber, data] = entry;
      citations.push({
        citationNumber: parseInt(citationNumber),
        documentName: data.documentName,
        documentId: data.documentId,
        position: match.index
      });
    }
  }

  return citations;
}

/**
 * Replace citation syntax with numbered markers for display
 * Example: "text^[Doc.pdf]" → "text[1]"
 *
 * @param content - Content with citation syntax
 * @param citationMap - Citation map from database
 * @returns Content with numbered citation markers
 */
export function replaceCitationsWithNumbers(
  content: string,
  citationMap: CitationMap
): string {
  return content.replace(
    /\^\[([^\]]+)\]/g,
    (match, docName) => {
      const entry = Object.entries(citationMap).find(
        ([, data]) => data.documentName === docName
      );
      if (!entry) return match;

      const [citationNumber] = entry;
      return `[${citationNumber}]`;
    }
  );
}

/**
 * Convert citation map to lookup by document name
 * Useful for O(1) lookup during parsing
 *
 * @param citationMap - Citation map from database
 * @returns Map of document name to citation number
 */
export function createDocumentNameLookup(
  citationMap: CitationMap
): Map<string, { citationNumber: number; documentId: string }> {
  const lookup = new Map<string, { citationNumber: number; documentId: string }>();

  Object.entries(citationMap).forEach(([num, data]) => {
    lookup.set(data.documentName, {
      citationNumber: parseInt(num),
      documentId: data.documentId
    });
  });

  return lookup;
}

/**
 * Parse citations directly from streaming content (no validation)
 * Trusts LLM output blindly and assigns numbers based on order of appearance
 *
 * Used during streaming when database citations aren't available yet
 *
 * @param content - Streaming content with ^[Doc.pdf] syntax
 * @returns Citation map with temporary IDs and sequential numbering
 */
export function parseStreamingCitations(content: string): CitationMap {
  const citationMap: CitationMap = {};
  const seenDocuments = new Set<string>();
  const regex = /\^\[([^\]]+)\]/g;

  let match;
  let citationNumber = 1;

  // Extract all citations in order of appearance
  while ((match = regex.exec(content)) !== null) {
    const documentName = match[1].trim();

    // Skip if we've already assigned a number to this document
    if (seenDocuments.has(documentName)) {
      continue;
    }

    seenDocuments.add(documentName);

    // Assign sequential citation number
    citationMap[citationNumber.toString()] = {
      documentId: `streaming_${citationNumber}`, // Temporary ID
      documentName: documentName
    };

    citationNumber++;
  }

  return citationMap;
}
