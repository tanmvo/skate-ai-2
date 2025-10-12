import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { useCitationParsing } from '@/lib/hooks/useCitationParsing';
import { useCitationContext } from '@/lib/contexts/CitationContext';
import { CitationMap } from '@/lib/types/citations';
import React from 'react';

// Mock dependencies
vi.mock('@/lib/hooks/useCitationParsing', () => ({
  useCitationParsing: vi.fn(),
}));

vi.mock('@/lib/contexts/CitationContext', () => ({
  useCitationContext: vi.fn(),
}));

describe('MarkdownRenderer - Hook Integration', () => {
  const mockCitations: CitationMap = {
    '1': { documentId: 'doc_1', documentName: 'Document1.pdf' },
    '2': { documentId: 'doc_2', documentName: 'Document2.pdf' },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for CitationContext
    vi.mocked(useCitationContext).mockReturnValue({
      studyId: 'study_123',
      isDocumentValid: () => true,
      isLoading: false,
    });
  });

  describe('Hook Usage', () => {
    it('should use useCitationParsing hook with database citations', () => {
      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: new Map([
          ['Document1.pdf', { citationNumber: 1, documentId: 'doc_1' }],
          ['Document2.pdf', { citationNumber: 2, documentId: 'doc_2' }],
        ]),
        remarkPlugin: null,
        hasCitations: true,
      });

      render(
        <MarkdownRenderer
          content="Test content with ^[Document1.pdf]"
          citations={mockCitations}
        />
      );

      // Verify hook was called with database citations
      expect(useCitationParsing).toHaveBeenCalledWith(mockCitations);
    });

    it('should use useCitationParsing hook with streaming citations', () => {
      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: new Map(),
        remarkPlugin: null,
        hasCitations: false,
      });

      const contentWithCitation = 'Test content with ^[Document1.pdf]';
      render(<MarkdownRenderer content={contentWithCitation} />);

      // Verify hook was called (with parsed streaming citations)
      expect(useCitationParsing).toHaveBeenCalled();
    });

    it('should use useCitationParsing hook with no citations', () => {
      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: new Map(),
        remarkPlugin: null,
        hasCitations: false,
      });

      render(<MarkdownRenderer content="Plain text" />);

      // Verify hook was called with empty map
      expect(useCitationParsing).toHaveBeenCalled();
      const callArg = vi.mocked(useCitationParsing).mock.calls[0][0];
      expect(Object.keys(callArg).length).toBe(0);
    });
  });

  describe('Citation Rendering', () => {
    it('should render citations when hasCitations is true', () => {
      const mockLookup = new Map([
        ['Document1.pdf', { citationNumber: 1, documentId: 'doc_1' }],
      ]);

      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: mockLookup,
        remarkPlugin: null,
        hasCitations: true,
      });

      render(
        <MarkdownRenderer
          content="Test content"
          citations={mockCitations}
        />
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should not render citation components when hasCitations is false', () => {
      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: new Map(),
        remarkPlugin: null,
        hasCitations: false,
      });

      render(<MarkdownRenderer content="Plain text" />);

      expect(screen.getByText('Plain text')).toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('should memoize component when content and citations are unchanged', () => {
      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: new Map(),
        remarkPlugin: null,
        hasCitations: false,
      });

      const { rerender } = render(
        <MarkdownRenderer content="Test" citations={mockCitations} />
      );

      const callCount = vi.mocked(useCitationParsing).mock.calls.length;

      // Rerender with same props
      rerender(<MarkdownRenderer content="Test" citations={mockCitations} />);

      // Should not call hook again (memoized)
      expect(vi.mocked(useCitationParsing).mock.calls.length).toBe(callCount);
    });

    it('should recompute when content changes', () => {
      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: new Map(),
        remarkPlugin: null,
        hasCitations: false,
      });

      const { rerender } = render(<MarkdownRenderer content="Test 1" />);

      const callCount = vi.mocked(useCitationParsing).mock.calls.length;

      // Change content
      rerender(<MarkdownRenderer content="Test 2" />);

      // Should call hook again
      expect(vi.mocked(useCitationParsing).mock.calls.length).toBeGreaterThan(
        callCount
      );
    });

    it('should recompute when citations change', () => {
      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: new Map(),
        remarkPlugin: null,
        hasCitations: false,
      });

      const { rerender } = render(
        <MarkdownRenderer content="Test" citations={mockCitations} />
      );

      const callCount = vi.mocked(useCitationParsing).mock.calls.length;

      // Change citations
      const newCitations: CitationMap = {
        '1': { documentId: 'doc_new', documentName: 'NewDoc.pdf' },
      };
      rerender(<MarkdownRenderer content="Test" citations={newCitations} />);

      // Should call hook again
      expect(vi.mocked(useCitationParsing).mock.calls.length).toBeGreaterThan(
        callCount
      );
    });
  });

  describe('Database vs Streaming Citations', () => {
    it('should prefer database citations over streaming', () => {
      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: new Map(),
        remarkPlugin: null,
        hasCitations: false,
      });

      render(
        <MarkdownRenderer
          content="Content with ^[Streaming.pdf]"
          citations={mockCitations}
        />
      );

      // Verify hook received database citations (not parsed streaming)
      const callArg = vi.mocked(useCitationParsing).mock.calls[0][0];
      expect(callArg).toEqual(mockCitations);
    });

    it('should fallback to streaming citations when no database citations', () => {
      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: new Map(),
        remarkPlugin: null,
        hasCitations: false,
      });

      render(<MarkdownRenderer content="Content with ^[Streaming.pdf]" />);

      // Verify hook received parsed streaming citations
      const callArg = vi.mocked(useCitationParsing).mock.calls[0][0];
      expect(callArg).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty citations object', () => {
      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: new Map(),
        remarkPlugin: null,
        hasCitations: false,
      });

      render(<MarkdownRenderer content="Test" citations={{}} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should handle undefined citations', () => {
      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: new Map(),
        remarkPlugin: null,
        hasCitations: false,
      });

      render(<MarkdownRenderer content="Test" />);

      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should handle empty content', () => {
      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: new Map(),
        remarkPlugin: null,
        hasCitations: false,
      });

      render(<MarkdownRenderer content="" citations={mockCitations} />);

      // Should not crash
      expect(document.querySelector('.prose')).toBeInTheDocument();
    });
  });

  describe('Markdown Rendering', () => {
    it('should render basic markdown elements', () => {
      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: new Map(),
        remarkPlugin: null,
        hasCitations: false,
      });

      const { container } = render(<MarkdownRenderer content="# Header\n\n**Bold** text" />);

      // Check for header element
      const header = container.querySelector('h1');
      expect(header).toBeInTheDocument();
      expect(header?.textContent).toContain('Header');

      // Check for bold element
      const bold = container.querySelector('strong');
      expect(bold).toBeInTheDocument();
      expect(bold?.textContent).toBe('Bold');
    });

    it('should apply custom className', () => {
      vi.mocked(useCitationParsing).mockReturnValue({
        citationLookup: new Map(),
        remarkPlugin: null,
        hasCitations: false,
      });

      const { container } = render(
        <MarkdownRenderer content="Test" className="custom-class" />
      );

      const proseDiv = container.querySelector('.prose');
      expect(proseDiv).toHaveClass('custom-class');
    });
  });
});
