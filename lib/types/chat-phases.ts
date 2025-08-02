/**
 * Types for progressive chat message phases and tool call events
 */

export interface ToolCallEvent {
  type: 'tool-call-start' | 'tool-call-end';
  toolName: string;
  parameters?: Record<string, unknown>;
  result?: string;
  timestamp: number;
  success?: boolean;
}

export interface MessagePhase {
  type: 'thinking' | 'results';
  content: string;
  toolCalls?: ToolCallEvent[];
  timestamp: number;
}

export interface ToolCallData {
  messageId: string;
  events: ToolCallEvent[];
  isActive: boolean;
  lastActivity: number;
}


export interface ChatStreamData {
  type: 'citations' | 'tool-call-start' | 'tool-call-end';
  citations?: unknown[];
  toolName?: string;
  parameters?: Record<string, unknown>;
  result?: string;
  success?: boolean;
  timestamp?: number;
}

export interface ThinkingContent {
  toolName: string;
  displayText: string;
  isActive: boolean;
}

export interface MessageWithPhases {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
  phases: MessagePhase[];
  toolCalls: ToolCallEvent[];
}