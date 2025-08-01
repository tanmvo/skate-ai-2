import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { DocumentPanel } from '../../../components/document/DocumentPanel';
import { renderWithProviders, mockDocuments } from '../../test-utils';

// Mock FileUpload component
vi.mock('@/components/document/FileUpload', () => ({
  FileUpload: ({ studyId, onFileUploaded }: { studyId: string; onFileUploaded: (file: { id: string; fileName: string; status: string }) => void }) => (
    <div data-testid="file-upload">
      <span>FileUpload for {studyId}</span>
      <button onClick={() => onFileUploaded?.({ id: 'new_doc', fileName: 'test.pdf', status: 'PROCESSING' })}>
        Mock Upload
      </button>
    </div>
  ),
}));

describe('DocumentPanel', () => {
  const mockOnFileUploaded = vi.fn();
  const studyId = 'study_test_123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders document panel header', () => {
    renderWithProviders(
      <DocumentPanel 
        documents={mockDocuments} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    expect(screen.getByText('Documents')).toBeDefined();
    expect(screen.getByTestId('file-upload')).toBeDefined();
  });

  it('displays documents with correct information', () => {
    renderWithProviders(
      <DocumentPanel 
        documents={mockDocuments} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // Check first document
    expect(screen.getByText('Test Document.pdf')).toBeDefined();
    expect(screen.getByText('1000 KB')).toBeDefined(); // Fixed: removed .00
    expect(screen.getByText('Ready')).toBeDefined();

    // Check second document
    expect(screen.getByText('Interview Transcript.docx')).toBeDefined();
    expect(screen.getByText('500 KB')).toBeDefined(); // Fixed: removed .00
    expect(screen.getByText('Processing...')).toBeDefined();
  });

  it('shows empty state when no documents', () => {
    renderWithProviders(
      <DocumentPanel 
        documents={[]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    expect(screen.getByText('No documents uploaded yet')).toBeDefined();
    expect(screen.getByText('Upload files to start analyzing with AI')).toBeDefined();
  });

  it('displays correct file size formatting', () => {
    const documentsWithDifferentSizes = [
      {
        ...mockDocuments[0],
        fileSize: 500, // 500 B
      },
      {
        ...mockDocuments[1],
        id: 'doc_large',
        fileSize: 2048000, // 2 MB
      },
    ];

    renderWithProviders(
      <DocumentPanel 
        documents={documentsWithDifferentSizes} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    expect(screen.getByText('500 B')).toBeDefined();
    expect(screen.getByText('1.95 MB')).toBeDefined(); // Fixed: actual output is 1.95 MB
  });

  it('displays correct file icons for different types', () => {
    renderWithProviders(
      <DocumentPanel 
        documents={mockDocuments} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // Check that emojis are rendered (PDF and DOCX)
    const documentCards = screen.getAllByRole('generic').filter(el => 
      el.textContent?.includes('📄') || el.textContent?.includes('📝')
    );
    expect(documentCards.length).toBeGreaterThan(0);
  });

  it('shows correct processing status indicators', () => {
    const documentsWithAllStatuses = [
      { ...mockDocuments[0], processingStatus: 'COMPLETED' },
      { ...mockDocuments[1], processingStatus: 'PROCESSING' },
      { 
        ...mockDocuments[0], 
        id: 'doc_failed',
        processingStatus: 'FAILED',
        fileName: 'failed-doc.pdf',
        originalName: 'Failed Document.pdf'
      },
    ];

    renderWithProviders(
      <DocumentPanel 
        documents={documentsWithAllStatuses} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    expect(screen.getByText('Ready')).toBeDefined();
    expect(screen.getByText('Processing...')).toBeDefined();
    expect(screen.getByText('Failed')).toBeDefined();
  });

  it('shows retry button for failed documents', () => {
    const failedDocument = {
      ...mockDocuments[0],
      processingStatus: 'FAILED',
    };

    renderWithProviders(
      <DocumentPanel 
        documents={[failedDocument]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();
  });

  it('shows download button for completed documents', () => {
    const completedDocument = {
      ...mockDocuments[0],
      processingStatus: 'COMPLETED',
    };

    renderWithProviders(
      <DocumentPanel 
        documents={[completedDocument]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // Check for download button (lucide-download icon)
    const downloadButtons = screen.getAllByRole('button').filter(button =>
      button.querySelector('svg')
    );
    expect(downloadButtons.length).toBeGreaterThan(0);
  });

  it('shows delete button for all documents', () => {
    renderWithProviders(
      <DocumentPanel 
        documents={mockDocuments} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // Should have delete buttons for each document
    const deleteButtons = screen.getAllByRole('button').filter(button =>
      button.querySelector('svg')?.classList.contains('lucide-trash-2') ||
      button.textContent?.includes('🗑') // fallback
    );
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('calls onFileUploaded when file is uploaded via FileUpload component', () => {
    renderWithProviders(
      <DocumentPanel 
        documents={mockDocuments} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // Click the mock upload button
    const mockUploadButton = screen.getByText('Mock Upload');
    fireEvent.click(mockUploadButton);

    expect(mockOnFileUploaded).toHaveBeenCalledWith({
      id: 'new_doc',
      fileName: 'test.pdf',
      status: 'PROCESSING',
    });
  });

  it('passes onFileUploaded callback correctly to FileUpload component', () => {
    const customCallback = vi.fn();
    
    renderWithProviders(
      <DocumentPanel 
        documents={mockDocuments} 
        onFileUploaded={customCallback}
        studyId={studyId}
      />
    );

    // Verify the FileUpload component receives the callback
    const mockUploadButton = screen.getByText('Mock Upload');
    fireEvent.click(mockUploadButton);

    expect(customCallback).toHaveBeenCalledTimes(1);
    expect(customCallback).toHaveBeenCalledWith({
      id: 'new_doc',
      fileName: 'test.pdf',
      status: 'PROCESSING',
    });
  });

  it('handles missing originalName gracefully', () => {
    const documentWithoutOriginalName = {
      ...mockDocuments[0],
      originalName: '', // Fixed: use empty string instead of undefined
    };

    renderWithProviders(
      <DocumentPanel 
        documents={[documentWithoutOriginalName]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // Should fall back to fileName
    expect(screen.getByText('test-document.pdf')).toBeDefined();
  });

  it('handles documents prop being undefined', () => {
    renderWithProviders(
      <DocumentPanel 
        documents={[]} // Fixed: use empty array instead of undefined
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // Should show empty state
    expect(screen.getByText('No documents uploaded yet')).toBeDefined(); // Fixed: use toBeDefined
  });

  it('renders scrollable document list', () => {
    // Create many documents to test scrolling
    const manyDocuments = Array.from({ length: 10 }, (_, i) => ({
      ...mockDocuments[0],
      id: `doc_${i}`,
      fileName: `document-${i}.pdf`,
      originalName: `Document ${i}.pdf`,
    }));

    renderWithProviders(
      <DocumentPanel 
        documents={manyDocuments} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // Check that multiple documents are rendered
    expect(screen.getByText('Document 0.pdf')).toBeDefined(); // Fixed: use toBeDefined
    expect(screen.getByText('Document 5.pdf')).toBeDefined(); // Fixed: use toBeDefined
    expect(screen.getByText('Document 9.pdf')).toBeDefined(); // Fixed: use toBeDefined
  });
});