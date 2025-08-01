import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { DocumentPanel } from '../../components/document/DocumentPanel';
import { renderWithProviders, createMockFile, mockDocuments } from '../test-utils';

// Mock the file upload hook
const mockUploadFile = vi.fn();
const mockUseFileUpload = {
  uploadFile: mockUploadFile,
  uploads: new Map(),
  isUploading: false,
};

vi.mock('@/lib/hooks/useFileUpload', () => ({
  useFileUpload: () => mockUseFileUpload,
}));

// Mock react-dropzone with more realistic behavior
let mockOnDrop: any = null;
vi.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop, accept, disabled, multiple }: any) => {
    mockOnDrop = onDrop;
    return {
      getRootProps: () => ({
        onClick: vi.fn(),
        role: 'button',
        'data-testid': 'dropzone',
      }),
      getInputProps: () => ({
        type: 'file',
        accept: Object.keys(accept).join(','),
        multiple,
        disabled,
        'data-testid': 'file-input',
      }),
      isDragActive: false,
      isDragReject: false,
    };
  },
}));

describe('Document Upload Flow', () => {
  const studyId = 'study_test_123';
  const mockOnFileUploaded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFileUpload.uploads = new Map();
    mockUseFileUpload.isUploading = false;
    mockOnDrop = null;
  });

  it('completes full upload workflow for PDF file', async () => {
    const mockFile = createMockFile('research-paper.pdf', 'application/pdf', 2048000);
    const uploadResult = {
      id: 'doc_uploaded_123',
      fileName: 'research-paper.pdf',
      status: 'PROCESSING',
    };

    mockUploadFile.mockResolvedValueOnce(uploadResult);

    renderWithProviders(
      <DocumentPanel 
        documents={[]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // Should show empty state initially
    expect(screen.getByText('No documents uploaded yet')).toBeDefined();

    // Simulate file drop
    if (mockOnDrop) {
      await mockOnDrop([mockFile]);
    }

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(mockFile, studyId);
      expect(mockOnFileUploaded).toHaveBeenCalledWith(uploadResult);
    });
  });

  it('handles multiple file upload simultaneously', async () => {
    const files = [
      createMockFile('interview1.pdf', 'application/pdf'),
      createMockFile('interview2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      createMockFile('notes.txt', 'text/plain'),
    ];

    const uploadResults = [
      { id: 'doc1', fileName: 'interview1.pdf', status: 'PROCESSING' },
      { id: 'doc2', fileName: 'interview2.docx', status: 'PROCESSING' },
      { id: 'doc3', fileName: 'notes.txt', status: 'PROCESSING' },
    ];

    mockUploadFile
      .mockResolvedValueOnce(uploadResults[0])
      .mockResolvedValueOnce(uploadResults[1])
      .mockResolvedValueOnce(uploadResults[2]);

    renderWithProviders(
      <DocumentPanel 
        documents={[]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // Simulate multiple file drop
    if (mockOnDrop) {
      await mockOnDrop(files);
    }

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledTimes(3);
      expect(mockOnFileUploaded).toHaveBeenCalledTimes(3);
    });
  });

  it('shows upload progress during file processing', () => {
    mockUseFileUpload.isUploading = true;
    mockUseFileUpload.uploads = new Map([
      ['research.pdf', { fileName: 'research.pdf', progress: 65, status: 'uploading' }]
    ]);

    renderWithProviders(
      <DocumentPanel 
        documents={[]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    expect(screen.getByText('Uploading 1 file...')).toBeDefined();
    expect(screen.getByText('research.pdf: 65%')).toBeDefined();
  });

  it('transitions from uploading to processing to ready states', () => {
    const processingDoc = {
      ...mockDocuments[0],
      processingStatus: 'PROCESSING',
      fileName: 'test-doc.pdf',
      originalName: 'Test Document.pdf',
    };

    const { rerender } = renderWithProviders(
      <DocumentPanel 
        documents={[processingDoc]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // Should show processing state
    expect(screen.getByText('Processing...')).toBeDefined();

    // Update to completed state
    const completedDoc = { ...processingDoc, processingStatus: 'COMPLETED' };
    rerender(
      <DocumentPanel 
        documents={[completedDoc]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    expect(screen.getByText('Ready')).toBeDefined();
  });

  it('handles upload failure gracefully', async () => {
    const mockFile = createMockFile('bad-file.pdf', 'application/pdf');
    mockUploadFile.mockRejectedValueOnce(new Error('Upload failed: File too large'));

    renderWithProviders(
      <DocumentPanel 
        documents={[]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // Simulate failed upload
    if (mockOnDrop) {
      await mockOnDrop([mockFile]);
    }

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(mockFile, studyId);
      expect(mockOnFileUploaded).not.toHaveBeenCalled();
    });
  });

  it('shows failed document with retry option', () => {
    const failedDoc = {
      ...mockDocuments[0],
      processingStatus: 'FAILED',
      fileName: 'failed-doc.pdf',
      originalName: 'Failed Document.pdf',
    };

    renderWithProviders(
      <DocumentPanel 
        documents={[failedDoc]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    expect(screen.getByText('Failed')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();
  });

  it('displays correct file metadata after upload', () => {
    const uploadedDoc = {
      id: 'doc_metadata_test',
      fileName: 'large-research-file.pdf',
      originalName: 'Large Research File.pdf',
      mimeType: 'application/pdf',
      fileSize: 5242880, // 5MB
      processingStatus: 'COMPLETED',
      uploadedAt: '2025-01-15T10:30:00Z',
      studyId: studyId,
    };

    renderWithProviders(
      <DocumentPanel 
        documents={[uploadedDoc]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    expect(screen.getByText('Large Research File.pdf')).toBeDefined();
    expect(screen.getByText('5.00 MB')).toBeDefined();
    expect(screen.getByText('Ready')).toBeDefined();
  });

  it('supports different file types correctly', async () => {
    const mixedFiles = [
      createMockFile('document.pdf', 'application/pdf'),
      createMockFile('interview.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      createMockFile('transcript.txt', 'text/plain'),
    ];

    mockUploadFile
      .mockResolvedValueOnce({ id: 'pdf1', fileName: 'document.pdf', status: 'COMPLETED' })
      .mockResolvedValueOnce({ id: 'docx1', fileName: 'interview.docx', status: 'COMPLETED' })
      .mockResolvedValueOnce({ id: 'txt1', fileName: 'transcript.txt', status: 'COMPLETED' });

    renderWithProviders(
      <DocumentPanel 
        documents={[]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    if (mockOnDrop) {
      await mockOnDrop(mixedFiles);
    }

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledTimes(3);
      mixedFiles.forEach((file, index) => {
        expect(mockUploadFile).toHaveBeenNthCalledWith(index + 1, file, studyId);
      });
    });
  });

  it('prevents upload when already uploading', () => {
    mockUseFileUpload.isUploading = true;

    renderWithProviders(
      <DocumentPanel 
        documents={[]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // FileUpload component should be disabled
    const dropzone = screen.getByTestId('dropzone').closest('div');
    expect(dropzone).toHaveClass('cursor-not-allowed', 'opacity-50');
  });

  it('updates document list after successful upload', async () => {
    const existingDocs = [mockDocuments[0]];
    const newDoc = {
      id: 'doc_new_upload',
      fileName: 'newly-uploaded.pdf',
      originalName: 'Newly Uploaded.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024000,
      processingStatus: 'PROCESSING',
      uploadedAt: '2025-01-15T12:00:00Z',
      studyId: studyId,
    };

    const { rerender } = renderWithProviders(
      <DocumentPanel 
        documents={existingDocs} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // Initially shows one document
    expect(screen.getByText('Test Document.pdf')).toBeDefined();

    // After upload, shows both documents
    rerender(
      <DocumentPanel 
        documents={[...existingDocs, newDoc]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    expect(screen.getByText('Test Document.pdf')).toBeDefined();
    expect(screen.getByText('Newly Uploaded.pdf')).toBeDefined();
  });

  it('verifies upload callback is triggered for data refresh', async () => {
    const mockFile = createMockFile('callback-test.pdf', 'application/pdf', 1024000);
    const uploadResult = {
      id: 'doc_callback_test',
      fileName: 'callback-test.pdf',
      status: 'PROCESSING',
    };

    mockUploadFile.mockResolvedValueOnce(uploadResult);

    renderWithProviders(
      <DocumentPanel 
        documents={[]} 
        onFileUploaded={mockOnFileUploaded}
        studyId={studyId}
      />
    );

    // Simulate file upload
    if (mockOnDrop) {
      await mockOnDrop([mockFile]);
    }

    await waitFor(() => {
      // Verify upload was called
      expect(mockUploadFile).toHaveBeenCalledWith(mockFile, studyId);
      
      // Verify callback was triggered (this would trigger refreshStudy in the actual app)
      expect(mockOnFileUploaded).toHaveBeenCalledWith(uploadResult);
      expect(mockOnFileUploaded).toHaveBeenCalledTimes(1);
    });
  });
});