import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the actual function to test
// We'll extract it from the route file since it's not exported
// This copies the actual implementation for testing
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

// Copy the actual function implementation for testing
function extractToolCallsFromParts(parts: AISDKv5MessagePart[]): PersistedToolCall[] {
  if (!parts || !Array.isArray(parts)) return [];

  const toolCalls: PersistedToolCall[] = [];
  const processedToolIds = new Set<string>();
  
  // Extract completed tool calls only (output-available state)
  parts
    .filter(part => part.type?.startsWith('tool-') && part.state === 'output-available')
    .forEach(part => {
      if (!part.toolCallId || processedToolIds.has(part.toolCallId)) return;
      
      const toolName = part.type.substring(5); // Remove "tool-" prefix
      const query = part.input?.query as string;
      
      // Extract result count from output string pattern
      let resultCount: number | undefined;
      if (typeof part.output === 'string') {
        const match = part.output.match(/found (\d+) relevant passages?/i);
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

describe('Tool Call Extraction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should extract tool calls with output-available state', () => {
    const messageParts: AISDKv5MessagePart[] = [
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-123',
        state: 'output-available',
        input: { query: 'themes' },
        output: 'Found 5 relevant passages about themes'
      }
    ];

    const result = extractToolCallsFromParts(messageParts);

    expect(result).toEqual([
      {
        toolCallId: 'tool-123',
        toolName: 'search_all_documents',
        state: 'output-available',
        input: { query: 'themes' },
        output: 'Found 5 relevant passages about themes',
        timestamp: Date.now(),
        query: 'themes',
        resultCount: 5
      }
    ]);
  });

  it('should ignore tool calls with input-available state', () => {
    const messageParts: AISDKv5MessagePart[] = [
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-123',
        state: 'input-available',
        input: { query: 'themes' },
      }
    ];

    const result = extractToolCallsFromParts(messageParts);

    expect(result).toEqual([]);
  });

  it('should extract multiple tool calls from single message', () => {
    const messageParts: AISDKv5MessagePart[] = [
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-123',
        state: 'output-available',
        input: { query: 'themes' },
        output: 'Found 3 relevant passages'
      },
      {
        type: 'tool-search_specific_documents',
        toolCallId: 'tool-456',
        state: 'output-available',
        input: { query: 'user feedback', documentIds: ['doc_1'] },
        output: 'Found 2 relevant passages'
      }
    ];

    const result = extractToolCallsFromParts(messageParts);

    expect(result).toHaveLength(2);
    expect(result[0].toolName).toBe('search_all_documents');
    expect(result[1].toolName).toBe('search_specific_documents');
    expect(result[0].resultCount).toBe(3);
    expect(result[1].resultCount).toBe(2);
  });

  it('should handle missing or invalid fields gracefully', () => {
    const messageParts: AISDKv5MessagePart[] = [
      // Missing toolCallId
      {
        type: 'tool-search_all_documents',
        state: 'output-available',
        input: { query: 'themes' },
        output: 'Found 2 passages'
      },
      // Missing input
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-456',
        state: 'output-available',
        output: 'Found 1 passage'
      },
      // Valid tool call
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-789',
        state: 'output-available',
        input: { query: 'feedback' },
        output: 'Found 4 passages'
      }
    ];

    const result = extractToolCallsFromParts(messageParts);

    // Should only extract the valid tool call
    expect(result).toHaveLength(2);
    expect(result[0].toolCallId).toBe('tool-456');
    expect(result[0].query).toBeUndefined();
    expect(result[1].toolCallId).toBe('tool-789');
    expect(result[1].query).toBe('feedback');
  });

  it('should prevent duplicate tool calls with same ID', () => {
    const messageParts: AISDKv5MessagePart[] = [
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-123',
        state: 'output-available',
        input: { query: 'themes' },
        output: 'Found 3 relevant passages'
      },
      // Duplicate tool call ID
      {
        type: 'tool-search_specific_documents',
        toolCallId: 'tool-123',
        state: 'output-available',
        input: { query: 'different query' },
        output: 'Found 1 passage'
      }
    ];

    const result = extractToolCallsFromParts(messageParts);

    // Should only process the first occurrence
    expect(result).toHaveLength(1);
    expect(result[0].toolName).toBe('search_all_documents');
    expect(result[0].query).toBe('themes');
  });

  it('should parse result count from output patterns', () => {
    // Test most common cases
    const messageParts1: AISDKv5MessagePart[] = [
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-1',
        state: 'output-available',
        input: { query: 'test' },
        output: 'Found 1 relevant passage'
      }
    ];

    const result1 = extractToolCallsFromParts(messageParts1);
    expect(result1[0].resultCount).toBe(1);

    // Test multiple passages
    const messageParts2: AISDKv5MessagePart[] = [
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-2',
        state: 'output-available',
        input: { query: 'test' },
        output: 'Found 10 relevant passages'
      }
    ];

    const result2 = extractToolCallsFromParts(messageParts2);
    expect(result2[0].resultCount).toBe(10);

    // Test case insensitive
    const messageParts3: AISDKv5MessagePart[] = [
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-3',
        state: 'output-available',
        input: { query: 'test' },
        output: 'found 5 RELEVANT passages about themes'
      }
    ];

    const result3 = extractToolCallsFromParts(messageParts3);
    expect(result3[0].resultCount).toBe(5);

    // Test no match
    const messageParts4: AISDKv5MessagePart[] = [
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-4',
        state: 'output-available',
        input: { query: 'test' },
        output: 'No relevant content found'
      }
    ];

    const result4 = extractToolCallsFromParts(messageParts4);
    expect(result4[0].resultCount).toBeUndefined();
  });

  it('should handle object output by stringifying', () => {
    const messageParts: AISDKv5MessagePart[] = [
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-123',
        state: 'output-available',
        input: { query: 'themes' },
        output: { results: ['passage1', 'passage2'], count: 2 }
      }
    ];

    const result = extractToolCallsFromParts(messageParts);

    expect(result[0].output).toBe('{"results":["passage1","passage2"],"count":2}');
    expect(result[0].resultCount).toBeUndefined(); // No string pattern to parse
  });

  it('should handle edge cases gracefully', () => {
    // Null/undefined inputs
    expect(extractToolCallsFromParts(null as any)).toEqual([]);
    expect(extractToolCallsFromParts(undefined as any)).toEqual([]);
    expect(extractToolCallsFromParts([])).toEqual([]);

    // Non-tool parts mixed in
    const messageParts: AISDKv5MessagePart[] = [
      { type: 'text', text: 'Some text content' },
      {
        type: 'tool-search_all_documents',
        toolCallId: 'tool-123',
        state: 'output-available',
        input: { query: 'themes' },
        output: 'Found 2 passages'
      },
      { type: 'image', text: 'Image description' }
    ];

    const result = extractToolCallsFromParts(messageParts);

    expect(result).toHaveLength(1);
    expect(result[0].toolName).toBe('search_all_documents');
  });
});