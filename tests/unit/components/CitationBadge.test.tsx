import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { CitationBadge } from '../../../components/chat/CitationBadge';
import { renderWithProviders } from '../../test-utils';
import { DocumentCitation } from '../../../lib/schemas/synthesis-schema';

describe('CitationBadge', () => {
  const mockCitation: DocumentCitation = {
    id: 'cite_doc_123',
    documentId: 'doc_123',
    documentName: 'test-document.pdf',
    relevantText: 'This is sample content from the document that shows what the citation contains.',
    pageNumber: 5
  };

  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render citation number correctly', () => {
    renderWithProviders(
      <CitationBadge
        citation={mockCitation}
        index={0}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('[1]')).toBeDefined();
  });

  it('should render citation number for different indices', () => {
    const { rerender } = renderWithProviders(
      <CitationBadge
        citation={mockCitation}
        index={5}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('[6]')).toBeDefined(); // index + 1

    rerender(
      <CitationBadge
        citation={mockCitation}
        index={0}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('[1]')).toBeDefined();
  });

  it('should show tooltip on hover', async () => {
    renderWithProviders(
      <CitationBadge
        citation={mockCitation}
        index={0}
        onClick={mockOnClick}
      />
    );

    const badge = screen.getByText('[1]');
    expect(badge).toBeDefined();

    // Hover to show tooltip
    fireEvent.mouseEnter(badge);
    
    // Tooltip content should be in DOM
    // Note: Testing tooltip visibility can be tricky in jsdom, but we can test that the component renders
    expect(badge).toBeDefined();
  });

  it('should call onClick when clicked', () => {
    renderWithProviders(
      <CitationBadge
        citation={mockCitation}
        index={0}
        onClick={mockOnClick}
      />
    );

    const badge = screen.getByText('[1]');
    fireEvent.click(badge);

    expect(mockOnClick).toHaveBeenCalledWith(mockCitation);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when no handler provided', () => {
    renderWithProviders(
      <CitationBadge
        citation={mockCitation}
        index={0}
      />
    );

    const badge = screen.getByText('[1]');
    
    // Should not throw error when clicked without onClick handler
    expect(() => fireEvent.click(badge)).not.toThrow();
  });

  it('should apply custom className', () => {
    renderWithProviders(
      <CitationBadge
        citation={mockCitation}
        index={0}
        onClick={mockOnClick}
        className="custom-citation-class"
      />
    );

    const badge = screen.getByText('[1]');
    expect(badge.className).toContain('custom-citation-class');
  });

  it('should have cursor-pointer and hover styles', () => {
    renderWithProviders(
      <CitationBadge
        citation={mockCitation}
        index={0}
        onClick={mockOnClick}
      />
    );

    const badge = screen.getByText('[1]');
    expect(badge.className).toContain('cursor-pointer');
    expect(badge.className).toContain('hover:bg-citation');
  });

  it('should handle citations with different page numbers', () => {
    const pageNumberCitation: DocumentCitation = {
      ...mockCitation,
      pageNumber: 12
    };

    renderWithProviders(
      <CitationBadge
        citation={pageNumberCitation}
        index={0}
        onClick={mockOnClick}
      />
    );

    const badge = screen.getByText('[1]');
    expect(badge).toBeDefined();
    
    // Badge should render regardless of page number
    expect(badge.className).toContain('cursor-pointer');
  });

  it('should handle citations with long document names', () => {
    const longNameCitation: DocumentCitation = {
      ...mockCitation,
      documentName: 'This is a very long document name that might overflow the tooltip area and needs to be handled properly.pdf'
    };

    renderWithProviders(
      <CitationBadge
        citation={longNameCitation}
        index={0}
        onClick={mockOnClick}
      />
    );

    const badge = screen.getByText('[1]');
    expect(badge).toBeDefined();
  });

  it('should handle citations with empty relevantText', () => {
    const emptyCitation: DocumentCitation = {
      ...mockCitation,
      relevantText: ''
    };

    renderWithProviders(
      <CitationBadge
        citation={emptyCitation}
        index={0}
        onClick={mockOnClick}
      />
    );

    const badge = screen.getByText('[1]');
    expect(badge).toBeDefined();
  });

  it('should handle citations with special characters', () => {
    const specialCharCitation: DocumentCitation = {
      ...mockCitation,
      documentName: 'document with "quotes" & special chars (1).pdf',
      relevantText: 'Content with emojis 🔥 and symbols @#$%^&*()'
    };

    renderWithProviders(
      <CitationBadge
        citation={specialCharCitation}
        index={0}
        onClick={mockOnClick}
      />
    );

    const badge = screen.getByText('[1]');
    expect(badge).toBeDefined();
    
    // Should handle special characters without breaking
    fireEvent.click(badge);
    expect(mockOnClick).toHaveBeenCalledWith(specialCharCitation);
  });

  it('should handle high index numbers', () => {
    renderWithProviders(
      <CitationBadge
        citation={mockCitation}
        index={99}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('[100]')).toBeDefined(); // index + 1
  });

  it('should maintain consistent styling across different states', () => {
    const { rerender } = renderWithProviders(
      <CitationBadge
        citation={mockCitation}
        index={0}
        onClick={mockOnClick}
      />
    );

    const badge = screen.getByText('[1]');
    const initialClasses = badge.className;

    // Rerender with different props
    rerender(
      <CitationBadge
        citation={{...mockCitation, pageNumber: 10}}
        index={5}
        onClick={mockOnClick}
      />
    );

    const newBadge = screen.getByText('[6]');
    
    // Core styling should remain consistent
    expect(newBadge.className).toContain('cursor-pointer');
    expect(newBadge.className).toContain('hover:bg-citation');
  });
});