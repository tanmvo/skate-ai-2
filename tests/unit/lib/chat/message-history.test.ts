import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for message history utilities
 * Tests the logic for fetching and formatting conversation history
 */

// Mock Prisma to prevent database access
vi.mock('@/lib/prisma', () => ({
  prisma: {
    chatMessage: {
      findMany: vi.fn(),
    },
  },
}));

import { fetchMessageHistory, logMessageHistory } from '@/lib/chat/message-history';
import { prisma } from '@/lib/prisma';

describe('message-history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchMessageHistory', () => {
    it('should fetch last 10 messages in chronological order', async () => {
      // Mock database response (returns in desc order)
      const mockMessages = [
        {
          id: 'msg-3',
          role: 'ASSISTANT',
          content: 'Response 3',
          toolCalls: null,
          messageParts: null,
          citations: null,
          timestamp: new Date('2025-01-13T12:30:00Z'),
        },
        {
          id: 'msg-2',
          role: 'USER',
          content: 'Question 2',
          toolCalls: null,
          messageParts: null,
          citations: null,
          timestamp: new Date('2025-01-13T12:20:00Z'),
        },
        {
          id: 'msg-1',
          role: 'USER',
          content: 'Question 1',
          toolCalls: null,
          messageParts: null,
          citations: null,
          timestamp: new Date('2025-01-13T12:10:00Z'),
        },
      ];

      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as any);

      const result = await fetchMessageHistory('chat-123');

      // Should return 3 messages in chronological order (oldest first)
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('msg-1'); // Oldest
      expect(result[1].id).toBe('msg-2');
      expect(result[2].id).toBe('msg-3'); // Newest
    });

    it('should handle empty chat gracefully', async () => {
      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue([]);

      const result = await fetchMessageHistory('chat-empty');

      expect(result).toEqual([]);
    });

    it('should exclude specific message ID if provided', async () => {
      const mockMessages = [
        {
          id: 'msg-2',
          role: 'USER',
          content: 'Question 2',
          toolCalls: null,
          messageParts: null,
          citations: null,
          timestamp: new Date('2025-01-13T12:20:00Z'),
        },
        {
          id: 'msg-1',
          role: 'USER',
          content: 'Question 1',
          toolCalls: null,
          messageParts: null,
          citations: null,
          timestamp: new Date('2025-01-13T12:10:00Z'),
        },
      ];

      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as any);

      const result = await fetchMessageHistory('chat-123', 'msg-3');

      expect(result).toHaveLength(2);
      expect(result.find(msg => msg.id === 'msg-3')).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.chatMessage.findMany).mockRejectedValue(new Error('Database error'));

      const result = await fetchMessageHistory('chat-error');

      // Should return empty array, not throw
      expect(result).toEqual([]);
    });
  });

  describe('formatMessageForAI', () => {
    it('should format USER messages correctly', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          role: 'USER',
          content: 'Test question',
          toolCalls: null,
          messageParts: null,
          citations: null,
          timestamp: new Date('2025-01-13T12:00:00Z'),
        },
      ];

      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as any);

      const result = await fetchMessageHistory('chat-123');

      expect(result[0]).toMatchObject({
        id: 'msg-1',
        role: 'user',
        parts: [{ type: 'text', text: 'Test question' }],
      });
    });

    it('should format ASSISTANT messages as text-only (no tool parts)', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          role: 'ASSISTANT',
          content: 'Here are the results',
          // NOTE: toolCalls and messageParts are NOT fetched from DB (excluded for performance)
          citations: null,
          timestamp: new Date('2025-01-13T12:00:00Z'),
        },
      ];

      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as any);

      const result = await fetchMessageHistory('chat-123');

      expect(result[0].role).toBe('assistant');
      expect(result[0].parts.length).toBe(1);
      expect(result[0].parts[0].type).toBe('text'); // Always text-only for performance
      expect(result[0].parts[0].text).toBe('Here are the results');
    });

    it('should truncate long messages to 4000 chars', async () => {
      const longContent = 'A'.repeat(5000);
      const mockMessages = [
        {
          id: 'msg-1',
          role: 'USER',
          content: longContent,
          toolCalls: null,
          messageParts: null,
          citations: null,
          timestamp: new Date('2025-01-13T12:00:00Z'),
        },
      ];

      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as any);

      const result = await fetchMessageHistory('chat-123');

      const textPart = result[0].parts.find(part => part.type === 'text');
      expect(textPart?.text?.length).toBe(4000);
    });
  });

  describe('logMessageHistory', () => {
    it('should log message count', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const mockMessages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          parts: [{ type: 'text', text: 'Question' }],
          createdAt: new Date(),
        },
      ];

      logMessageHistory(mockMessages as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Loaded 1 messages')
      );
    });

    it('should warn about truncated messages', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');

      const mockMessages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          parts: [{ type: 'text', text: 'A'.repeat(4000) }], // Exactly 4000 chars
          createdAt: new Date(),
        },
      ];

      logMessageHistory(mockMessages as any);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 message(s) truncated')
      );
    });
  });
});
