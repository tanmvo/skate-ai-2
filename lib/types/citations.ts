/**
 * Citation System Types
 *
 * Defines the structure for storing and rendering citations that link
 * AI-generated claims to source documents.
 */

/**
 * Citation data stored for each cited document
 */
export interface CitationData {
  documentId: string;
  documentName: string;
}

/**
 * Citation map storing all citations in a message
 * Key: Citation number (e.g., "1", "2", "3")
 * Value: Document information
 *
 * Example:
 * {
 *   "1": { documentId: "doc123", documentName: "Interview-3.pdf" },
 *   "2": { documentId: "doc456", documentName: "Survey-Results.pdf" }
 * }
 */
export interface CitationMap {
  [citationNumber: string]: CitationData;
}

/**
 * Citation information with position in text
 * Used for frontend rendering
 */
export interface CitationInfo {
  citationNumber: number;
  documentName: string;
  documentId: string;
  position: number; // Character position in text
}

/**
 * Type guard to check if object is a valid CitationMap
 */
export function isCitationMap(value: unknown): value is CitationMap {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const map = value as Record<string, unknown>;

  return Object.entries(map).every(([key, val]) => {
    // Key must be a numeric string
    if (!/^\d+$/.test(key)) {
      return false;
    }

    // Value must be CitationData
    if (!val || typeof val !== 'object') {
      return false;
    }

    const data = val as Record<string, unknown>;
    return (
      typeof data.documentId === 'string' &&
      typeof data.documentName === 'string'
    );
  });
}
