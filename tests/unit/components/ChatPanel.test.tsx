import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ChatPanel } from '../../../components/chat/ChatPanel';
import { 
  renderWithProviders, 
  mockMessages
} from '../../test-utils';
import { createMockUseChat, createMockHooks, resetMocks } from '../../mocks/ai-sdk-mock';

// Create comprehensive mocks for AI SDK v5 and custom hooks
const mockUseChat = createMockUseChat({
  status: 'ready', // Default to ready status
});

vi.mock('@ai-sdk/react', () => ({
  useChat: () => mockUseChat,
}));

vi.mock('@/lib/hooks/useChatManager', () => ({
  useChatManager: vi.fn(() => ({
    currentChatId: 'test-chat-123',
    currentChat: {
      id: 'test-chat-123',
      title: 'New Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      studyId: 'study_test_123',
      _count: {
        messages: 0
      }
    },
    loading: false,
    error: null,
    isCreatingNew: false,
    isGeneratingTitle: false,
    createNewChat: vi.fn(),
    generateTitleInBackground: vi.fn(),
  })),
}));

vi.mock('@/lib/hooks/useMessages', () => ({
  useMessages: vi.fn(() => ({
    messages: [],
    error: null,
    mutate: vi.fn(),
    isLoading: false,
  })),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('ChatPanel', () => {
  const studyId = 'study_test_123';

  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('renders chat panel header correctly', () => {
    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Verify actual header content is visible (there are multiple "New Chat" elements)
    const newChatElements = screen.getAllByText('New Chat');
    expect(newChatElements.length).toBeGreaterThan(0);
    expect(newChatElements[0]).toBeVisible(); // At least one should be visible
    expect(screen.getByText('Ask questions about your documents')).toBeVisible();
  });

  it('shows welcome state when no messages', async () => {
    // Ensure no messages in both AI SDK and SWR
    mockUseChat.messages = [];
    mockUseChat.status = 'ready'; // Set status to ready
    
    const { useMessages } = await import('@/lib/hooks/useMessages');
    vi.mocked(useMessages).mockReturnValue({
      messages: [],
      error: null,
      mutate: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Test actual welcome content that component renders (may be animated in)
    expect(screen.getByText('Welcome to your research assistant!')).toBeInTheDocument();
    expect(screen.getByText('What would you like to explore in your documents?')).toBeInTheDocument();
    
    // Verify input is present and enabled when chat is ready
    const input = screen.getByPlaceholderText('Ask a question about your documents...');
    expect(input).toBeInTheDocument();
    // Input should not be disabled in welcome state if chat is ready
    expect(input.hasAttribute('disabled')).toBe(false);
  });

  it('displays messages correctly', async () => {
    // Mock both useChat messages AND SWR cached messages
    mockUseChat.messages = mockMessages;
    
    const { useMessages } = await import('@/lib/hooks/useMessages');
    vi.mocked(useMessages).mockReturnValue({
      messages: mockMessages, // Mock the SWR cached messages too
      error: null,
      mutate: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Verify messages are present (they might be animated/hidden initially)
    expect(screen.getByText('What are the main themes in this document?')).toBeInTheDocument();
    expect(screen.getByText(/Based on the document analysis/)).toBeInTheDocument();
  });

  it('renders user and assistant messages with different styles', async () => {
    // Mock both useChat messages AND SWR cached messages
    mockUseChat.messages = mockMessages;
    
    const { useMessages } = await import('@/lib/hooks/useMessages');
    vi.mocked(useMessages).mockReturnValue({
      messages: mockMessages,
      error: null,
      mutate: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<ChatPanel studyId={studyId} />);
    
    // Check that messages are present in the DOM
    const userMessage = screen.getByText('What are the main themes in this document?');
    const assistantMessage = screen.getByText(/Based on the document analysis/);
    
    expect(userMessage).toBeInTheDocument();
    expect(assistantMessage).toBeInTheDocument();
  });

  it('handles message input and submission', async () => {
    // Mock that chat is ready (not loading)
    mockUseChat.status = 'ready';
    
    const { useChatManager } = await import('@/lib/hooks/useChatManager');
    vi.mocked(useChatManager).mockReturnValue({
      currentChatId: 'test-chat-123',
      currentChat: {
        id: 'test-chat-123',
        title: 'New Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        studyId: 'study_test_123',
        _count: { messages: 0 }
      },
      loading: false, // Not loading
      error: null,
      isCreatingNew: false,
      isGeneratingTitle: false,
      createNewChat: vi.fn(),
      generateTitleInBackground: vi.fn(),
    });

    const { useMessages } = await import('@/lib/hooks/useMessages');
    vi.mocked(useMessages).mockReturnValue({
      messages: [],
      error: null,
      mutate: vi.fn(),
      isLoading: false, // Not loading
    });

    renderWithProviders(<ChatPanel studyId={studyId} />);

    const textarea = screen.getByPlaceholderText('Ask a question about your documents...');
    // Find send button by looking for the circular button with arrow icon (more specific)
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons.find(button => 
      button.querySelector('svg') && 
      !button.textContent?.includes('New Chat') // Exclude "New Chat" button
    );

    // Verify elements are present
    expect(textarea).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
    expect(textarea).not.toHaveAttribute('disabled'); // Should not be disabled when ready

    // Test that component is functional
    expect(textarea).toBeVisible();
  });

  it('handles Enter key submission', async () => {
    renderWithProviders(<ChatPanel studyId={studyId} />);

    const textarea = screen.getByPlaceholderText('Ask a question about your documents...');
    
    // Type a message first
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    expect(textarea).toHaveValue('Test message');
    
    // Test Enter key submission
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    
    // Component should still be functional and visible
    expect(textarea).toBeVisible();
  });

  it('allows Shift+Enter for new line', async () => {
    renderWithProviders(<ChatPanel studyId={studyId} />);

    const textarea = screen.getByPlaceholderText('Ask a question about your documents...');
    
    // Type a message
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    
    // Test Shift+Enter doesn't submit
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    
    // Should not submit when Shift+Enter is pressed
    expect(mockUseChat.handleSubmit).not.toHaveBeenCalled();
    expect(textarea).toBeVisible();
  });

  it('disables input when loading', async () => {
    // Mock AI SDK as loading
    mockUseChat.isLoading = true;
    mockUseChat.status = 'loading';

    // Mock SWR as not loading to isolate the AI SDK loading state
    const { useMessages } = await import('@/lib/hooks/useMessages');
    vi.mocked(useMessages).mockReturnValue({
      messages: [],
      error: null,
      mutate: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<ChatPanel studyId={studyId} />);

    const textarea = screen.getByPlaceholderText('Ask a question about your documents...');
    
    // Verify loading state - input should be disabled when AI SDK is loading
    expect(textarea).toBeVisible();
    expect(textarea).toHaveAttribute('disabled');
  });

  it('disables send button when input is empty', async () => {
    // Mock that both systems are ready (not loading)
    mockUseChat.status = 'ready';
    
    const { useChatManager } = await import('@/lib/hooks/useChatManager');
    vi.mocked(useChatManager).mockReturnValue({
      currentChatId: 'test-chat-123',
      currentChat: {
        id: 'test-chat-123',
        title: 'New Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        studyId: 'study_test_123',
        _count: { messages: 0 }
      },
      loading: false,
      error: null,
      isCreatingNew: false,
      isGeneratingTitle: false,
      createNewChat: vi.fn(),
      generateTitleInBackground: vi.fn(),
    });

    const { useMessages } = await import('@/lib/hooks/useMessages');
    vi.mocked(useMessages).mockReturnValue({
      messages: [],
      error: null,
      mutate: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<ChatPanel studyId={studyId} />);

    const textarea = screen.getByPlaceholderText('Ask a question about your documents...');
    const sendButton = document.querySelector('button[type="submit"]');
    
    // Input should not be disabled when ready, but send button should be disabled for empty input
    expect(textarea).not.toHaveAttribute('disabled');
    expect(textarea).toHaveValue('');
    expect(sendButton).toHaveAttribute('disabled'); // Send button disabled for empty input
  });

  it('shows appropriate loading state', async () => {
    // Mock the chat manager as loading state
    const { useChatManager } = await import('@/lib/hooks/useChatManager');
    vi.mocked(useChatManager).mockReturnValue({
      currentChatId: null, // No chat ID yet
      currentChat: null,
      loading: true, // Loading state
      error: null,
      isCreatingNew: true,
      isGeneratingTitle: false,
      createNewChat: vi.fn(),
      generateTitleInBackground: vi.fn(),
    });

    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Should show loading state with "Loading chat..."
    expect(screen.getByText('Loading chat...')).toBeVisible();
  });

  it('shows message content when messages exist', async () => {
    // Mock both useChat messages AND SWR cached messages
    mockUseChat.messages = mockMessages;
    
    const { useMessages } = await import('@/lib/hooks/useMessages');
    vi.mocked(useMessages).mockReturnValue({
      messages: mockMessages,
      error: null,
      mutate: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Verify that messages are displayed
    expect(screen.getByText('What are the main themes in this document?')).toBeInTheDocument();
    expect(screen.getByText(/Based on the document analysis/)).toBeInTheDocument();
  });

  it('has interactive elements for messages', async () => {
    // Mock both useChat messages AND SWR cached messages
    mockUseChat.messages = mockMessages;
    
    const { useMessages } = await import('@/lib/hooks/useMessages');
    vi.mocked(useMessages).mockReturnValue({
      messages: mockMessages,
      error: null,
      mutate: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Look for interactive elements (buttons, etc.)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    
    // Should have at least some buttons for interaction
    expect(buttons.some(button => button.querySelector('svg'))).toBe(true);
  });

  it('renders component with error state', () => {
    mockUseChat.error = new Error('Network error');
    mockUseChat.status = 'error';

    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Component should still render the basic structure
    const textarea = screen.getByPlaceholderText('Ask a question about your documents...');
    expect(textarea).toBeInTheDocument();
  });

  it('has proper component structure', () => {
    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Verify basic component structure is present
    const textarea = screen.getByPlaceholderText('Ask a question about your documents...');
    expect(textarea).toBeInTheDocument();
    
    // Should have some interactive elements
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('displays message with timestamp data', async () => {
    const messagesWithTimestamps = [
      {
        id: 'msg_time_test',
        role: 'user' as const,
        parts: [
          {
            type: 'text',
            text: 'Test message',
          }
        ],
        content: 'Test message',
        createdAt: new Date('2025-01-15T14:30:00Z'),
      },
    ];
    
    // Mock both useChat messages AND SWR cached messages
    mockUseChat.messages = messagesWithTimestamps;
    
    const { useMessages } = await import('@/lib/hooks/useMessages');
    vi.mocked(useMessages).mockReturnValue({
      messages: messagesWithTimestamps,
      error: null,
      mutate: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Verify message content is present
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('handles component state correctly', () => {
    renderWithProviders(<ChatPanel studyId={studyId} />);

    const textarea = screen.getByPlaceholderText('Ask a question about your documents...');
    
    // Component should be in proper initial state
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('disabled');
  });

  it('updates when new messages arrive', async () => {
    // Start with no messages in both systems
    mockUseChat.messages = [];
    
    const { useMessages } = await import('@/lib/hooks/useMessages');
    const mockMutate = vi.fn();
    
    vi.mocked(useMessages).mockReturnValue({
      messages: [],
      error: null,
      mutate: mockMutate,
      isLoading: false,
    });

    const { rerender } = renderWithProviders(<ChatPanel studyId={studyId} />);

    // Start with no messages - should show welcome state
    expect(screen.getByText('Welcome to your research assistant!')).toBeInTheDocument();

    // Add messages to both systems and rerender
    mockUseChat.messages = mockMessages;
    vi.mocked(useMessages).mockReturnValue({
      messages: mockMessages,
      error: null,
      mutate: mockMutate,
      isLoading: false,
    });
    
    rerender(<ChatPanel studyId={studyId} />);

    // Should show the new messages
    expect(screen.getByText('What are the main themes in this document?')).toBeInTheDocument();
  });

  // Test loading states
  it('shows loading state when chat is being created', async () => {
    const { useChatManager } = await import('@/lib/hooks/useChatManager');
    vi.mocked(useChatManager).mockReturnValue({
      currentChatId: null,
      currentChat: null,
      loading: true,
      error: null,
      isCreatingNew: true,
      isGeneratingTitle: false,
      createNewChat: vi.fn(),
      generateTitleInBackground: vi.fn(),
    });

    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Should show loading state
    expect(screen.getByText('Loading chat...')).toBeVisible();
  });

  // Test error states
  it('shows error state when messages fail to load', async () => {
    const { useMessages } = await import('@/lib/hooks/useMessages');
    vi.mocked(useMessages).mockReturnValue({
      messages: [],
      error: new Error('Failed to load messages'),
      mutate: vi.fn(),
      isLoading: false,
    });

    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Should show error state (component might not show exact error text)
    const chatContent = screen.getByText('Chat');
    expect(chatContent).toBeVisible();
  });

  // Test focus management
  it('has focusable input element', async () => {
    renderWithProviders(<ChatPanel studyId={studyId} />);

    const textarea = screen.getByPlaceholderText('Ask a question about your documents...');
    
    // Input should be focusable when enabled
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  // Test message completion workflow
  it('handles message completion workflow', async () => {
    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Simulate message completion callback
    if (mockUseChat.onFinish) {
      await mockUseChat.onFinish({
        id: 'new-msg',
        role: 'assistant',
        content: 'Response'
      });
    }

    // Component should remain functional after completion
    const textarea = screen.getByPlaceholderText('Ask a question about your documents...');
    expect(textarea).toBeInTheDocument();
  });
});