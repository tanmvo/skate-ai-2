import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMessageCitations } from '@/lib/hooks/useMessageCitations';
import { useCitations } from '@/lib/hooks/useCitations';
import { useCitationContext } from '@/lib/contexts/CitationContext';
import { CitationMap } from '@/lib/types/citations';
import React from 'react';

// Mock dependencies
vi.mock('@/lib/hooks/useCitations', () => ({
  useCitations: vi.fn(),
}));

vi.mock('@/lib/contexts/CitationContext', () => ({
  useCitationContext: vi.fn(),
}));

describe('useMessageCitations', () => {
  const mockMessageId = 'msg_123';
  const mockCitations: CitationMap = {
    '1': { documentId: 'doc_1', documentName: 'Document1.pdf' },
    '2': { documentId: 'doc_2', documentName: 'Document2.pdf' },
    '3': { documentId: 'doc_deleted', documentName: 'DeletedDoc.pdf' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Citation Enrichment', () => {
    it('should enrich citations with document validation', async () => {
      vi.mocked(useCitations).mockReturnValue({
        citations: mockCitations,
        isLoading: false,
        error: null,
        mutate: vi.fn(),
      });

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: (docId: string) =>
          docId === 'doc_1' || docId === 'doc_2',
        isLoading: false,
      });

      const { result } = renderHook(() => useMessageCitations(mockMessageId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify enriched citations
      expect(result.current.citations).toBeTruthy();
      expect(result.current.citations!['1'].documentExists).toBe(true);
      expect(result.current.citations!['2'].documentExists).toBe(true);
      expect(result.current.citations!['3'].documentExists).toBe(false); // Deleted
    });

    it('should preserve original citation data', async () => {
      vi.mocked(useCitations).mockReturnValue({
        citations: mockCitations,
        isLoading: false,
        error: null,
        mutate: vi.fn(),
      });

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      const { result } = renderHook(() => useMessageCitations(mockMessageId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Original data should be preserved
      expect(result.current.citations!['1'].documentId).toBe('doc_1');
      expect(result.current.citations!['1'].documentName).toBe('Document1.pdf');
    });
  });

  describe('Loading States', () => {
    it('should combine loading states from citations and documents', () => {
      vi.mocked(useCitations).mockReturnValue({
        citations: null,
        isLoading: true,
        error: null,
        mutate: vi.fn(),
      });

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      const { result } = renderHook(() => useMessageCitations(mockMessageId));

      // Should be loading if citations are loading
      expect(result.current.isLoading).toBe(true);
    });

    it('should be loading if documents are loading', () => {
      vi.mocked(useCitations).mockReturnValue({
        citations: mockCitations,
        isLoading: false,
        error: null,
        mutate: vi.fn(),
      });

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: true,
      });

      const { result } = renderHook(() => useMessageCitations(mockMessageId));

      // Should be loading if documents are loading
      expect(result.current.isLoading).toBe(true);
    });

    it('should not be loading when both are finished', () => {
      vi.mocked(useCitations).mockReturnValue({
        citations: mockCitations,
        isLoading: false,
        error: null,
        mutate: vi.fn(),
      });

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      const { result } = renderHook(() => useMessageCitations(mockMessageId));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Null/Empty States', () => {
    it('should return null citations when useCitations returns null', () => {
      vi.mocked(useCitations).mockReturnValue({
        citations: null,
        isLoading: false,
        error: null,
        mutate: vi.fn(),
      });

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      const { result } = renderHook(() => useMessageCitations(mockMessageId));

      expect(result.current.citations).toBeNull();
    });

    it('should handle empty citation map', () => {
      vi.mocked(useCitations).mockReturnValue({
        citations: {},
        isLoading: false,
        error: null,
        mutate: vi.fn(),
      });

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      const { result } = renderHook(() => useMessageCitations(mockMessageId));

      // Empty map should be enriched to empty map (not null)
      expect(result.current.citations).toEqual({});
    });
  });

  describe('Error Handling', () => {
    it('should pass through errors from useCitations', () => {
      const mockError = new Error('Failed to fetch citations');

      vi.mocked(useCitations).mockReturnValue({
        citations: null,
        isLoading: false,
        error: mockError,
        mutate: vi.fn(),
      });

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      const { result } = renderHook(() => useMessageCitations(mockMessageId));

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('Memoization', () => {
    it('should memoize enriched citations', () => {
      vi.mocked(useCitations).mockReturnValue({
        citations: mockCitations,
        isLoading: false,
        error: null,
        mutate: vi.fn(),
      });

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      const { result, rerender } = renderHook(() =>
        useMessageCitations(mockMessageId)
      );

      const firstCitations = result.current.citations;

      // Rerender without changing inputs
      rerender();

      // Should return same object reference (memoized)
      expect(result.current.citations).toBe(firstCitations);
    });

    it('should recompute when citations change', () => {
      const { rerender } = renderHook(
        ({ citations }) => {
          vi.mocked(useCitations).mockReturnValue({
            citations,
            isLoading: false,
            error: null,
            mutate: vi.fn(),
          });

          vi.mocked(useCitationContext).mockReturnValue({
            studyId: 'study_123',
            isDocumentValid: () => true,
            isLoading: false,
          });

          return useMessageCitations(mockMessageId);
        },
        { initialProps: { citations: mockCitations } }
      );

      // Change citations
      const newCitations: CitationMap = {
        '1': { documentId: 'doc_new', documentName: 'NewDoc.pdf' },
      };

      rerender({ citations: newCitations });

      // Re-render hook to verify change
      vi.mocked(useCitations).mockReturnValue({
        citations: newCitations,
        isLoading: false,
        error: null,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useMessageCitations(mockMessageId));

      expect(Object.keys(result.current.citations!).length).toBe(1);
    });

    it('should recompute when document validation changes', () => {
      vi.mocked(useCitations).mockReturnValue({
        citations: mockCitations,
        isLoading: false,
        error: null,
        mutate: vi.fn(),
      });

      const { rerender } = renderHook(
        ({ isDocValid }) => {
          vi.mocked(useCitationContext).mockReturnValue({
            studyId: 'study_123',
            isDocumentValid: isDocValid,
            isLoading: false,
          });

          return useMessageCitations(mockMessageId);
        },
        { initialProps: { isDocValid: () => true } }
      );

      // Change document validation function
      const newValidation = (docId: string) => docId === 'doc_1';

      rerender({ isDocValid: newValidation });

      // Re-render hook to verify change
      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: newValidation,
        isLoading: false,
      });

      const { result } = renderHook(() => useMessageCitations(mockMessageId));

      expect(result.current.citations!['1'].documentExists).toBe(true);
      expect(result.current.citations!['2'].documentExists).toBe(false);
    });
  });

  describe('Return Value Structure', () => {
    it('should return all required fields', () => {
      vi.mocked(useCitations).mockReturnValue({
        citations: mockCitations,
        isLoading: false,
        error: null,
        mutate: vi.fn(),
      });

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      const { result } = renderHook(() => useMessageCitations(mockMessageId));

      expect(result.current).toHaveProperty('citations');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
    });

    it('should have correct types for enriched data', () => {
      vi.mocked(useCitations).mockReturnValue({
        citations: mockCitations,
        isLoading: false,
        error: null,
        mutate: vi.fn(),
      });

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      const { result } = renderHook(() => useMessageCitations(mockMessageId));

      const citation = result.current.citations!['1'];

      expect(citation).toHaveProperty('documentId');
      expect(citation).toHaveProperty('documentName');
      expect(citation).toHaveProperty('documentExists');
      expect(typeof citation.documentExists).toBe('boolean');
    });
  });
});
