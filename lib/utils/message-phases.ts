import { UIMessage } from '@ai-sdk/react';
import { MessagePhase, ToolCallEvent, MessageWithPhases } from '@/lib/types/chat-phases';
import { generateThinkingText } from '@/lib/hooks/useToolCallData';

/**
 * Classify a message into thinking and results phases based on tool call events
 */
export function classifyMessagePhases(
  message: UIMessage,
  toolCallEvents: ToolCallEvent[]
): MessagePhase[] {
  const phases: MessagePhase[] = [];
  
  // Add thinking phase if there are tool calls
  if (toolCallEvents.length > 0) {
    const thinkingContent = generateThinkingText(toolCallEvents);
    
    phases.push({
      type: 'thinking',
      content: thinkingContent,
      toolCalls: toolCallEvents,
      timestamp: Math.min(...toolCallEvents.map(e => e.timestamp)),
    });
  }
  
  // Always add results phase with the final message content
  phases.push({
    type: 'results',
    content: message.parts?.filter(part => part.type === 'text').map(part => part.text).join('') || '',
    timestamp: Date.now(), // v5 doesn't have createdAt on UIMessage
  });
  
  return phases;
}

/**
 * Create a MessageWithPhases from a regular Message and tool call events
 */
export function createMessageWithPhases(
  message: UIMessage,
  toolCallEvents: ToolCallEvent[]
): MessageWithPhases {
  const phases = classifyMessagePhases(message, toolCallEvents);
  
  return {
    id: message.id,
    role: message.role as 'user' | 'assistant',
    content: message.parts?.filter(part => part.type === 'text').map(part => part.text).join('') || '',
    createdAt: new Date(), // v5 doesn't have createdAt on UIMessage
    phases,
    toolCalls: toolCallEvents,
  };
}

/**
 * Check if a message should show thinking phases
 */
export function shouldShowThinkingPhase(
  message: UIMessage,
  toolCallEvents: ToolCallEvent[]
): boolean {
  return (
    message.role === 'assistant' &&
    toolCallEvents.length > 0
  );
}

/**
 * Get the current phase of a message based on tool call completion
 */
export function getCurrentMessagePhase(
  toolCallEvents: ToolCallEvent[]
): 'thinking' | 'results' | 'idle' {
  if (toolCallEvents.length === 0) {
    return 'idle';
  }
  
  // Check if any tools are still active
  const toolStates = new Map<string, boolean>();
  toolCallEvents.forEach(event => {
    if (event.type === 'tool-call-start') {
      toolStates.set(event.toolName, true);
    } else if (event.type === 'tool-call-end') {
      toolStates.set(event.toolName, false);
    }
  });
  
  const hasActiveTools = Array.from(toolStates.values()).some(active => active);
  
  return hasActiveTools ? 'thinking' : 'results';
}

/**
 * Format tool call events for display in thinking bubble
 */
export function formatToolCallsForDisplay(toolCallEvents: ToolCallEvent[]): string {
  if (toolCallEvents.length === 0) {
    return 'Processing your request...';
  }
  
  // Get unique tool names that have been called
  const calledTools = new Set(
    toolCallEvents
      .filter(event => event.type === 'tool-call-start')
      .map(event => event.toolName)
  );
  
  const completedTools = new Set(
    toolCallEvents
      .filter(event => event.type === 'tool-call-end' && event.success)
      .map(event => event.toolName)
  );
  
  const activeTools = new Set(
    Array.from(calledTools).filter(tool => !completedTools.has(tool))
  );
  
  // If there are active tools, show the current activity
  if (activeTools.size > 0) {
    const activeToolsArray = Array.from(activeTools);
    if (activeToolsArray.includes('find_document_ids')) {
      return 'Looking up documents...';
    } else if (activeToolsArray.includes('search_specific_documents')) {
      return 'Searching specific documents...';
    } else if (activeToolsArray.includes('search_all_documents')) {
      return 'Searching all documents...';
    }
    return 'Processing...';
  }
  
  // If all tools are completed, show completion message
  if (completedTools.size > 0) {
    return 'Analysis complete';
  }
  
  return 'Processing your request...';
}

/**
 * Check if message phases should be updated based on new tool call events
 */
export function shouldUpdatePhases(
  currentPhases: MessagePhase[],
  newToolCallEvents: ToolCallEvent[]
): boolean {
  const currentToolCallCount = currentPhases.reduce(
    (count, phase) => count + (phase.toolCalls?.length || 0),
    0
  );
  
  return newToolCallEvents.length !== currentToolCallCount;
}

/**
 * Merge existing phases with new tool call events
 */
export function updateMessagePhases(
  existingPhases: MessagePhase[],
  newToolCallEvents: ToolCallEvent[],
  messageContent: string
): MessagePhase[] {
  if (newToolCallEvents.length === 0) {
    return existingPhases;
  }
  
  const phases: MessagePhase[] = [];
  
  // Update or create thinking phase
  const thinkingContent = generateThinkingText(newToolCallEvents);
  phases.push({
    type: 'thinking',
    content: thinkingContent,
    toolCalls: newToolCallEvents,
    timestamp: Math.min(...newToolCallEvents.map(e => e.timestamp)),
  });
  
  // Update results phase with current message content
  const existingResults = existingPhases.find(p => p.type === 'results');
  phases.push({
    type: 'results',
    content: messageContent,
    timestamp: existingResults?.timestamp || Date.now(),
  });
  
  return phases;
}