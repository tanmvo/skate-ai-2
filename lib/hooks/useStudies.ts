import useSWR from 'swr';
import { toast } from 'sonner';

export interface Study {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  _count: {
    documents: number;
    messages: number;
  };
}

async function fetchStudies(): Promise<Study[]> {
  const response = await fetch('/api/studies');
  if (!response.ok) {
    throw new Error('Failed to fetch studies');
  }
  return response.json();
}

async function createStudyAPI(name: string): Promise<Study> {
  const response = await fetch('/api/studies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create study');
  }
  
  return response.json();
}

async function deleteStudyAPI(studyId: string): Promise<void> {
  const response = await fetch(`/api/studies/${studyId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete study');
  }
}

export function useStudies() {
  const { data: studies, error, isLoading, mutate } = useSWR<Study[]>(
    '/api/studies',
    fetchStudies,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
    }
  );

  const createStudy = async (name: string) => {
    try {
      const newStudy = await createStudyAPI(name);
      
      // Optimistically update the cache
      await mutate([newStudy, ...(studies || [])], false);
      
      // Revalidate to ensure consistency
      await mutate();
      
      return newStudy;
    } catch (error) {
      console.error('Error creating study:', error);
      toast.error('Failed to create study');
      throw error;
    }
  };

  const deleteStudy = async (studyId: string) => {
    try {
      // Optimistically remove from cache
      const optimisticStudies = studies?.filter(study => study.id !== studyId) || [];
      await mutate(optimisticStudies, false);
      
      await deleteStudyAPI(studyId);
      
      // Revalidate to ensure consistency
      await mutate();
      
      toast.success('Study deleted');
    } catch (error) {
      console.error('Error deleting study:', error);
      toast.error('Failed to delete study');
      
      // Revert optimistic update
      await mutate();
      throw error;
    }
  };

  return {
    studies: studies || [],
    isLoading,
    error,
    createStudy,
    deleteStudy,
    mutate,
  };
}