import useSWR from 'swr';
import { CitationMap } from '@/lib/types/citations';

/**
 * Result type for useCitations hook
 */
export interface UseCitationsResult {
  citations: CitationMap | null;
  isLoading: boolean;
  error: Error | null;
  mutate: () => Promise<CitationMap | undefined>;
}

/**
 * Fetcher function for citation data
 * @param messageId - Message ID to fetch citations for
 * @returns CitationMap or empty object if no citations exist
 */
async function fetchCitations(messageId: string): Promise<CitationMap> {
  const response = await fetch(`/api/citations/${messageId}`);

  if (!response.ok) {
    if (response.status === 404) {
      // Message not found or no access - return empty citations
      return {};
    }
    throw new Error(`Failed to fetch citations: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Custom hook to fetch and manage citation data for a message
 *
 * Features:
 * - Fetches citations from database via API endpoint
 * - Uses SWR for caching and revalidation
 * - Handles loading, error, and empty states gracefully
 * - Provides mutate function for manual revalidation
 *
 * @param messageId - The ID of the message to fetch citations for
 * @returns UseCitationsResult with citations, loading state, error, and mutate function
 *
 * @example
 * ```tsx
 * function MessageComponent({ messageId }) {
 *   const { citations, isLoading, error } = useCitations(messageId);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage />;
 *   if (!citations || Object.keys(citations).length === 0) return <NoCitations />;
 *
 *   return <CitationList citations={citations} />;
 * }
 * ```
 */
export function useCitations(messageId: string): UseCitationsResult {
  const {
    data: citations,
    error,
    isLoading,
    mutate,
  } = useSWR<CitationMap>(
    messageId ? `/api/citations/${messageId}` : null,
    () => fetchCitations(messageId),
    {
      revalidateOnFocus: false, // Don't refetch when window regains focus
      revalidateOnReconnect: true, // Refetch when network reconnects
      errorRetryCount: 2, // Retry failed requests up to 2 times
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
  );

  // Handle empty citations (return null instead of empty object for cleaner checks)
  const normalizedCitations = citations && Object.keys(citations).length > 0
    ? citations
    : null;

  return {
    citations: normalizedCitations,
    isLoading,
    error: error || null,
    mutate,
  };
}
