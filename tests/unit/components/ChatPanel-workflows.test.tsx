import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '../../../components/chat/ChatPanel';
import { renderWithProviders } from '../../test-utils';
import { useChatManager } from '@/lib/hooks/useChatManager';
import { useMessages } from '@/lib/hooks/useMessages';
import { useChat } from '@ai-sdk/react';
import { useStudy } from '@/lib/hooks/useStudy';
import { useDocuments } from '@/lib/hooks/useDocuments';

// Mock custom hooks
vi.mock('@/lib/hooks/useChatManager');
vi.mock('@/lib/hooks/useMessages');
vi.mock('@ai-sdk/react');
vi.mock('@/lib/hooks/useStudy');
vi.mock('@/lib/hooks/useDocuments');
vi.mock('@/lib/hooks/useChatStream', () => ({
  useChatStream: () => ({
    messages: [],
    setMessages: vi.fn(),
    sendMessage: vi.fn(),
    status: 'ready',
    regenerate: vi.fn(),
  })
}));
vi.mock('@/lib/analytics/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackMessageCopy: vi.fn(),
  })
}));

// Type the mocked functions
const mockUseChatManager = vi.mocked(useChatManager);
const mockUseMessages = vi.mocked(useMessages);
const mockUseChat = vi.mocked(useChat);
const mockUseStudy = vi.mocked(useStudy);
const mockUseDocuments = vi.mocked(useDocuments);

describe('ChatPanel User Workflows', () => {
  const studyId = 'study_test_123';
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default working state
    mockUseChatManager.mockReturnValue({
      chats: [],
      currentChatId: 'chat-123',
      currentChat: {
        id: 'chat-123',
        title: 'Test Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        studyId: studyId,
        userId: 'test-user',
        _count: { messages: 0 }
      },
      loading: false,
      error: null,
      isCreatingNew: false,
      isGeneratingTitle: false,
      titleGenerationChatId: null,
      createNewChat: vi.fn(),
      generateTitle: vi.fn(),
      generateTitleInBackground: vi.fn(),
      refetchChats: vi.fn(),
    });

    mockUseMessages.mockReturnValue({
      messages: [],
      error: null,
      mutate: vi.fn(),
      isLoading: false,
    });

    mockUseChat.mockReturnValue({
      id: 'chat-123',
      messages: [],
      setMessages: vi.fn(),
      sendMessage: vi.fn(),
      status: 'ready' as const,
      error: undefined,
      regenerate: vi.fn(),
      stop: vi.fn(),
      resumeStream: vi.fn(),
      addToolResult: vi.fn(),
      clearError: vi.fn(),
    });

    // Mock study and documents hooks
    mockUseStudy.mockReturnValue({
      study: {
        id: studyId,
        name: 'Test Study',
        summary: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'test-user',
        documents: [],
        messages: [],
        _count: {
          documents: 0,
          messages: 0,
        },
      },
      isLoading: false,
      error: null,
      updateStudy: vi.fn(),
      refreshStudy: vi.fn(),
      mutate: vi.fn(),
    });

    mockUseDocuments.mockReturnValue({
      documents: [
        {
          id: 'doc-1',
          fileName: 'test.pdf',
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          uploadedAt: new Date().toISOString(),
          processingStatus: 'READY',
          studyId: studyId,
        }
      ],
      isLoading: false,
      error: null,
      deleteDocument: vi.fn(),
      renameDocument: vi.fn(),
      refreshDocuments: vi.fn(),
      addDocument: vi.fn(),
      mutate: vi.fn(),
    });
  });

  describe('Message Sending Workflow', () => {
    it('should handle typing in input field', async () => {
      renderWithProviders(<ChatPanel studyId={studyId} />);

      const input = screen.getByPlaceholderText('Ask a question about your documents...');
      
      // User types a message
      await user.type(input, 'What are the themes?');
      expect(input).toHaveValue('What are the themes?');
    });

    it('should have submit button available', () => {
      renderWithProviders(<ChatPanel studyId={studyId} />);

      // Find submit button (the one with type="submit")
      const submitButton = document.querySelector('button[type="submit"]');
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Chat Creation Workflow', () => {
    it('should handle new chat creation', async () => {
      const mockCreateNewChat = vi.fn();
      
      mockUseChatManager.mockReturnValue({
        chats: [],
        currentChatId: 'chat-123',
        currentChat: {
          id: 'chat-123',
          title: 'Test Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
          studyId: studyId,
          userId: 'test-user',
          _count: { messages: 0 }
        },
        loading: false,
        error: null,
        isCreatingNew: false,
        isGeneratingTitle: false,
        titleGenerationChatId: null,
        createNewChat: mockCreateNewChat,
        generateTitle: vi.fn(),
        generateTitleInBackground: vi.fn(),
        refetchChats: vi.fn(),
      });

      renderWithProviders(<ChatPanel studyId={studyId} />);

      // Find and click new chat button
      const newChatButton = screen.getByText('New Chat');
      await user.click(newChatButton);

      expect(mockCreateNewChat).toHaveBeenCalled();
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle retry after error', async () => {
      const mockMutate = vi.fn();
      
      mockUseMessages.mockReturnValue({
        messages: [],
        error: new Error('Failed to load messages'),
        mutate: mockMutate,
        isLoading: false,
      });

      renderWithProviders(<ChatPanel studyId={studyId} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockMutate).toHaveBeenCalled();
    });
  });
});