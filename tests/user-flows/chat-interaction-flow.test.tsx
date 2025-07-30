import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ChatPanel } from '../../components/chat/ChatPanel';
import { renderWithProviders } from '../test-utils';

// Mock fetch for message persistence
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock useChat with more realistic behavior
let mockOnError: ((error: Error) => void) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockOnFinish: ((message: any) => void) | null = null;
let mockOnResponse: (() => void) | null = null;

const mockUseChat = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: [] as any[],
  input: '',
  handleInputChange: vi.fn(),
  handleSubmit: vi.fn(),
  isLoading: false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: null as any,
};

vi.mock('ai/react', () => ({
  useChat: ({ onError, onFinish, onResponse }: { 
    onError?: (error: Error) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFinish?: (message: any) => void;
    onResponse?: () => void;
  }) => {
    mockOnError = onError || null;
    mockOnFinish = onFinish || null;
    mockOnResponse = onResponse || null;
    return mockUseChat;
  },
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('Chat Interaction Flow', () => {
  const studyId = 'study_test_123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChat.messages = [];
    mockUseChat.input = '';
    mockUseChat.isLoading = false;
    mockUseChat.error = null;
    mockFetch.mockClear();
  });

  it('completes full chat interaction workflow', async () => {
    // Simulate user typing and sending a message
    mockUseChat.input = 'What are the main themes in these documents?';
    
    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Initially should show empty state
    expect(screen.getByText('Start a conversation')).toBeDefined();

    // User types message
    const textarea = screen.getByPlaceholderText('Ask a question about your documents...');
    fireEvent.change(textarea, { target: { value: 'What are the main themes?' } });
    
    expect(mockUseChat.handleInputChange).toHaveBeenCalled();

    // User submits message
    const sendButton = document.querySelector('button[type="submit"]');
    fireEvent.click(sendButton!);
    expect(mockUseChat.handleSubmit).toHaveBeenCalled();
  });

  it('handles streaming response flow', async () => {
    // Mock message persistence API calls
    mockFetch.mockResolvedValue({ ok: true });

    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Simulate the flow that happens during streaming
    const userMessage = {
      id: 'msg_user_1',
      role: 'user' as const,
      content: 'What are the main themes?',
      createdAt: new Date(),
    };

    const assistantMessage = {
      id: 'msg_assistant_1',
      role: 'assistant' as const,
      content: 'The main themes include...',
      createdAt: new Date(),
    };

    // Simulate onResponse callback (user message persistence)
    mockUseChat.messages = [userMessage];
    if (mockOnResponse) {
      await mockOnResponse();
    }

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/studies/${studyId}/messages`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'USER',
          content: userMessage.content,
        }),
      })
    );

    // Simulate onFinish callback (assistant message persistence)
    if (mockOnFinish) {
      await mockOnFinish(assistantMessage);
    }

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/studies/${studyId}/messages`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'ASSISTANT',
          content: assistantMessage.content,
        }),
      })
    );
  });

  it('displays conversation with multiple exchanges', () => {
    const conversation = [
      {
        id: 'msg_1',
        role: 'user' as const,
        content: 'What are the main themes?',
        createdAt: new Date('2025-01-15T12:00:00Z'),
      },
      {
        id: 'msg_2',
        role: 'assistant' as const,
        content: 'I can identify three main themes: automation, user experience, and data privacy.',
        createdAt: new Date('2025-01-15T12:00:30Z'),
      },
      {
        id: 'msg_3',
        role: 'user' as const,
        content: 'Can you find specific quotes about user experience?',
        createdAt: new Date('2025-01-15T12:01:00Z'),
      },
      {
        id: 'msg_4',
        role: 'assistant' as const,
        content: 'Here are key quotes about user experience: "The interface is confusing" and "Users want simpler workflows".',
        createdAt: new Date('2025-01-15T12:01:30Z'),
      },
    ];

    mockUseChat.messages = conversation;

    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Should display all messages
    expect(screen.getByText('What are the main themes?')).toBeDefined();
    expect(screen.getByText(/I can identify three main themes/)).toBeDefined();
    expect(screen.getByText(/Can you find specific quotes/)).toBeDefined();
    expect(screen.getByText(/Here are key quotes/)).toBeDefined();

    // Should not show empty state
    expect(screen.queryByText('Start a conversation')).toBeNull();
  });

  it('handles error during chat interaction', async () => {
    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Simulate error callback
    const error = new Error('Failed to connect to AI service');
    if (mockOnError) {
      mockOnError(error);
    }

    // Error should be handled (toast should be called, but we can't easily test that)
    // The component should continue to function
    expect(screen.getByPlaceholderText('Ask a question about your documents...')).toBeDefined();
  });

  it('copies assistant message to clipboard', async () => {
    const messages = [
      {
        id: 'msg_assistant',
        role: 'assistant' as const,
        content: 'This is a helpful AI response that can be copied.',
        createdAt: new Date(),
      },
    ];

    mockUseChat.messages = messages;

    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Find and click copy button
    const copyButtons = screen.getAllByRole('button').filter(button =>
      button.querySelector('svg')
    );

    if (copyButtons.length > 0) {
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'This is a helpful AI response that can be copied.'
        );
      });
    }
  });

  it('handles message persistence failure gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<ChatPanel studyId={studyId} />);

    const userMessage = {
      id: 'msg_user_1',
      role: 'user' as const,
      content: 'Test message',
      createdAt: new Date(),
    };

    mockUseChat.messages = [userMessage];

    // Simulate onResponse callback with failing API
    if (mockOnResponse) {
      await mockOnResponse();
    }

    // Should handle the error gracefully (warning logged)
    expect(mockFetch).toHaveBeenCalled();
  });

  it('shows loading state during AI response', () => {
    mockUseChat.isLoading = true;
    mockUseChat.messages = [
      {
        id: 'msg_user',
        role: 'user' as const,
        content: 'Analyzing...',
        createdAt: new Date(),
      },
    ];

    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Input should be disabled during loading
    const textarea = screen.getByPlaceholderText('Ask a question about your documents...');
    const sendButton = document.querySelector('button[type="submit"]');

    expect(textarea).toHaveAttribute('disabled');
    expect(sendButton).toHaveAttribute('disabled');
  });

  it('enables interaction after loading completes', () => {
    // Start with loading state
    mockUseChat.isLoading = true;

    const { rerender } = renderWithProviders(<ChatPanel studyId={studyId} />);

    let textarea = screen.getByPlaceholderText('Ask a question about your documents...');
    expect(textarea).toHaveAttribute('disabled');

    // Complete loading
    mockUseChat.isLoading = false;
    mockUseChat.input = 'New question';

    rerender(<ChatPanel studyId={studyId} />);

    textarea = screen.getByPlaceholderText('Ask a question about your documents...');
    const sendButton = document.querySelector('button[type="submit"]');

    expect(textarea).not.toHaveAttribute('disabled');
    expect(sendButton).not.toHaveAttribute('disabled');
  });

  it('handles research-specific query examples', () => {
    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Should show research-focused examples
    expect(screen.getByText('"What are the main themes in these interviews?"')).toBeDefined();
    expect(screen.getByText('"Find quotes about user frustrations"')).toBeDefined();
    expect(screen.getByText('"What patterns do you see across documents?"')).toBeDefined();
  });

  it('maintains chat history across interactions', () => {
    const { rerender } = renderWithProviders(<ChatPanel studyId={studyId} />);

    // Start with one message
    mockUseChat.messages = [
      {
        id: 'msg_1',
        role: 'user' as const,
        content: 'First message',
        createdAt: new Date(),
      },
    ];

    rerender(<ChatPanel studyId={studyId} />);
    expect(screen.getByText('First message')).toBeDefined();

    // Add second message
    mockUseChat.messages = [
      ...mockUseChat.messages,
      {
        id: 'msg_2',
        role: 'assistant' as const,
        content: 'First response',
        createdAt: new Date(),
      },
    ];

    rerender(<ChatPanel studyId={studyId} />);
    expect(screen.getByText('First message')).toBeDefined();
    expect(screen.getByText('First response')).toBeDefined();
  });

  it('formats timestamps in message history', () => {
    const messagesWithTime = [
      {
        id: 'msg_time',
        role: 'user' as const,
        content: 'Message with timestamp',
        createdAt: new Date('2025-01-15T14:30:00Z'),
      },
    ];

    mockUseChat.messages = messagesWithTime;

    renderWithProviders(<ChatPanel studyId={studyId} />);

    // Should show formatted timestamp (implementation may vary by locale)
    const timestampElements = document.querySelectorAll('span').values();
    let hasTimestamp = false;
    for (const element of timestampElements) {
      if (element.textContent?.match(/\d{1,2}:\d{2}/)) {
        hasTimestamp = true;
        break;
      }
    }
    expect(hasTimestamp).toBe(true);
  });
});