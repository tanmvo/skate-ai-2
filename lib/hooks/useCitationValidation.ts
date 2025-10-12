import { useMemo } from 'react';
import { CitationMap } from '@/lib/types/citations';
import { useDocuments } from './useDocuments';

/**
 * Validation result for a single citation
 */
export interface CitationValidationResult {
  isValid: boolean;
  documentExists: boolean;
  error?: string;
}

/**
 * Validation map for all citations in a message
 * Key: Citation number (e.g., "1", "2", "3")
 * Value: Validation result
 */
export interface CitationValidation {
  [citationNumber: string]: CitationValidationResult;
}

/**
 * Custom hook to validate citations against current study documents
 *
 * Features:
 * - Validates document existence for each citation
 * - Uses useDocuments() hook to fetch document list
 * - Memoizes validation results for performance
 * - Handles deleted documents gracefully
 * - Returns detailed validation status for each citation
 *
 * This hook centralizes citation validation logic and eliminates
 * the need to pass `documentExists` prop through component tree.
 *
 * @param citations - Citation map to validate (can be null)
 * @param studyId - Study ID to scope document validation
 * @returns Validation map with status for each citation
 *
 * @example
 * ```tsx
 * function CitationRenderer({ citations, studyId }) {
 *   const validation = useCitationValidation(citations, studyId);
 *
 *   return (
 *     <>
 *       {Object.entries(citations).map(([num, data]) => {
 *         const isValid = validation[num]?.documentExists ?? false;
 *         return (
 *           <CitationBadge
 *             key={num}
 *             citationNumber={parseInt(num)}
 *             documentName={data.documentName}
 *             isValid={isValid}
 *           />
 *         );
 *       })}
 *     </>
 *   );
 * }
 * ```
 */
export function useCitationValidation(
  citations: CitationMap | null,
  studyId: string
): CitationValidation {
  // Fetch documents for the study
  const { documents, isLoading } = useDocuments(studyId);

  // Memoize validation results
  const validation = useMemo(() => {
    const validationMap: CitationValidation = {};

    // Handle null or empty citations
    if (!citations || Object.keys(citations).length === 0) {
      return validationMap;
    }

    // If documents are still loading, mark all as valid temporarily
    // (will re-validate when documents load due to memoization dependency)
    if (isLoading) {
      Object.keys(citations).forEach((citationNumber) => {
        validationMap[citationNumber] = {
          isValid: true, // Optimistic validation
          documentExists: true, // Assume exists until proven otherwise
        };
      });
      return validationMap;
    }

    // Create document ID lookup for O(1) existence checks
    const documentIds = new Set(documents.map((doc) => doc.id));

    // Validate each citation
    Object.entries(citations).forEach(([citationNumber, citationData]) => {
      const documentExists = documentIds.has(citationData.documentId);

      validationMap[citationNumber] = {
        isValid: documentExists,
        documentExists,
        error: documentExists
          ? undefined
          : 'Document has been deleted or is no longer accessible',
      };
    });

    return validationMap;
  }, [citations, documents, isLoading]);

  return validation;
}

/**
 * Helper hook to check if a specific document exists in the study
 *
 * Useful for quick document existence checks without full citation validation.
 *
 * @param documentId - Document ID to check
 * @param studyId - Study ID to scope the check
 * @returns True if document exists, false otherwise
 *
 * @example
 * ```tsx
 * function DocumentLink({ documentId, studyId }) {
 *   const exists = useDocumentExists(documentId, studyId);
 *
 *   if (!exists) {
 *     return <span className="text-muted">Document deleted</span>;
 *   }
 *
 *   return <a href={`/documents/${documentId}`}>View Document</a>;
 * }
 * ```
 */
export function useDocumentExists(
  documentId: string,
  studyId: string
): boolean {
  const { documents, isLoading } = useDocuments(studyId);

  return useMemo(() => {
    if (isLoading) return true; // Optimistic: assume exists while loading

    return documents.some((doc) => doc.id === documentId);
  }, [documentId, documents, isLoading]);
}
