import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChatPanel } from '@/components/chat/ChatPanel';

// Mock all the hooks and dependencies
vi.mock('@/lib/hooks/useStudy', () => ({
  useStudy: vi.fn()
}));

vi.mock('@/lib/hooks/useDocuments', () => ({
  useDocuments: vi.fn()
}));

vi.mock('@/lib/hooks/useChatManager', () => ({
  useChatManager: vi.fn()
}));

vi.mock('@/lib/hooks/useMessages', () => ({
  useMessages: vi.fn()
}));

vi.mock('@/lib/hooks/useChatStream', () => ({
  useChatStream: vi.fn()
}));

vi.mock('@/lib/analytics/hooks/use-analytics', () => ({
  useAnalytics: vi.fn()
}));

import { useStudy } from '@/lib/hooks/useStudy';
import { useDocuments } from '@/lib/hooks/useDocuments';
import { useChatManager } from '@/lib/hooks/useChatManager';
import { useMessages } from '@/lib/hooks/useMessages';
import { useChatStream } from '@/lib/hooks/useChatStream';
import { useAnalytics } from '@/lib/analytics/hooks/use-analytics';

/**
 * ChatPanel Summary Feature Tests
 *
 * Tests the study summary behavior:
 * 1. No documents → Shows zero-state, disables chat
 * 2. Has documents but no summary → Shows loading state, enables chat
 * 3. Has summary → Shows summary message, enables chat
 * 4. Documents uploaded/removed → Summary regenerates automatically
 */
