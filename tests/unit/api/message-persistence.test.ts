import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
const mockPrismaCreate = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    chatMessage: {
      create: mockPrismaCreate
    }
  }
}));

// Types for message persistence logic
interface AISDKv5MessagePart {
  type: string;
  text?: string;
  toolCallId?: string;
  state?: 'input-available' | 'output-available';
  input?: Record<string, unknown>;
  output?: string | object;
}

interface PersistedToolCall {
  toolCallId: string;
  toolName: string;
  state: 'input-available' | 'output-available';
  input?: Record<string, unknown>;
  output?: string;
  timestamp: number;
  query?: string;
  resultCount?: number;
}

// Copy the message persistence logic from the chat route
function extractToolCallsFromParts(parts: AISDKv5MessagePart[]): PersistedToolCall[] {
  if (!parts || !Array.isArray(parts)) return [];

  const toolCalls: PersistedToolCall[] = [];
  const processedToolIds = new Set<string>();
  
  parts
    .filter(part => part.type?.startsWith('tool-') && part.state === 'output-available')
    .forEach(part => {
      if (!part.toolCallId || processedToolIds.has(part.toolCallId)) return;
      
      const toolName = part.type.substring(5);
      const query = part.input?.query as string;
      
      let resultCount: number | undefined;
      if (typeof part.output === 'string') {
        const match = part.output.match(/Found (\d+) relevant passages?/i);
        if (match) resultCount = parseInt(match[1], 10);
      }
      
      toolCalls.push({
        toolCallId: part.toolCallId,
        toolName,
        state: part.state!,
        input: part.input || {},
        output: typeof part.output === 'string' ? part.output : JSON.stringify(part.output || ''),
        timestamp: Date.now(),
        query: query || undefined,
        resultCount: resultCount || undefined
      });
      
      processedToolIds.add(part.toolCallId);
    });
    
  return toolCalls;
}

// Simulate the message persistence logic from onFinish
async function persistAssistantMessage(
  messageParts: AISDKv5MessagePart[],
  chatId: string,
  studyId: string
) {
  const toolCalls = extractToolCallsFromParts(messageParts);
  const textContent = messageParts
    .filter(part => part.type === 'text' && part.text)
    .map(part => part.text!)
    .join('').trim();
  
  if (!textContent && !toolCalls.length) return null;
  
  return await mockPrismaCreate({
    data: {
      role: 'ASSISTANT',
      content: textContent,
      toolCalls: toolCalls.length > 0 ? JSON.parse(JSON.stringify(toolCalls)) : undefined,
      messageParts: JSON.parse(JSON.stringify(messageParts)),
      chatId: chatId,
      studyId: studyId,
    },
  });
}

describe('Message Persistence Logic', () => {
  const chatId = 'chat_test_123';
  const studyId = 'study_test_123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    
    mockPrismaCreate.mockResolvedValue({
      id: 'msg_test_123',
      role: 'ASSISTANT',
      content: 'Test message',
      createdAt: new Date()
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should persist assistant message with tool calls', async () => {
    const messageParts: AISDKv5MessagePart[] = [
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-123',
        state: 'output-available',
        input: { query: 'themes' },
        output: 'Found 3 relevant passages'
      },
      {
        type: 'text',
        text: 'Based on my analysis of the documents, I found three main themes: user experience, performance concerns, and feature requests.'
      }
    ];

    await persistAssistantMessage(messageParts, chatId, studyId);

    expect(mockPrismaCreate).toHaveBeenCalledWith({
      data: {
        role: 'ASSISTANT',
        content: 'Based on my analysis of the documents, I found three main themes: user experience, performance concerns, and feature requests.',
        toolCalls: [
          {
            toolCallId: 'tool-123',
            toolName: 'search_all_documents',
            state: 'output-available',
            input: { query: 'themes' },
            output: 'Found 3 relevant passages',
            timestamp: Date.now(),
            query: 'themes',
            resultCount: 3
          }
        ],
        messageParts: messageParts,
        chatId: chatId,
        studyId: studyId,
      },
    });
  });

  it('should persist text-only assistant message without tool calls', async () => {
    const messageParts: AISDKv5MessagePart[] = [
      {
        type: 'text',
        text: 'I can help you analyze your documents. Please upload some files to get started.'
      }
    ];

    await persistAssistantMessage(messageParts, chatId, studyId);

    expect(mockPrismaCreate).toHaveBeenCalledWith({
      data: {
        role: 'ASSISTANT',
        content: 'I can help you analyze your documents. Please upload some files to get started.',
        toolCalls: undefined,
        messageParts: messageParts,
        chatId: chatId,
        studyId: studyId,
      },
    });
  });

  it('should combine multiple text parts into single content', async () => {
    const messageParts: AISDKv5MessagePart[] = [
      {
        type: 'text',
        text: 'Based on my search, '
      },
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-123',
        state: 'output-available',
        input: { query: 'themes' },
        output: 'Found 2 passages'
      },
      {
        type: 'text',
        text: 'I can identify the following themes: efficiency and user satisfaction.'
      }
    ];

    await persistAssistantMessage(messageParts, chatId, studyId);

    expect(mockPrismaCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content: 'Based on my search, I can identify the following themes: efficiency and user satisfaction.',
        toolCalls: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'search_all_documents',
            toolCallId: 'tool-123'
          })
        ])
      })
    });
  });

  it('should handle empty text content gracefully', async () => {
    const messageParts: AISDKv5MessagePart[] = [
      { type: 'text', text: '   ' }, // Whitespace only
      { type: 'text', text: '' },    // Empty string
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-123',
        state: 'output-available',
        input: { query: 'test' },
        output: 'Found 1 passage'
      }
    ];

    await persistAssistantMessage(messageParts, chatId, studyId);

    expect(mockPrismaCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content: '', // Trimmed to empty
        toolCalls: expect.arrayContaining([
          expect.objectContaining({ toolName: 'search_all_documents' })
        ])
      })
    });
  });

  it('should skip persistence when no content and no tool calls', async () => {
    const messageParts: AISDKv5MessagePart[] = [
      { type: 'text', text: '   ' }, // Only whitespace
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-123',
        state: 'input-available', // Not output-available, so ignored
        input: { query: 'test' }
      }
    ];

    const result = await persistAssistantMessage(messageParts, chatId, studyId);

    expect(result).toBeNull();
    expect(mockPrismaCreate).not.toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    mockPrismaCreate.mockRejectedValue(new Error('Database connection failed'));

    const messageParts: AISDKv5MessagePart[] = [
      { type: 'text', text: 'Test message' }
    ];

    await expect(persistAssistantMessage(messageParts, chatId, studyId)).rejects.toThrow('Database connection failed');
  });

  it('should properly serialize tool calls as JSON', async () => {
    const messageParts: AISDKv5MessagePart[] = [
      {
        type: 'text',
        text: 'Analysis complete.'
      },
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-123',
        state: 'output-available',
        input: { query: 'themes', limit: 5 },
        output: { results: ['result1'], count: 1 }
      }
    ];

    await persistAssistantMessage(messageParts, chatId, studyId);

    const call = mockPrismaCreate.mock.calls[0][0];
    
    // Verify tool calls are properly JSON-serializable
    expect(typeof call.data.toolCalls).toBe('object');
    expect(Array.isArray(call.data.toolCalls)).toBe(true);
    expect(call.data.toolCalls[0].output).toBe('{"results":["result1"],"count":1}');
    
    // Verify message parts are properly JSON-serializable
    expect(typeof call.data.messageParts).toBe('object');
    expect(Array.isArray(call.data.messageParts)).toBe(true);
  });
});