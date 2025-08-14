import { vi } from 'vitest';
import type { UIMessage } from '@ai-sdk/react';

// AI SDK v5 compatible types
export interface MockUseChatOptions {
  messages?: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content?: string;
    parts?: Array<{
      type: string;
      text?: string;
      toolCallId?: string;
      state?: 'input-available' | 'output-available';
      input?: Record<string, unknown>;
      output?: string | object;
    }>;
    createdAt?: Date;
  }>;
  input?: string;
  isLoading?: boolean;
  error?: Error | null;
  data?: Array<{
    type: string;
    citations?: Array<{
      id: string;
      documentId: string;
      documentName: string;
      relevantText: string;
      pageNumber?: number;
    }>;
    [key: string]: unknown;
  }>;
  status?: 'loading' | 'ready' | 'error';
}

// Hook-specific mock types for comprehensive state testing
export interface MockUseChatManagerOptions {
  chats?: Array<{
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    studyId: string;
    userId: string;
    _count: { messages: number };
  }>;
  currentChatId?: string | null;
  currentChat?: {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    studyId: string;
    userId: string;
    _count: { messages: number };
  } | null;
  loading?: boolean;
  error?: string | null;
  isCreatingNew?: boolean;
  isGeneratingTitle?: boolean;
  titleGenerationChatId?: string | null;
}

export interface MockUseMessagesOptions {
  messages?: UIMessage[];
  error?: Error | null;
  isLoading?: boolean;
}

// State combinations for testing different ChatPanel states
export const ChatPanelStates = {
  LOADING_CHAT: {
    useChatManager: {
      chats: [],
      currentChatId: null,
      currentChat: null,
      loading: true,
      error: null,
      isCreatingNew: true,
      isGeneratingTitle: false,
      titleGenerationChatId: null,
    },
    useMessages: {
      messages: [],
      error: null,
      isLoading: false,
    },
    useChat: {
      status: 'ready',
      isLoading: false,
    }
  },
  LOADING_MESSAGES: {
    useChatManager: {
      chats: [{
        id: 'test-chat-123',
        title: 'New Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        studyId: 'test-study-123',
        userId: 'test-user-123',
        _count: { messages: 0 }
      }],
      currentChatId: 'test-chat-123',
      currentChat: {
        id: 'test-chat-123',
        title: 'New Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        studyId: 'test-study-123',
        userId: 'test-user-123',
        _count: { messages: 0 }
      },
      loading: false,
      error: null,
      isCreatingNew: false,
      isGeneratingTitle: false,
      titleGenerationChatId: null,
    },
    useMessages: {
      messages: [],
      error: null,
      isLoading: true,
    },
    useChat: {
      status: 'ready',
      isLoading: false,
    }
  },
  ERROR_MESSAGES: {
    useChatManager: {
      chats: [{
        id: 'test-chat-123',
        title: 'New Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        studyId: 'test-study-123',
        userId: 'test-user-123',
        _count: { messages: 0 }
      }],
      currentChatId: 'test-chat-123',
      currentChat: {
        id: 'test-chat-123',
        title: 'New Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        studyId: 'test-study-123',
        userId: 'test-user-123',
        _count: { messages: 0 }
      },
      loading: false,
      error: null,
      isCreatingNew: false,
      isGeneratingTitle: false,
      titleGenerationChatId: null,
    },
    useMessages: {
      messages: [],
      error: new Error('Failed to load messages'),
      isLoading: false,
    },
    useChat: {
      status: 'ready',
      isLoading: false,
    }
  },
  ERROR_CHAT: {
    useChatManager: {
      chats: [],
      currentChatId: null,
      currentChat: null,
      loading: false,
      error: 'Error loading chat',
      isCreatingNew: false,
      isGeneratingTitle: false,
      titleGenerationChatId: null,
    },
    useMessages: {
      messages: [],
      error: null,
      isLoading: false,
    },
    useChat: {
      status: 'ready',
      isLoading: false,
    }
  },
  EMPTY_READY: {
    useChatManager: {
      chats: [{
        id: 'test-chat-123',
        title: 'New Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        studyId: 'test-study-123',
        userId: 'test-user-123',
        _count: { messages: 0 }
      }],
      currentChatId: 'test-chat-123',
      currentChat: {
        id: 'test-chat-123',
        title: 'New Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        studyId: 'test-study-123',
        userId: 'test-user-123',
        _count: { messages: 0 }
      },
      loading: false,
      error: null,
      isCreatingNew: false,
      isGeneratingTitle: false,
      titleGenerationChatId: null,
    },
    useMessages: {
      messages: [],
      error: null,
      isLoading: false,
    },
    useChat: {
      status: 'ready',
      isLoading: false,
      messages: [],
    }
  },
  AI_SDK_LOADING: {
    useChatManager: {
      chats: [{
        id: 'test-chat-123',
        title: 'New Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        studyId: 'test-study-123',
        userId: 'test-user-123',
        _count: { messages: 0 }
      }],
      currentChatId: 'test-chat-123',
      currentChat: {
        id: 'test-chat-123',
        title: 'New Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        studyId: 'test-study-123',
        userId: 'test-user-123',
        _count: { messages: 0 }
      },
      loading: false,
      error: null,
      isCreatingNew: false,
      isGeneratingTitle: false,
      titleGenerationChatId: null,
    },
    useMessages: {
      messages: [],
      error: null,
      isLoading: false,
    },
    useChat: {
      status: 'loading',
      isLoading: true,
      messages: [],
    }
  }
};

