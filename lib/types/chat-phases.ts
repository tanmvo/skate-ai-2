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
  streamingEvents?: ChatStreamData[];
  progressEvents?: ChatStreamData[];
  errorEvents?: ChatStreamData[];
  hasErrors?: boolean;
}


export interface ChatStreamData {
  type: 'citations' | 'tool-call-start' | 'tool-call-end' | 'study-context-error' | 'stream-error' | 'execution-error' | 'fallback-response' | 'tool-calls-complete' | 'synthesis-progress' | 'synthesis-complete' | 'data-thinking' | 'data-complete' | 'data-error' | 'data-progress';
  citations?: unknown[];
  toolName?: string;
  parameters?: Record<string, unknown>;
  result?: string;
  success?: boolean;
  timestamp?: number;
  error?: string;
  details?: string;
  retryable?: boolean;
  message?: string;
  stepType?: string;
  toolCount?: number;
  stage?: 'searching' | 'search-complete' | 'search-error' | 'grouping' | 'analyzing';
  progress?: {
    current?: number;
    total?: number;
    query?: string;
    resultCount?: number;
    error?: string;
    message?: string;
  };
  synthesis?: unknown;
  synthesisId?: string;
  // Add field for v5 data stream events
  data?: string | Record<string, unknown>;
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