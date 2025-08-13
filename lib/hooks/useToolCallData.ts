import { useMemo } from 'react';
import { ToolCallEvent, ToolCallData, ChatStreamData } from '@/lib/types/chat-phases';

/**
 * Hook to extract and process tool call events from the useChat data stream
 */
export function useToolCallData(dataStream: unknown[] | undefined, messageId: string): ToolCallData {
  return useMemo(() => {
    // Enhanced type safety: handle undefined, null, and non-array data
    if (!dataStream || !Array.isArray(dataStream) || dataStream.length === 0) {
      return {
        messageId,
        events: [],
        isActive: false,
        lastActivity: 0,
      };
    }


    // Filter for all relevant streaming events with enhanced type safety
    const streamingEvents = dataStream
      .filter((item): item is ChatStreamData => {
        // Comprehensive type checking to prevent runtime errors
        try {
          if (typeof item !== 'object' || item === null || !('type' in item)) {
            return false;
          }
          
          const itemType = (item as Record<string, unknown>).type;
          if (typeof itemType !== 'string') {
            return false;
          }

          // Include all streaming event types for comprehensive tool call tracking
          const validTypes = [
            'tool-call-start',
            'tool-call-end', 
            // AI SDK v5 native tool events
            'tool-input-start',
            'tool-input-delta', 
            'tool-input-available',
            'tool-output-available',
            // Legacy custom events
            'data-thinking',
            'data-complete',
            'data-error',
            'data-progress',
            'synthesis-progress',
            'synthesis-complete',
            'study-context-error',
            'stream-error',
            'execution-error',
            'fallback-response',
            'tool-calls-complete'
          ];
          
          return validTypes.includes(itemType);
        } catch {
          // Gracefully handle any unexpected errors in type checking
          return false;
        }
      })
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // Extract tool call events for backward compatibility (v4 events + v5 native + v5 data events)
    const toolCallEvents = streamingEvents
      .filter((item): item is ChatStreamData => 
        item.type === 'tool-call-start' || 
        item.type === 'tool-call-end' ||
        // AI SDK v5 native tool events
        item.type === 'tool-input-start' ||
        item.type === 'tool-input-available' ||
        item.type === 'tool-output-available' ||
        // Custom data events (for backward compatibility)
        item.type === 'data-thinking' ||
        item.type === 'data-complete' ||
        item.type === 'data-error'
      )
      .map((item): ToolCallEvent => {
        // Safe mapping with fallback values - convert v5 events to tool call format
        try {
          // Handle AI SDK v5 native tool events
          if (item.type === 'tool-input-start') {
            const toolEvent = item as unknown as { toolName?: string };
            return {
              type: 'tool-call-start',
              toolName: toolEvent.toolName || 'unknown-tool',
              parameters: {},
              timestamp: Date.now(),
            };
          } else if (item.type === 'tool-input-available') {
            const toolEvent = item as unknown as { toolName?: string; input?: Record<string, unknown> };
            return {
              type: 'tool-call-start', // Input available means tool is ready to execute
              toolName: toolEvent.toolName || 'unknown-tool',
              parameters: toolEvent.input || {},
              timestamp: Date.now(),
            };
          } else if (item.type === 'tool-output-available') {
            const toolEvent = item as unknown as { toolName?: string; output?: unknown };
            return {
              type: 'tool-call-end',
              toolName: toolEvent.toolName || 'unknown-tool',  
              parameters: {},
              result: toolEvent.output ? JSON.stringify(toolEvent.output) : undefined,
              timestamp: Date.now(),
              success: true,
            };
          }
          
          // Handle v5 custom data stream events (legacy)
          else if (item.type === 'data-thinking') {
            return {
              type: 'tool-call-start',
              toolName: 'search', // Generic tool name for v5 events
              parameters: { query: item.data || '' },
              timestamp: Date.now(),
            };
          } else if (item.type === 'data-complete') {
            return {
              type: 'tool-call-end',
              toolName: 'search',
              parameters: {},
              result: typeof item.data === 'string' ? item.data : undefined,
              timestamp: Date.now(),
              success: true,
            };
          } else if (item.type === 'data-error') {
            return {
              type: 'tool-call-end',
              toolName: 'search',
              parameters: {},
              result: typeof item.data === 'string' ? item.data : undefined,
              timestamp: Date.now(),
              success: false,
            };
          }
          
          // Handle legacy v4 events
          return {
            type: item.type as 'tool-call-start' | 'tool-call-end',
            toolName: typeof item.toolName === 'string' ? item.toolName : '',
            parameters: item.parameters || {},
            result: typeof item.result === 'string' ? item.result : undefined,
            timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
            success: typeof item.success === 'boolean' ? item.success : undefined,
          };
        } catch {
          return {
            type: 'tool-call-end', // Safe fallback
            toolName: 'unknown',
            parameters: {},
            result: undefined,
            timestamp: Date.now(),
            success: false,
          };
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp);


    // Determine if any tools are currently active
    const toolStates = new Map<string, boolean>();
    toolCallEvents.forEach(event => {
      if (event.type === 'tool-call-start') {
        toolStates.set(event.toolName, true);
      } else if (event.type === 'tool-call-end') {
        toolStates.set(event.toolName, false);
      }
    });

    const isActive = Array.from(toolStates.values()).some(active => active);
    const lastActivity = toolCallEvents.length > 0 
      ? Math.max(...toolCallEvents.map(e => e.timestamp))
      : 0;

    // Extract synthesis progress events
    const progressEvents = streamingEvents.filter(
      (item): item is ChatStreamData => item.type === 'synthesis-progress'
    );

    // Extract error events for resilience monitoring
    const errorEvents = streamingEvents.filter(
      (item): item is ChatStreamData => 
        item.type === 'stream-error' || 
        item.type === 'execution-error' || 
        item.type === 'study-context-error'
    );

    return {
      messageId,
      events: toolCallEvents,
      isActive,
      lastActivity,
      streamingEvents,
      progressEvents,
      errorEvents,
      hasErrors: errorEvents.length > 0,
    };
  }, [dataStream, messageId]);
}

/**
 * Generate user-friendly display text for tool calls
 */
export function generateThinkingText(toolCallEvents: ToolCallEvent[]): string {
  if (toolCallEvents.length === 0) {
    return 'Processing your request...';
  }

  // Get the most recent active tool or the last completed tool
  const activeTools = toolCallEvents
    .filter(event => event.type === 'tool-call-start')
    .map(event => event.toolName);

  const completedTools = new Set(
    toolCallEvents
      .filter(event => event.type === 'tool-call-end')
      .map(event => event.toolName)
  );

  // Find currently active tools
  const currentlyActive = activeTools.filter(tool => !completedTools.has(tool));
  
  if (currentlyActive.length > 0) {
    const toolName = currentlyActive[currentlyActive.length - 1];
    return getToolDisplayText(toolName, true);
  }

  // If no active tools, show the last completed tool
  if (activeTools.length > 0) {
    const lastTool = activeTools[activeTools.length - 1];
    return getToolDisplayText(lastTool, false);
  }

  return 'Processing your request...';
}

/**
 * Get display text for specific tool names
 */
function getToolDisplayText(toolName: string, isActive: boolean): string {
  const activeText = isActive ? '...' : '';
  
  switch (toolName) {
    case 'find_document_ids':
      return `Looking up documents${activeText}`;
    case 'search_specific_documents':
      return `Searching specific documents${activeText}`;
    case 'search_all_documents':
      return `Searching all documents${activeText}`;
    case 'search':
      return `Searching documents${activeText}`;
    default:
      return `Processing${activeText}`;
  }
}

/**
 * Check if there are any active tool calls
 */
export function hasActiveToolCalls(toolCallData: ToolCallData): boolean {
  return toolCallData.isActive;
}

/**
 * Get a summary of completed tool calls for display
 */
export function getToolCallSummary(toolCallEvents: ToolCallEvent[]): string[] {
  const completedTools = toolCallEvents
    .filter(event => event.type === 'tool-call-end' && event.success)
    .map(event => event.toolName);

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