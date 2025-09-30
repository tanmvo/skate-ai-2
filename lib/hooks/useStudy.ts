import useSWR from 'swr';
import { toast } from 'sonner';

export interface StudyDocument {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  processingStatus: string;
  studyId: string;
}

export interface StudyMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  timestamp: string;
  studyId: string;
}

export interface StudyWithDetails {
  id: string;
  name: string;
  summary?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  documents: StudyDocument[];
  messages: StudyMessage[];
  _count: {
    documents: number;
    messages: number;
  };
}

async function fetchStudy(studyId: string): Promise<StudyWithDetails> {
  const response = await fetch(`/api/studies/${studyId}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Study not found');
    }
    throw new Error('Failed to fetch study');
  }
  return response.json();
}

async function updateStudyAPI(studyId: string, name: string): Promise<StudyWithDetails> {
  const response = await fetch(`/api/studies/${studyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update study');
  }
  
  return response.json();
}

export function useStudy(studyId: string) {
  const { data: study, error, isLoading, mutate } = useSWR<StudyWithDetails>(
    studyId ? `/api/studies/${studyId}` : null,
    () => fetchStudy(studyId),
    {
      revalidateOnFocus: true, // Enable refetch on focus to catch summary updates
      revalidateOnReconnect: true,
      errorRetryCount: 2,
    }
  );

  const updateStudy = async (name: string) => {
    if (!study) return;
    
    try {
      // Optimistically update the cache
      const optimisticStudy = { ...study, name };
      await mutate(optimisticStudy, false);
      
      const updatedStudy = await updateStudyAPI(studyId, name);
      
      // Update with server response
      await mutate(updatedStudy);
      
      toast.success('Study updated');
      return updatedStudy;
    } catch (error) {
      console.error('Error updating study:', error);
      toast.error('Failed to update study');
      
      // Revert optimistic update
      await mutate();
      throw error;
    }
  };

  const refreshStudy = () => {
    return mutate();
  };

  return {
    study,
    isLoading,
    error,
    updateStudy,
    refreshStudy,
    mutate,
  };
}