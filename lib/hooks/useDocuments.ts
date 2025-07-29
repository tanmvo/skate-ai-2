import useSWR from 'swr';
import { toast } from 'sonner';
import { StudyDocument } from './useStudy';

async function fetchDocuments(studyId: string): Promise<StudyDocument[]> {
  const response = await fetch(`/api/studies/${studyId}/documents`);
  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }
  return response.json();
}

async function deleteDocumentAPI(documentId: string): Promise<void> {
  const response = await fetch(`/api/documents/${documentId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete document');
  }
}

export function useDocuments(studyId: string) {
  const { data: documents, error, isLoading, mutate } = useSWR<StudyDocument[]>(
    studyId ? `/api/studies/${studyId}/documents` : null,
    () => fetchDocuments(studyId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
    }
  );

  const deleteDocument = async (documentId: string) => {
    try {
      // Optimistically remove from cache
      const optimisticDocuments = documents?.filter(doc => doc.id !== documentId) || [];
      await mutate(optimisticDocuments, false);
      
      await deleteDocumentAPI(documentId);
      
      // Revalidate to ensure consistency
      await mutate();
      
      toast.success('Document deleted');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
      
      // Revert optimistic update
      await mutate();
      throw error;
    }
  };

  const refreshDocuments = () => {
    return mutate();
  };

  const addDocument = (newDocument: StudyDocument) => {
    // Optimistically add to cache
    const updatedDocuments = [newDocument, ...(documents || [])];
    mutate(updatedDocuments, false);
  };

  return {
    documents: documents || [],
    isLoading,
    error,
    deleteDocument,
    refreshDocuments,
    addDocument,
    mutate,
  };
}