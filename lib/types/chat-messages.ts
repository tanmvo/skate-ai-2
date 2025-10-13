/**
 * Shared type definitions for chat messages
 * Used across client (useMessages hook) and server (API routes, message history)
 */

import { CitationMap } from './citations';

/**
 * Database message structure (from Prisma)
 */
export interface DatabaseMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  timestamp: string;
  toolCalls?: PersistedToolCall[] | null;
  messageParts?: AISDKv5MessagePart[] | null;
  citations?: CitationMap | null;
}

/**
 * AI SDK compatible message format
 * Used for communication with Claude API
 */
export interface AISDKMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: Array<
    | { type: 'text'; text: string }
    | {
        type: `tool-${string}`;
        toolCallId: string;
        state: 'input-available' | 'output-available';
        input?: Record<string, unknown>;
        output?: string | object;
      }
  >;
  createdAt: Date;
  citations?: CitationMap;
}

/**
 * AI SDK v5 message part structure
 */
export interface AISDKv5MessagePart {
  type: string;
  text?: string;
  toolCallId?: string;
  state?: 'input-available' | 'output-available';
  input?: Record<string, unknown>;
  output?: string | object;
}

/**
 * Persisted tool call metadata
 * Stored in database for chat history and analytics
 */
export interface PersistedToolCall {
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
 * Server-side message format for history fetching
 * Extends DatabaseMessage with Date type for timestamp
 */
export interface HistoryMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  toolCalls?: PersistedToolCall[] | null;
  messageParts?: AISDKv5MessagePart[] | null;
  citations?: CitationMap | null;
  timestamp: Date;
}
