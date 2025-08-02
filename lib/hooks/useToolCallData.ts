import { useMemo } from 'react';
import { ToolCallEvent, ToolCallData, ChatStreamData } from '@/lib/types/chat-phases';

/**
 * Hook to extract and process tool call events from the useChat data stream
 */
export function useToolCallData(dataStream: unknown[], messageId: string): ToolCallData {
  return useMemo(() => {
    if (!dataStream || dataStream.length === 0) {
      return {
        messageId,
        events: [],
        isActive: false,
        lastActivity: 0,
      };
    }

    // Filter for tool call events
    const toolCallEvents = dataStream
      .filter((item): item is ChatStreamData => {
        return (
          typeof item === 'object' &&
          item !== null &&
          'type' in item &&
          (item.type === 'tool-call-start' || item.type === 'tool-call-end')
        );
      })
      .map((item): ToolCallEvent => ({
        type: item.type as 'tool-call-start' | 'tool-call-end',
        toolName: item.toolName || '',
        parameters: item.parameters,
        result: item.result,
        timestamp: item.timestamp || Date.now(),
        success: item.success,
      }))
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

    return {
      messageId,
      events: toolCallEvents,
      isActive,
      lastActivity,
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
      default:
        return 'Completed processing';
    }
  });
}