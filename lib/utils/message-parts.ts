/**
 * Message Parts Utilities
 * Shared functions for working with AI SDK message parts
 */

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

/**
 * Determines if a message part at a given index is the final text response.
 * A text part is considered final if it's the last text part and comes after all tool calls.
 */
export function isFinalTextPart(
  messageParts: Array<{ type: string; text?: string; [key: string]: unknown }>,
  currentIndex: number
): boolean {
  const textParts = messageParts
    .map((part, idx) => ({ part, index: idx }))
    .filter(({ part }) => part.type === 'text' && part.text && typeof part.text === 'string' && part.text.trim());

  const toolParts = messageParts
    .map((part, idx) => ({ part, index: idx }))
    .filter(({ part }) => part.type && part.type.startsWith('tool-'));

  const finalTextIndex = textParts.length > 0 ? textParts[textParts.length - 1].index : -1;
  const lastToolIndex = toolParts.length > 0 ? toolParts[toolParts.length - 1].index : -1;

  return currentIndex === finalTextIndex && currentIndex > lastToolIndex;
}

/**
 * Reconstruct message parts from database records
 * Used by both client-side and server-side code to format messages
 *
 * @param content - Text content of the message
 * @param toolCalls - Array of persisted tool call records
 * @param originalParts - Original AI SDK message parts if available
 * @returns Array of AI SDK v5 message parts
 */
export function reconstructMessageParts(
  content: string,
  toolCalls: PersistedToolCall[] | null,
  originalParts: AISDKv5MessagePart[] | null
): AISDKv5MessagePart[] {
  // If we have original parts, use them but fix the state for tool calls
  if (originalParts && Array.isArray(originalParts) && originalParts.length > 0) {
    return originalParts.map(part => {
      // For tool parts, ensure they show as completed for historical messages
      if (part.type?.startsWith('tool-') && part.toolCallId) {
        return {
          ...part,
          state: 'output-available' // Always completed for historical messages
        };
      }
      return part;
    });
  }

  // Fallback: reconstruct from tool calls if original parts not available
  const parts: AISDKv5MessagePart[] = [];

  // Add tool call parts in chronological order (ONLY completed ones)
  if (toolCalls?.length) {
    const sortedToolCalls = [...toolCalls].sort((a, b) => a.timestamp - b.timestamp);

    sortedToolCalls.forEach(tool => {
      parts.push({
        type: `tool-${tool.toolName}`,
        toolCallId: tool.toolCallId,
        state: 'output-available', // Always completed for historical messages
        input: tool.input || {},
        output: tool.output || ''
      });
    });
  }

  // Text content part comes after tool calls
  if (content?.trim()) {
    parts.push({ type: 'text', text: content });
  }

  return parts;
}
