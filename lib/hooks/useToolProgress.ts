import { useMemo } from 'react';
import { UIMessage } from 'ai';

/**
 * Tool progress data extracted from AI SDK v5 message parts
 */
export interface ToolProgressData {
  messageId: string;
  tools: ToolInvocationInfo[];
  isActive: boolean;
  lastActivity: number;
}

/**
 * Individual tool invocation information
 */
export interface ToolInvocationInfo {
  toolName: string;
  state: 'call' | 'partial-call' | 'result' | 'output-available';
  args?: Record<string, unknown>;
  result?: unknown;
  timestamp: number;
  isActive: boolean;
  query?: string;
  resultCount?: number;
}

/**
 * Hook to extract tool progress from AI SDK v5 message parts
 * This replaces useToolCallData for AI SDK v5 compatibility
 */
export function useToolProgress(message: UIMessage): ToolProgressData {
  return useMemo(() => {
    // Extract parts from message (AI SDK v5 structure)
    const messageParts = (message as unknown as { 
      parts?: Array<{ 
        type: string; 
        text?: string; 
        toolInvocation?: {
          toolName: string;
          state: string;
          args?: Record<string, unknown>;
          result?: unknown;
        }
      }> 
    }).parts;

    if (!messageParts || !Array.isArray(messageParts)) {
      return {
        messageId: message.id,
        tools: [],
        isActive: false,
        lastActivity: 0,
      };
    }

    // Extract tool invocations - AI SDK v5 uses type pattern "tool-{toolName}"
    const tools: ToolInvocationInfo[] = messageParts
      .filter(part => part.type && part.type.startsWith('tool-'))
      .map(part => {
        // Extract tool name from type (e.g., "tool-search_all_documents" -> "search_all_documents")
        const toolName = part.type.substring(5); // Remove "tool-" prefix
        const toolPart = part as unknown as {
          type: string;
          state: string;
          input?: Record<string, unknown>;
          output?: string;
          toolCallId?: string;
        };
        
        const isActive = toolPart.state !== 'output-available' && toolPart.state !== 'done';
        
        // Extract search query from input
        const query = (toolPart.input?.query as string) || '';
        
        // Extract result count from output string
        let resultCount: number | undefined;
        if (toolPart.state === 'output-available' && typeof toolPart.output === 'string') {
          const match = toolPart.output.match(/Found (\d+) relevant passages?/i);
          if (match) {
            resultCount = parseInt(match[1], 10);
          }
        }
        
        return {
          toolName,
          state: (toolPart.state || 'call') as 'call' | 'partial-call' | 'result' | 'output-available',
          args: toolPart.input,
          result: toolPart.output,
          timestamp: Date.now(), // AI SDK v5 doesn't provide timestamps, use current time
          isActive,
          query: query || undefined,
          resultCount,
        };
      });

    // Determine if any tools are currently active
    const isActive = tools.some(tool => tool.isActive);
    
    // Get last activity timestamp
    const lastActivity = tools.length > 0 ? Math.max(...tools.map(t => t.timestamp)) : 0;

    return {
      messageId: message.id,
      tools,
      isActive,
      lastActivity,
    };
  }, [message]);
}

/**
 * Generate user-friendly display text for tool progress
 */
export function generateToolProgressText(toolData: ToolProgressData): string {
  if (toolData.tools.length === 0) {
    return 'Processing your request...';
  }

  // Find currently active tools
  const activeTools = toolData.tools.filter(tool => tool.isActive);
  
  if (activeTools.length > 0) {
    const tool = activeTools[activeTools.length - 1]; // Get the most recent active tool
    return getToolDisplayText(tool.toolName, true, tool.query);
  }

  // If no active tools, show the last completed tool
  const completedTools = toolData.tools.filter(tool => !tool.isActive);
  if (completedTools.length > 0) {
    const lastTool = completedTools[completedTools.length - 1];
    return getToolDisplayText(lastTool.toolName, false, lastTool.query, lastTool.resultCount);
  }

  return 'Processing your request...';
}

/**
 * Get display text for specific tool names with context
 */
function getToolDisplayText(
  toolName: string, 
  isActive: boolean, 
  query?: string,
  resultCount?: number
): string {
  const activeText = isActive ? '...' : '';
  const queryText = query ? ` "${query}"` : '';
  const resultText = !isActive && resultCount !== undefined ? ` (${resultCount} found)` : '';
  
  switch (toolName) {
    case 'find_document_ids':
      return `Looking up documents${activeText}${queryText}`;
    case 'search_specific_documents':
      return `Searching specific documents${activeText}${queryText}${resultText}`;
    case 'search_all_documents':
      return `Searching all documents${activeText}${queryText}${resultText}`;
    case 'search':
      return `Searching documents${activeText}${queryText}${resultText}`;
    default:
      return `Processing${activeText}${queryText}`;
  }
}

/**
 * Check if there are any active tool calls
 */
export function hasActiveToolCalls(toolData: ToolProgressData): boolean {
  return toolData.isActive;
}

/**
 * Get a summary of completed tool calls for display
 */
export function getToolCallSummary(toolData: ToolProgressData): string[] {
  const completedTools = toolData.tools
    .filter(tool => !tool.isActive)
    .map(tool => tool.toolName);

  const uniqueTools = [...new Set(completedTools)];
  
  return uniqueTools.map(toolName => {
    switch (toolName) {
      case 'find_document_ids':
        return 'Found document IDs';
      case 'search_specific_documents':
        return 'Searched specific documents';
      case 'search_all_documents':
        return 'Searched all documents';
      case 'search':
        return 'Search completed';
      default:
        return 'Completed processing';
    }
  });
}