/**
 * Creates a comprehensive mock for AI SDK v5 useChat hook
 * Matches the actual API from @ai-sdk/react
 */
export const createMockUseChat = (overrides: MockUseChatOptions = {}) => ({
  // Core state
  messages: overrides.messages || [],
  input: overrides.input || '',
  isLoading: overrides.isLoading || false,
  error: overrides.error || null,
  data: overrides.data || [],
  status: overrides.status || 'ready',

  // Event handlers
  handleInputChange: vi.fn(),
  handleSubmit: vi.fn(),
  sendMessage: vi.fn(),
  reload: vi.fn(),
  stop: vi.fn(),
  setMessages: vi.fn(),
  setInput: vi.fn(),

  // Callbacks
  onFinish: vi.fn(),
  onError: vi.fn(),
  onResponse: vi.fn(),

  // Additional AI SDK v5 properties
  append: vi.fn(),
  setData: vi.fn(),
  addMessage: vi.fn(),
});

/**
 * Default mock instance for global use
 */
export const mockUseChat = createMockUseChat();

/**
 * Factory to create hook mocks with specific state
 */
export const createMockHooks = () => ({
  useChatManager: vi.fn(() => ({
    chats: [{
      id: 'test-chat-123',
      title: 'New Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      studyId: 'test-study-123',
      userId: 'test-user-123',
      _count: { messages: 0 }
    }],
    currentChatId: 'test-chat-123',
    currentChat: {
      id: 'test-chat-123',
      title: 'New Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      studyId: 'test-study-123',
      userId: 'test-user-123',
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
  })),

  useMessages: vi.fn(() => ({
    messages: [],
    error: null,
    mutate: vi.fn(),
    isLoading: false,
  })),
});

/**
 * Create mock for useChatManager with specific state
 */
export const createMockUseChatManager = (overrides: MockUseChatManagerOptions = {}) => ({
  chats: overrides.chats || [{
    id: 'test-chat-123',
    title: 'New Chat',
    createdAt: new Date(),
    updatedAt: new Date(),
    studyId: 'test-study-123',
    userId: 'test-user-123',
    _count: { messages: 0 }
  }],
  currentChatId: overrides.currentChatId !== undefined ? overrides.currentChatId : 'test-chat-123',
  currentChat: overrides.currentChat !== undefined ? overrides.currentChat : {
    id: 'test-chat-123',
    title: 'New Chat',
    createdAt: new Date(),
    updatedAt: new Date(),
    studyId: 'test-study-123',
    userId: 'test-user-123',
    _count: { messages: 0 }
  },
  loading: overrides.loading || false,
  error: overrides.error || null,
  isCreatingNew: overrides.isCreatingNew || false,
  isGeneratingTitle: overrides.isGeneratingTitle || false,
  titleGenerationChatId: overrides.titleGenerationChatId || null,
  createNewChat: vi.fn(),
  generateTitle: vi.fn(),
  generateTitleInBackground: vi.fn(),
  refetchChats: vi.fn(),
});

/**
 * Create mock for useMessages with specific state
 */
export const createMockUseMessages = (overrides: MockUseMessagesOptions = {}) => ({
  messages: overrides.messages || [],
  error: overrides.error || null,
  mutate: vi.fn(),
  isLoading: overrides.isLoading || false,
});

/**
 * Helper to setup comprehensive state testing
 * @param stateName - Key from ChatPanelStates 
 */
export const setupChatPanelState = async (stateName: keyof typeof ChatPanelStates) => {
  const state = ChatPanelStates[stateName];
  
  // Mock useChatManager
  const { useChatManager } = await import('@/lib/hooks/useChatManager');
  vi.mocked(useChatManager).mockReturnValue({
    ...createMockUseChatManager(state.useChatManager),
  });

  // Mock useMessages  
  const { useMessages } = await import('@/lib/hooks/useMessages');
  vi.mocked(useMessages).mockReturnValue({
    ...createMockUseMessages(state.useMessages),
  });

  // Update global mockUseChat
  Object.assign(mockUseChat, {
    ...mockUseChat,
    ...state.useChat,
  });

  return { state, mockUseChat };
};

/**
 * Reset all mocks to default state
 */
export const resetMocks = () => {
  Object.keys(mockUseChat).forEach(key => {
    const value = mockUseChat[key as keyof typeof mockUseChat];
    if (vi.isMockFunction(value)) {
      value.mockClear();
    }
  });

  // Reset state
  mockUseChat.messages = [];
  mockUseChat.input = '';
  mockUseChat.isLoading = false;
  mockUseChat.error = null;
  mockUseChat.data = [];
  mockUseChat.status = 'ready';
};