import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCitationValidation, useDocumentExists } from '@/lib/hooks/useCitationValidation';
import { CitationMap } from '@/lib/types/citations';
import { useDocuments } from '@/lib/hooks/useDocuments';

// Mock useDocuments hook
vi.mock('@/lib/hooks/useDocuments', () => ({
  useDocuments: vi.fn(),
}));

describe('useCitationValidation', () => {
  const mockStudyId = 'study_123';
  const mockCitations: CitationMap = {
    '1': { documentId: 'doc_1', documentName: 'Document1.pdf' },
    '2': { documentId: 'doc_2', documentName: 'Document2.pdf' },
    '3': { documentId: 'doc_deleted', documentName: 'DeletedDoc.pdf' },
  };

  const mockDocuments = [
    { id: 'doc_1', fileName: 'Document1.pdf', originalName: 'Document1.pdf' },
    { id: 'doc_2', fileName: 'Document2.pdf', originalName: 'Document2.pdf' },
    // doc_deleted is intentionally missing
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Validation', () => {
    it('should validate existing documents correctly', () => {
      vi.mocked(useDocuments).mockReturnValue({
        documents: mockDocuments,
        isLoading: false,
        error: null,
        deleteDocument: vi.fn(),
        renameDocument: vi.fn(),
        refreshDocuments: vi.fn(),
        addDocument: vi.fn(),
        mutate: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCitationValidation(mockCitations, mockStudyId)
      );

      // Document 1 should be valid
      expect(result.current['1']).toEqual({
        isValid: true,
        documentExists: true,
        error: undefined,
      });

      // Document 2 should be valid
      expect(result.current['2']).toEqual({
        isValid: true,
        documentExists: true,
        error: undefined,
      });

      // Deleted document should be invalid
      expect(result.current['3']).toEqual({
        isValid: false,
        documentExists: false,
        error: 'Document has been deleted or is no longer accessible',
      });
    });

    it('should handle null citations', () => {
      vi.mocked(useDocuments).mockReturnValue({
        documents: mockDocuments,
        isLoading: false,
        error: null,
        deleteDocument: vi.fn(),
        renameDocument: vi.fn(),
        refreshDocuments: vi.fn(),
        addDocument: vi.fn(),
        mutate: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCitationValidation(null, mockStudyId)
      );

      expect(result.current).toEqual({});
    });

    it('should handle empty citations', () => {
      vi.mocked(useDocuments).mockReturnValue({
        documents: mockDocuments,
        isLoading: false,
        error: null,
        deleteDocument: vi.fn(),
        renameDocument: vi.fn(),
        refreshDocuments: vi.fn(),
        addDocument: vi.fn(),
        mutate: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCitationValidation({}, mockStudyId)
      );

      expect(result.current).toEqual({});
    });
  });

  describe('Loading State Handling', () => {
    it('should optimistically validate while documents are loading', () => {
      vi.mocked(useDocuments).mockReturnValue({
        documents: [],
        isLoading: true,
        error: null,
        deleteDocument: vi.fn(),
        renameDocument: vi.fn(),
        refreshDocuments: vi.fn(),
        addDocument: vi.fn(),
        mutate: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCitationValidation(mockCitations, mockStudyId)
      );

      // All citations should be optimistically valid while loading
      expect(result.current['1']).toEqual({
        isValid: true,
        documentExists: true,
      });
      expect(result.current['2']).toEqual({
        isValid: true,
        documentExists: true,
      });
      expect(result.current['3']).toEqual({
        isValid: true,
        documentExists: true,
      });
    });

    it('should revalidate when documents finish loading', () => {
      // Start with loading state
      const { result, rerender } = renderHook(
        ({ isLoading, documents }) => {
          vi.mocked(useDocuments).mockReturnValue({
            documents,
            isLoading,
            error: null,
            deleteDocument: vi.fn(),
            renameDocument: vi.fn(),
            refreshDocuments: vi.fn(),
            addDocument: vi.fn(),
            mutate: vi.fn(),
          });
          return useCitationValidation(mockCitations, mockStudyId);
        },
        { initialProps: { isLoading: true, documents: [] } }
      );

      // Should be optimistically valid
      expect(result.current['3'].isValid).toBe(true);

      // Finish loading with actual documents
      rerender({ isLoading: false, documents: mockDocuments });

      // Should now reflect actual validation
      expect(result.current['3'].isValid).toBe(false);
      expect(result.current['3'].documentExists).toBe(false);
    });
  });

  describe('Memoization', () => {
    it('should memoize validation results', () => {
      vi.mocked(useDocuments).mockReturnValue({
        documents: mockDocuments,
        isLoading: false,
        error: null,
        deleteDocument: vi.fn(),
        renameDocument: vi.fn(),
        refreshDocuments: vi.fn(),
        addDocument: vi.fn(),
        mutate: vi.fn(),
      });

      const { result, rerender } = renderHook(() =>
        useCitationValidation(mockCitations, mockStudyId)
      );

      const firstResult = result.current;

      // Rerender with same inputs
      rerender();

      // Should return same object reference (memoized)
      expect(result.current).toBe(firstResult);
    });

    it('should recompute when citations change', () => {
      vi.mocked(useDocuments).mockReturnValue({
        documents: mockDocuments,
        isLoading: false,
        error: null,
        deleteDocument: vi.fn(),
        renameDocument: vi.fn(),
        refreshDocuments: vi.fn(),
        addDocument: vi.fn(),
        mutate: vi.fn(),
      });

      const { result, rerender } = renderHook(
        ({ citations }) => {
          return useCitationValidation(citations, mockStudyId);
        },
        { initialProps: { citations: mockCitations } }
      );

      const firstResult = result.current;

      // Update citations
      const newCitations: CitationMap = {
        '1': { documentId: 'doc_1', documentName: 'Document1.pdf' },
      };
      rerender({ citations: newCitations });

      // Should create new validation
      expect(result.current).not.toBe(firstResult);
      expect(Object.keys(result.current).length).toBe(1);
    });

    it('should recompute when documents change', () => {
      const { rerender } = renderHook(
        ({ documents }) => {
          vi.mocked(useDocuments).mockReturnValue({
            documents,
            isLoading: false,
            error: null,
            deleteDocument: vi.fn(),
            renameDocument: vi.fn(),
            refreshDocuments: vi.fn(),
            addDocument: vi.fn(),
            mutate: vi.fn(),
          });
          return useCitationValidation(mockCitations, mockStudyId);
        },
        { initialProps: { documents: mockDocuments } }
      );

      // Add the deleted document back
      const updatedDocuments = [
        ...mockDocuments,
        { id: 'doc_deleted', fileName: 'DeletedDoc.pdf', originalName: 'DeletedDoc.pdf' },
      ];

      rerender({ documents: updatedDocuments });

      // Re-fetch to get updated result after rerender
      const { result } = renderHook(() => {
        vi.mocked(useDocuments).mockReturnValue({
          documents: updatedDocuments,
          isLoading: false,
          error: null,
          deleteDocument: vi.fn(),
          renameDocument: vi.fn(),
          refreshDocuments: vi.fn(),
          addDocument: vi.fn(),
          mutate: vi.fn(),
        });
        return useCitationValidation(mockCitations, mockStudyId);
      });

      // Previously deleted document should now be valid
      expect(result.current['3'].isValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document list', () => {
      vi.mocked(useDocuments).mockReturnValue({
        documents: [],
        isLoading: false,
        error: null,
        deleteDocument: vi.fn(),
        renameDocument: vi.fn(),
        refreshDocuments: vi.fn(),
        addDocument: vi.fn(),
        mutate: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCitationValidation(mockCitations, mockStudyId)
      );

      // All citations should be invalid
      expect(result.current['1'].isValid).toBe(false);
      expect(result.current['2'].isValid).toBe(false);
      expect(result.current['3'].isValid).toBe(false);
    });

    it('should handle all documents deleted', () => {
      vi.mocked(useDocuments).mockReturnValue({
        documents: [],
        isLoading: false,
        error: null,
        deleteDocument: vi.fn(),
        renameDocument: vi.fn(),
        refreshDocuments: vi.fn(),
        addDocument: vi.fn(),
        mutate: vi.fn(),
      });

      const { result } = renderHook(() =>
        useCitationValidation(mockCitations, mockStudyId)
      );

      Object.values(result.current).forEach((validation) => {
        expect(validation.isValid).toBe(false);
        expect(validation.documentExists).toBe(false);
        expect(validation.error).toBe('Document has been deleted or is no longer accessible');
      });
    });
  });
});

describe('useDocumentExists', () => {
  const mockStudyId = 'study_123';
  const mockDocuments = [
    { id: 'doc_1', fileName: 'Document1.pdf', originalName: 'Document1.pdf' },
    { id: 'doc_2', fileName: 'Document2.pdf', originalName: 'Document2.pdf' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for existing document', () => {
    vi.mocked(useDocuments).mockReturnValue({
      documents: mockDocuments,
      isLoading: false,
      error: null,
      deleteDocument: vi.fn(),
      renameDocument: vi.fn(),
      refreshDocuments: vi.fn(),
      addDocument: vi.fn(),
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => useDocumentExists('doc_1', mockStudyId));

    expect(result.current).toBe(true);
  });

  it('should return false for non-existent document', () => {
    vi.mocked(useDocuments).mockReturnValue({
      documents: mockDocuments,
      isLoading: false,
      error: null,
      deleteDocument: vi.fn(),
      renameDocument: vi.fn(),
      refreshDocuments: vi.fn(),
      addDocument: vi.fn(),
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => useDocumentExists('doc_deleted', mockStudyId));

    expect(result.current).toBe(false);
  });

  it('should optimistically return true while loading', () => {
    vi.mocked(useDocuments).mockReturnValue({
      documents: [],
      isLoading: true,
      error: null,
      deleteDocument: vi.fn(),
      renameDocument: vi.fn(),
      refreshDocuments: vi.fn(),
      addDocument: vi.fn(),
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => useDocumentExists('doc_1', mockStudyId));

    expect(result.current).toBe(true);
  });
});
