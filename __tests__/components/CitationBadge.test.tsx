import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CitationBadge } from '@/components/chat/CitationBadge';
import { useCitationContext } from '@/lib/contexts/CitationContext';
import React from 'react';

// Mock CitationContext
vi.mock('@/lib/contexts/CitationContext', () => ({
  useCitationContext: vi.fn(),
}));

describe('CitationBadge - React.memo Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Context Integration', () => {
    it('should use isDocumentValid from context', () => {
      const mockIsDocumentValid = vi.fn(() => true);

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: mockIsDocumentValid,
        isLoading: false,
      });

      render(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_1"
        />
      );

      // Verify context function was called with correct documentId
      expect(mockIsDocumentValid).toHaveBeenCalledWith('doc_1');
    });

    it('should render valid document state', () => {
      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      render(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_1"
        />
      );

      const badge = screen.getByRole('note');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('1');
      expect(badge).toHaveClass('bg-primary/10', 'text-primary');
    });

    it('should render invalid document state', () => {
      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => false,
        isLoading: false,
      });

      render(
        <CitationBadge
          citationNumber={1}
          documentName="DeletedDoc.pdf"
          documentId="doc_deleted"
        />
      );

      const badge = screen.getByRole('note');
      expect(badge).toHaveClass('bg-muted', 'text-muted-foreground');
    });
  });

  describe('Memoization Behavior', () => {
    it('should not re-render when props are unchanged', () => {
      const mockIsDocumentValid = vi.fn(() => true);

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: mockIsDocumentValid,
        isLoading: false,
      });

      const { rerender } = render(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_1"
        />
      );

      const callCount = mockIsDocumentValid.mock.calls.length;

      // Rerender with same props
      rerender(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_1"
        />
      );

      // Should not call context function again (memoized)
      expect(mockIsDocumentValid.mock.calls.length).toBe(callCount);
    });

    it('should re-render when citationNumber changes', () => {
      const mockIsDocumentValid = vi.fn(() => true);

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: mockIsDocumentValid,
        isLoading: false,
      });

      const { rerender } = render(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_1"
        />
      );

      const callCount = mockIsDocumentValid.mock.calls.length;

      // Change citationNumber
      rerender(
        <CitationBadge
          citationNumber={2}
          documentName="Document1.pdf"
          documentId="doc_1"
        />
      );

      // Should call context function again
      expect(mockIsDocumentValid.mock.calls.length).toBeGreaterThan(callCount);
      expect(screen.getByRole('note')).toHaveTextContent('2');
    });

    it('should re-render when documentId changes', () => {
      const mockIsDocumentValid = vi.fn(() => true);

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: mockIsDocumentValid,
        isLoading: false,
      });

      const { rerender } = render(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_1"
        />
      );

      const callCount = mockIsDocumentValid.mock.calls.length;

      // Change documentId
      rerender(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_2"
        />
      );

      // Should call context function again with new documentId
      expect(mockIsDocumentValid.mock.calls.length).toBeGreaterThan(callCount);
      expect(mockIsDocumentValid).toHaveBeenCalledWith('doc_2');
    });

    it('should re-render when documentName changes', () => {
      const mockIsDocumentValid = vi.fn(() => true);

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: mockIsDocumentValid,
        isLoading: false,
      });

      const { rerender } = render(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_1"
        />
      );

      const callCount = mockIsDocumentValid.mock.calls.length;

      // Change documentName
      rerender(
        <CitationBadge
          citationNumber={1}
          documentName="Document2.pdf"
          documentId="doc_1"
        />
      );

      // Should call context function again
      expect(mockIsDocumentValid.mock.calls.length).toBeGreaterThan(callCount);
    });

    it('should re-render when className changes', () => {
      const mockIsDocumentValid = vi.fn(() => true);

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: mockIsDocumentValid,
        isLoading: false,
      });

      const { rerender } = render(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_1"
        />
      );

      const callCount = mockIsDocumentValid.mock.calls.length;

      // Change className
      rerender(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_1"
          className="custom-class"
        />
      );

      // Should call context function again
      expect(mockIsDocumentValid.mock.calls.length).toBeGreaterThan(callCount);
      expect(screen.getByRole('note')).toHaveClass('custom-class');
    });
  });

  describe('Visual States', () => {
    it('should render with primary colors when document exists', () => {
      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      render(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_1"
        />
      );

      const badge = screen.getByRole('note');
      expect(badge).toHaveClass('bg-primary/10');
      expect(badge).toHaveClass('text-primary');
      expect(badge).toHaveClass('border-primary/20');
    });

    it('should render with muted colors when document does not exist', () => {
      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => false,
        isLoading: false,
      });

      render(
        <CitationBadge
          citationNumber={1}
          documentName="DeletedDoc.pdf"
          documentId="doc_deleted"
        />
      );

      const badge = screen.getByRole('note');
      expect(badge).toHaveClass('bg-muted');
      expect(badge).toHaveClass('text-muted-foreground');
      expect(badge).toHaveClass('border-border');
    });

    it('should have proper ARIA label', () => {
      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      render(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_1"
        />
      );

      const badge = screen.getByRole('note');
      expect(badge).toHaveAttribute(
        'aria-label',
        'Citation 1: Document1.pdf'
      );
    });

    it('should be keyboard accessible', () => {
      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      render(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_1"
        />
      );

      const badge = screen.getByRole('note');
      expect(badge).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Custom Comparison Function', () => {
    it('should use custom comparison to prevent unnecessary re-renders', () => {
      const mockIsDocumentValid = vi.fn(() => true);

      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: mockIsDocumentValid,
        isLoading: false,
      });

      const { rerender } = render(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_1"
        />
      );

      const callCount = mockIsDocumentValid.mock.calls.length;

      // Rerender with identical props (but different object references)
      rerender(
        <CitationBadge
          citationNumber={1}
          documentName="Document1.pdf"
          documentId="doc_1"
        />
      );

      // Should NOT re-render (custom comparison returns true)
      expect(mockIsDocumentValid.mock.calls.length).toBe(callCount);
    });
  });

  describe('Edge Cases', () => {
    it('should handle citation number 0', () => {
      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      render(
        <CitationBadge
          citationNumber={0}
          documentName="Document.pdf"
          documentId="doc_1"
        />
      );

      expect(screen.getByRole('note')).toHaveTextContent('0');
    });

    it('should handle large citation numbers', () => {
      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      render(
        <CitationBadge
          citationNumber={999}
          documentName="Document.pdf"
          documentId="doc_1"
        />
      );

      expect(screen.getByRole('note')).toHaveTextContent('999');
    });

    it('should handle long document names', () => {
      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      const longName =
        'Very_Long_Document_Name_That_Could_Potentially_Overflow.pdf';

      render(
        <CitationBadge
          citationNumber={1}
          documentName={longName}
          documentId="doc_1"
        />
      );

      const badge = screen.getByRole('note');
      expect(badge).toHaveAttribute('aria-label', `Citation 1: ${longName}`);
    });

    it('should handle special characters in document name', () => {
      vi.mocked(useCitationContext).mockReturnValue({
        studyId: 'study_123',
        isDocumentValid: () => true,
        isLoading: false,
      });

      const specialName = 'Document (with) [brackets] & symbols.pdf';

      render(
        <CitationBadge
          citationNumber={1}
          documentName={specialName}
          documentId="doc_1"
        />
      );

      const badge = screen.getByRole('note');
      expect(badge).toHaveAttribute(
        'aria-label',
        `Citation 1: ${specialName}`
      );
    });
  });
});
