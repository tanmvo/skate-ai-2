import useSWR from 'swr';
import type { UIMessage } from '@ai-sdk/react';

interface DatabaseMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  timestamp: string;
  toolCalls?: PersistedToolCall[] | null;
  messageParts?: AISDKv5MessagePart[] | null;
}

interface AISDKMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: Array<{ type: 'text'; text: string } | { type: `tool-${string}`; toolCallId: string; state: 'input-available' | 'output-available'; input?: Record<string, unknown>; output?: string | object; }>;
  createdAt: Date;
}

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

// Message parts reconstruction function
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

async function fetchMessages(studyId: string, chatId: string): Promise<AISDKMessage[]> {
  const response = await fetch(`/api/studies/${studyId}/chats/${chatId}/messages`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }
  
  const dbMessages: DatabaseMessage[] = await response.json();
  
  // Transform to AI SDK format with tool call reconstruction
  return dbMessages.map((msg) => ({
    id: msg.id,
    role: msg.role.toLowerCase() as 'user' | 'assistant',
    parts: msg.role === 'ASSISTANT' && (msg.toolCalls || msg.messageParts) 
      ? reconstructMessageParts(msg.content, msg.toolCalls || null, msg.messageParts || null)
      : [{ type: 'text', text: msg.content }],
    createdAt: new Date(msg.timestamp),
  })) as AISDKMessage[];
}

export function useMessages(studyId: string, chatId: string | null) {
  const { data: messages, error, isLoading, mutate } = useSWR(
    chatId ? [`/api/studies/${studyId}/chats/${chatId}/messages`, studyId, chatId] : null,
    () => chatId ? fetchMessages(studyId, chatId) : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
      // Cache messages for 5 minutes when switching between chats
      dedupingInterval: 300000,
    }
  );

  return {
    messages: (messages || []) as UIMessage[],
    isLoading,
    error,
    mutate,
  };
}