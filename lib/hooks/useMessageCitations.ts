import { useMemo } from 'react';
import { useCitations } from './useCitations';
import { useCitationContext } from '../contexts/CitationContext';
import type { CitationData } from '../types/citations';

/**
 * Enriched citation data with document validation
 */
export interface EnrichedCitationData extends CitationData {
  documentExists: boolean;
}

/**
 * Enriched citation map with validation status
 */
export interface EnrichedCitationMap {
  [citationNumber: string]: EnrichedCitationData;
}

/**
 * Result type for useMessageCitations hook
 */
export interface UseMessageCitationsResult {
  citations: EnrichedCitationMap | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Convenience hook for accessing citations with document validation
 *
 * Combines `useCitations()` and `useCitationContext()` to provide
 * citation data enriched with document existence validation.
 *
 * **Features:**
 * - Fetches citations for a message via SWR
 * - Enriches each citation with `documentExists` boolean
 * - Handles loading states from both citations and documents
 * - Memoizes enriched citations for performance
 *
 * **Use this instead of useCitations() when:**
 * - You need document validation status
 * - You want a single hook for complete citation data
 * - You're rendering citation lists/badges
 *
 * @param messageId - The ID of the message to fetch citations for
 * @returns Enriched citations with validation, loading state, and error
 *
 * @example
 * ```tsx
 * function MessageCitations({ messageId }) {
 *   const { citations, isLoading } = useMessageCitations(messageId);
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!citations) return null;
 *
 *   return (
 *     <ul>
 *       {Object.entries(citations).map(([num, data]) => (
 *         <li key={num}>
 *           <CitationBadge
 *             citationNumber={parseInt(num)}
 *             documentName={data.documentName}
 *             documentExists={data.documentExists}
 *           />
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useMessageCitations(messageId: string): UseMessageCitationsResult {
  // Fetch citations from API
  const {
    citations,
    isLoading: citationsLoading,
    error,
  } = useCitations(messageId);

  // Get document validation from context
  const { isDocumentValid, isLoading: documentsLoading } = useCitationContext();

  // Enrich citations with document validation
  const enrichedCitations = useMemo(() => {
    if (!citations) return null;

    const enriched: EnrichedCitationMap = {};

    Object.entries(citations).forEach(([citationNumber, citationData]) => {
      enriched[citationNumber] = {
        ...citationData,
        documentExists: isDocumentValid(citationData.documentId),
      };
    });

    return enriched;
  }, [citations, isDocumentValid]);

  return {
    citations: enrichedCitations,
    isLoading: citationsLoading || documentsLoading,
    error,
  };
}