describe('ChatPanel - Summary Feature', () => {
  const mockStudyId = 'test-study-123';
  const mockOnCitationClick = vi.fn();

  // Default mock implementations
  const defaultMocks = {
    useStudy: {
      study: null,
      isLoading: false,
      error: null,
      updateStudy: vi.fn(),
      refreshStudy: vi.fn(),
      mutate: vi.fn(),
    },
    useDocuments: {
      documents: [],
      isLoading: false,
      error: null,
      deleteDocument: vi.fn(),
      mutate: vi.fn(),
    },
    useChatManager: {
      currentChatId: 'chat-123',
      currentChat: {
        id: 'chat-123',
        title: 'Test Chat',
        _count: { messages: 0 }
      },
      loading: false,
      error: null,
      isCreatingNew: false,
      isGeneratingTitle: false,
      createNewChat: vi.fn(),
      generateTitleInBackground: vi.fn(),
    },
    useMessages: {
      messages: [],
      error: null,
      mutate: vi.fn(),
      isLoading: false,
    },
    useChatStream: {
      messages: [],
      setMessages: vi.fn(),
      sendMessage: vi.fn(),
      status: 'ready',
      regenerate: vi.fn(),
    },
    useAnalytics: {
      trackMessageCopy: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(useStudy).mockReturnValue(defaultMocks.useStudy);
    vi.mocked(useDocuments).mockReturnValue(defaultMocks.useDocuments);
    vi.mocked(useChatManager).mockReturnValue(defaultMocks.useChatManager);
    vi.mocked(useMessages).mockReturnValue(defaultMocks.useMessages);
    vi.mocked(useChatStream).mockReturnValue(defaultMocks.useChatStream);
    vi.mocked(useAnalytics).mockReturnValue(defaultMocks.useAnalytics);
  });

  describe('Zero State - No Documents', () => {
    it('should show zero-state when no documents exist', () => {
      vi.mocked(useDocuments).mockReturnValue({
        ...defaultMocks.useDocuments,
        documents: [],
      });

      render(<ChatPanel studyId={mockStudyId} onCitationClick={mockOnCitationClick} />);

      // Should show upload prompt
      expect(screen.getByText('Upload documents to get started')).toBeInTheDocument();
      expect(screen.getByText(/Upload your research documents/i)).toBeInTheDocument();
    });

    it('should disable chat input when no documents exist', () => {
      vi.mocked(useDocuments).mockReturnValue({
        ...defaultMocks.useDocuments,
        documents: [],
      });

      render(<ChatPanel studyId={mockStudyId} onCitationClick={mockOnCitationClick} />);

      const textarea = screen.getByPlaceholderText(/Upload documents to start chatting/i);
      expect(textarea).toBeDisabled();
    });
  });

  describe('Loading State - Documents but No Summary', () => {
    it('should show loading message when documents exist but no summary yet', () => {
      vi.mocked(useDocuments).mockReturnValue({
        ...defaultMocks.useDocuments,
        documents: [
          { id: 'doc-1', fileName: 'test.pdf', status: 'READY' }
        ] as any,
      });

      vi.mocked(useStudy).mockReturnValue({
        ...defaultMocks.useStudy,
        study: {
          id: mockStudyId,
          name: 'Test Study',
          summary: null, // No summary yet
          documents: [],
          messages: [],
        } as any,
        isLoading: false, // Not loading, so we know summary truly doesn't exist
      });

      render(<ChatPanel studyId={mockStudyId} onCitationClick={mockOnCitationClick} />);

      // Should show loading message
      expect(screen.getByText('Generating study summary...')).toBeInTheDocument();
    });

    it('should enable chat input when documents exist (even without summary)', () => {
      vi.mocked(useDocuments).mockReturnValue({
        ...defaultMocks.useDocuments,
        documents: [
          { id: 'doc-1', fileName: 'test.pdf', status: 'READY' }
        ] as any,
      });

      vi.mocked(useStudy).mockReturnValue({
        ...defaultMocks.useStudy,
        study: {
          id: mockStudyId,
          name: 'Test Study',
          summary: null,
          documents: [],
          messages: [],
        } as any,
      });

      render(<ChatPanel studyId={mockStudyId} onCitationClick={mockOnCitationClick} />);

      const textarea = screen.getByPlaceholderText(/Ask a question about your documents/i);
      expect(textarea).not.toBeDisabled();
    });
  });

  describe('Summary Display', () => {
    it('should show summary when it exists', () => {
      const mockSummary = 'This study explores user research methodologies and key findings from 5 interviews.';

      vi.mocked(useDocuments).mockReturnValue({
        ...defaultMocks.useDocuments,
        documents: [
          { id: 'doc-1', fileName: 'test.pdf', status: 'READY' }
        ] as any,
      });

      vi.mocked(useStudy).mockReturnValue({
        ...defaultMocks.useStudy,
        study: {
          id: mockStudyId,
          name: 'Test Study',
          summary: mockSummary,
          documents: [],
          messages: [],
        } as any,
      });

      render(<ChatPanel studyId={mockStudyId} onCitationClick={mockOnCitationClick} />);

      // Should show the summary
      expect(screen.getByText(mockSummary)).toBeInTheDocument();
    });

    it('should not show loading message when summary exists', () => {
      vi.mocked(useDocuments).mockReturnValue({
        ...defaultMocks.useDocuments,
        documents: [
          { id: 'doc-1', fileName: 'test.pdf', status: 'READY' }
        ] as any,
      });

      vi.mocked(useStudy).mockReturnValue({
        ...defaultMocks.useStudy,
        study: {
          id: mockStudyId,
          name: 'Test Study',
          summary: 'Study summary here',
          documents: [],
          messages: [],
        } as any,
      });

      render(<ChatPanel studyId={mockStudyId} onCitationClick={mockOnCitationClick} />);

      // Should NOT show loading message
      expect(screen.queryByText('Generating study summary...')).not.toBeInTheDocument();
    });
  });

  describe('State Transitions', () => {
    it('should transition from zero-state to loading when documents are uploaded', async () => {
      const { rerender } = render(
        <ChatPanel studyId={mockStudyId} onCitationClick={mockOnCitationClick} />
      );

      // Initial: No documents
      expect(screen.getByText('Upload documents to get started')).toBeInTheDocument();

      // Simulate document upload - update the mock
      vi.mocked(useDocuments).mockReturnValue({
        ...defaultMocks.useDocuments,
        documents: [
          { id: 'doc-1', fileName: 'test.pdf', status: 'READY' }
        ] as any,
      });

      vi.mocked(useStudy).mockReturnValue({
        ...defaultMocks.useStudy,
        study: {
          id: mockStudyId,
          name: 'Test Study',
          summary: null, // No summary yet
          documents: [],
          messages: [],
        } as any,
        isLoading: false,
      });

      // Rerender to apply new state
      rerender(<ChatPanel studyId={mockStudyId} onCitationClick={mockOnCitationClick} />);

      // Should now show loading state
      expect(screen.getByText('Generating study summary...')).toBeInTheDocument();
      expect(screen.queryByText('Upload documents to get started')).not.toBeInTheDocument();
    });

    it('should transition from loading to summary display when generation completes', async () => {
      // Start with loading state
      vi.mocked(useDocuments).mockReturnValue({
        ...defaultMocks.useDocuments,
        documents: [
          { id: 'doc-1', fileName: 'test.pdf', status: 'READY' }
        ] as any,
      });

      vi.mocked(useStudy).mockReturnValue({
        ...defaultMocks.useStudy,
        study: {
          id: mockStudyId,
          name: 'Test Study',
          summary: null,
          documents: [],
          messages: [],
        } as any,
        isLoading: false,
      });

      const { rerender } = render(
        <ChatPanel studyId={mockStudyId} onCitationClick={mockOnCitationClick} />
      );

      expect(screen.getByText('Generating study summary...')).toBeInTheDocument();

      // Simulate summary generation completing
      const mockSummary = 'Study summary has been generated successfully.';
      vi.mocked(useStudy).mockReturnValue({
        ...defaultMocks.useStudy,
        study: {
          id: mockStudyId,
          name: 'Test Study',
          summary: mockSummary,
          documents: [],
          messages: [],
        } as any,
      });

      rerender(<ChatPanel studyId={mockStudyId} onCitationClick={mockOnCitationClick} />);

      // Should show summary, not loading
      expect(screen.getByText(mockSummary)).toBeInTheDocument();
      expect(screen.queryByText('Generating study summary...')).not.toBeInTheDocument();
    });

    it('should return to zero-state when all documents are deleted', () => {
      // Start with summary
      vi.mocked(useDocuments).mockReturnValue({
        ...defaultMocks.useDocuments,
        documents: [
          { id: 'doc-1', fileName: 'test.pdf', status: 'READY' }
        ] as any,
      });

      vi.mocked(useStudy).mockReturnValue({
        ...defaultMocks.useStudy,
        study: {
          id: mockStudyId,
          name: 'Test Study',
          summary: 'Study summary',
          documents: [],
          messages: [],
        } as any,
      });

      const { rerender } = render(
        <ChatPanel studyId={mockStudyId} onCitationClick={mockOnCitationClick} />
      );

      expect(screen.getByText('Study summary')).toBeInTheDocument();

      // Simulate all documents deleted
      vi.mocked(useDocuments).mockReturnValue({
        ...defaultMocks.useDocuments,
        documents: [],
      });

      vi.mocked(useStudy).mockReturnValue({
        ...defaultMocks.useStudy,
        study: {
          id: mockStudyId,
          name: 'Test Study',
          summary: null, // Summary deleted
          documents: [],
          messages: [],
        } as any,
      });

      rerender(<ChatPanel studyId={mockStudyId} onCitationClick={mockOnCitationClick} />);

      // Should return to zero-state
      expect(screen.getByText('Upload documents to get started')).toBeInTheDocument();
      expect(screen.queryByText('Study summary')).not.toBeInTheDocument();
    });
  });
});
