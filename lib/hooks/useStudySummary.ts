import useSWR from 'swr';
import { toast } from 'sonner';
import { useStudy } from './useStudy';
import { useDocuments } from './useDocuments';

interface SummaryResponse {
  id: string;
  content: string;
  timestamp: string;
}

async function fetchSummary(studyId: string): Promise<SummaryResponse> {
  const response = await fetch(`/api/studies/${studyId}/summary`);
  if (response.status === 404) {
    // No summary exists yet - return null
    return null as unknown as SummaryResponse;
  }
  if (!response.ok) {
    throw new Error('Failed to fetch summary');
  }
  return response.json();
}

async function generateSummaryAPI(studyId: string): Promise<SummaryResponse> {
  const response = await fetch(`/api/studies/${studyId}/summary`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate summary');
  }

  return response.json();
}

async function deleteSummaryAPI(studyId: string): Promise<void> {
  const response = await fetch(`/api/studies/${studyId}/summary`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete summary');
  }
}

export function useStudySummary(studyId: string) {
  const { study, refreshStudy } = useStudy(studyId);
  const { documents } = useDocuments(studyId);

  // Use SWR to fetch existing summary from API
  const {
    data: summaryData,
    error,
    isLoading,
    mutate,
  } = useSWR<SummaryResponse>(
    studyId ? `/api/studies/${studyId}/summary` : null,
    () => fetchSummary(studyId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 1,
      // Don't error on 404 - that just means no summary exists
      shouldRetryOnError: (error) => {
        return error.message !== 'Failed to fetch summary';
      },
    }
  );

  const hasDocuments = documents.length > 0;
  const hasSummary = !!summaryData?.content || !!study?.summary;

  const generateSummary = async () => {
    if (!hasDocuments) {
      toast.error('No documents to summarize');
      return;
    }

    try {
      // Show loading toast
      const loadingToast = toast.loading('Generating study summary...');

      // Generate summary
      const newSummary = await generateSummaryAPI(studyId);

      // Optimistically update SWR cache
      await mutate(newSummary, false);

      // Refresh study data to get updated summary field
      await refreshStudy();

      // Revalidate to ensure consistency
      await mutate();

      toast.dismiss(loadingToast);
      toast.success('Summary generated successfully');

      return newSummary;
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate summary'
      );

      // Revert optimistic update
      await mutate();
      throw error;
    }
  };

  const deleteSummary = async () => {
    try {
      // Optimistically clear cache
      await mutate(null as unknown as SummaryResponse, false);

      await deleteSummaryAPI(studyId);

      // Refresh study data to clear summary field
      await refreshStudy();

      // Revalidate to ensure consistency
      await mutate();

      toast.success('Summary deleted');
    } catch (error) {
      console.error('Error deleting summary:', error);
      toast.error('Failed to delete summary');

      // Revert optimistic update
      await mutate();
      throw error;
    }
  };

  return {
    summary: summaryData?.content || study?.summary || null,
    summaryTimestamp: summaryData?.timestamp || study?.updatedAt || null,
    hasDocuments,
    hasSummary,
    isLoading,
    error,
    generateSummary,
    deleteSummary,
    mutate,
  };
}