import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CitationProvider,
  useCitationContext,
} from '@/lib/contexts/CitationContext';
import { useDocuments } from '@/lib/hooks/useDocuments';
import React from 'react';

// Mock useDocuments hook
vi.mock('@/lib/hooks/useDocuments', () => ({
  useDocuments: vi.fn(),
}));

describe('CitationContext', () => {
  const mockStudyId = 'study_123';
  const mockDocuments = [
    { id: 'doc_1', fileName: 'Document1.pdf', originalName: 'Document1.pdf' },
    { id: 'doc_2', fileName: 'Document2.pdf', originalName: 'Document2.pdf' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CitationProvider', () => {
    it('should provide context value to children', () => {
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

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CitationProvider studyId={mockStudyId}>{children}</CitationProvider>
      );

      const { result } = renderHook(() => useCitationContext(), { wrapper });

      expect(result.current.studyId).toBe(mockStudyId);
      expect(result.current.isLoading).toBe(false);
      expect(typeof result.current.isDocumentValid).toBe('function');
    });

    it('should validate documents correctly', () => {
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

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CitationProvider studyId={mockStudyId}>{children}</CitationProvider>
      );

      const { result } = renderHook(() => useCitationContext(), { wrapper });

      // Existing documents should be valid
      expect(result.current.isDocumentValid('doc_1')).toBe(true);
      expect(result.current.isDocumentValid('doc_2')).toBe(true);

      // Non-existent documents should be invalid
      expect(result.current.isDocumentValid('doc_deleted')).toBe(false);
      expect(result.current.isDocumentValid('doc_999')).toBe(false);
    });

    it('should pass loading state from useDocuments', () => {
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

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CitationProvider studyId={mockStudyId}>{children}</CitationProvider>
      );

      const { result } = renderHook(() => useCitationContext(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it('should update when documents change', () => {
      // Start with initial documents
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

          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <CitationProvider studyId={mockStudyId}>{children}</CitationProvider>
          );

          return renderHook(() => useCitationContext(), { wrapper });
        },
        { initialProps: { documents: mockDocuments } }
      );

      // Add new document
      const updatedDocuments = [
        ...mockDocuments,
        { id: 'doc_3', fileName: 'Document3.pdf', originalName: 'Document3.pdf' },
      ];

      rerender({ documents: updatedDocuments });

      // Re-render hook to get updated context
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

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CitationProvider studyId={mockStudyId}>{children}</CitationProvider>
      );

      const { result } = renderHook(() => useCitationContext(), { wrapper });

      // New document should now be valid
      expect(result.current.isDocumentValid('doc_3')).toBe(true);
    });

    it('should update when studyId changes', () => {
      const { rerender } = renderHook(
        ({ studyId }) => {
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

          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <CitationProvider studyId={studyId}>{children}</CitationProvider>
          );

          return renderHook(() => useCitationContext(), { wrapper });
        },
        { initialProps: { studyId: mockStudyId } }
      );

      const newStudyId = 'study_456';
      rerender({ studyId: newStudyId });

      // Re-render hook with new studyId
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

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CitationProvider studyId={newStudyId}>{children}</CitationProvider>
      );

      const { result } = renderHook(() => useCitationContext(), { wrapper });

      expect(result.current.studyId).toBe(newStudyId);
    });

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

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CitationProvider studyId={mockStudyId}>{children}</CitationProvider>
      );

      const { result } = renderHook(() => useCitationContext(), { wrapper });

      // All documents should be invalid
      expect(result.current.isDocumentValid('doc_1')).toBe(false);
      expect(result.current.isDocumentValid('doc_2')).toBe(false);
    });
  });

  describe('useCitationContext', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useCitationContext());
      }).toThrow('useCitationContext must be used within a CitationProvider');

      consoleError.mockRestore();
    });

    it('should return context value when used inside provider', () => {
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

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CitationProvider studyId={mockStudyId}>{children}</CitationProvider>
      );

      const { result } = renderHook(() => useCitationContext(), { wrapper });

      expect(result.current).toHaveProperty('studyId');
      expect(result.current).toHaveProperty('isDocumentValid');
      expect(result.current).toHaveProperty('isLoading');
    });
  });

  describe('Memoization', () => {
    it('should memoize context value when dependencies unchanged', () => {
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

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CitationProvider studyId={mockStudyId}>{children}</CitationProvider>
      );

      const { result, rerender } = renderHook(() => useCitationContext(), {
        wrapper,
      });

      const firstValue = result.current;

      // Rerender without changing props
      rerender();

      // Should return same object reference (memoized)
      expect(result.current).toBe(firstValue);
    });
  });
});
