import { describe, it, expect } from 'vitest';
import { reconstructMessageParts } from '@/lib/hooks/useMessages';

interface AISDKv5MessagePart {
  type: string;
  text?: string;
  toolCallId?: string;
  state?: 'input-available' | 'output-available';
  input?: Record<string, unknown>;
  output?: string | object;
}

describe('useMessages', () => {
  describe('reconstructMessageParts', () => {
    it('should use original parts when available and set tool states to completed', () => {
      const content = 'Analysis complete';
      const toolCalls = null;
      const originalParts: AISDKv5MessagePart[] = [
        {
          type: 'tool-search_all_documents',
          toolCallId: 'tool-123',
          state: 'input-available',
          input: { query: 'test' },
        },
        {
          type: 'tool-search_all_documents',
          toolCallId: 'tool-123',
          state: 'output-available',
          input: { query: 'test' },
          output: 'Found 5 passages',
        },
        {
          type: 'text',
          text: 'Analysis complete',
        }
      ];

      const result = reconstructMessageParts(content, toolCalls, originalParts);

      // Should preserve original structure but fix tool states
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        type: 'tool-search_all_documents',
        toolCallId: 'tool-123',
        state: 'output-available', // Fixed to completed
        input: { query: 'test' },
      });
      expect(result[1]).toEqual({
        type: 'tool-search_all_documents',
        toolCallId: 'tool-123',
        state: 'output-available', // Already completed
        input: { query: 'test' },
        output: 'Found 5 passages',
      });
      expect(result[2]).toEqual({
        type: 'text',
        text: 'Analysis complete',
      });
    });

    it('should reconstruct from tool calls when original parts not available', () => {
      const content = 'Analysis complete';
      const toolCalls = [
        {
          toolCallId: 'tool-123',
          toolName: 'search_all_documents',
          state: 'output-available' as const,
          input: { query: 'test' },
          output: 'Found 5 passages',
          timestamp: 1234567890,
          query: 'test',
          resultCount: 5,
        }
      ];
      const originalParts = null;

      const result = reconstructMessageParts(content, toolCalls, originalParts);

      // Should reconstruct from tool calls data
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'tool-search_all_documents',
        toolCallId: 'tool-123',
        state: 'output-available',
        input: { query: 'test' },
        output: 'Found 5 passages',
      });
      expect(result[1]).toEqual({
        type: 'text',
        text: 'Analysis complete',
      });
    });

    it('should handle multiple tool calls in chronological order', () => {
      const content = 'Analysis complete';
      const toolCalls = [
        {
          toolCallId: 'tool-456',
          toolName: 'search_specific_documents',
          state: 'output-available' as const,
          input: { query: 'second search' },
          output: 'Found 3 passages',
          timestamp: 1234567892, // Later timestamp
        },
        {
          toolCallId: 'tool-123',
          toolName: 'search_all_documents',
          state: 'output-available' as const,
          input: { query: 'first search' },
          output: 'Found 5 passages',
          timestamp: 1234567890, // Earlier timestamp
        }
      ];
      const originalParts = null;

      const result = reconstructMessageParts(content, toolCalls, originalParts);

      // Should be sorted by timestamp (earlier first)
      expect(result).toHaveLength(3);
      expect(result[0].toolCallId).toBe('tool-123'); // Earlier timestamp
      expect(result[1].toolCallId).toBe('tool-456'); // Later timestamp
      expect(result[2].type).toBe('text');
    });

    it('should handle empty content and no tool calls', () => {
      const content = '';
      const toolCalls = null;
      const originalParts = null;

      const result = reconstructMessageParts(content, toolCalls, originalParts);

      expect(result).toHaveLength(0);
    });

    it('should handle only text content with no tools', () => {
      const content = 'Just text content';
      const toolCalls = null;
      const originalParts = null;

      const result = reconstructMessageParts(content, toolCalls, originalParts);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'text',
        text: 'Just text content',
      });
    });

    it('should preserve non-tool parts unchanged', () => {
      const content = 'Analysis complete';
      const toolCalls = null;
      const originalParts: AISDKv5MessagePart[] = [
        {
          type: 'text',
          text: 'Some analysis text',
        },
        {
          type: 'custom-part',
          data: 'custom data',
        } as AISDKv5MessagePart
      ];

      const result = reconstructMessageParts(content, toolCalls, originalParts);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'text',
        text: 'Some analysis text',
      });
      expect(result[1]).toEqual({
        type: 'custom-part',
        data: 'custom data',
      });
    });
  });
});