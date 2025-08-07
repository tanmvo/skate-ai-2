import { Message } from "ai/react";
import { ToolInvocationData, isSearchTool } from "./tool-execution";

/**
 * Types for rendering chat items including messages and tool steps
 */

export type ChatItem = 
  | { type: 'message'; message: Message }
  | { type: 'tool-step'; toolInvocation: ToolInvocationData; messageId: string };

/**
 * Convert messages with tool invocations into a flat list of chat items
 */
export function expandMessagesToChatItems(messages: Message[]): ChatItem[] {
  const items: ChatItem[] = [];
  
  console.log('Messages received:', messages.map(m => ({
    id: m.id,
    role: m.role,
    content: m.content.substring(0, 100) + '...',
    toolInvocations: m.toolInvocations?.length || 0,
    parts: (m as unknown as { parts?: unknown[] }).parts?.length || 'no parts'
  })));
  
  for (const message of messages) {
    if (message.role === 'user') {
      items.push({ type: 'message', message });
    } else if (message.role === 'assistant') {
      // Try to use message.parts if available (AI SDK v4 approach)
      const messageParts = (message as unknown as { parts?: Array<{ type: string; text?: string; toolInvocation?: ToolInvocationData }> }).parts;
      
      if (messageParts && Array.isArray(messageParts)) {
        // Process parts sequentially
        let currentTextContent = '';
        
        for (const part of messageParts) {
          if (part.type === 'text') {
            currentTextContent += part.text;
          } else if (part.type === 'tool-invocation') {
            // Add any accumulated text as a message
            if (currentTextContent.trim()) {
              items.push({ 
                type: 'message', 
                message: { 
                  ...message, 
                  content: currentTextContent.trim(),
                  id: `${message.id}-text-${items.length}`
                } 
              });
              currentTextContent = '';
            }
            
            // Add the tool invocation
            if (isSearchTool(part.toolInvocation.toolName)) {
              items.push({ 
                type: 'tool-step', 
                toolInvocation: part.toolInvocation as ToolInvocationData, 
                messageId: message.id 
              });
            }
          }
        }
        
        // Add any remaining text content
        if (currentTextContent.trim()) {
          items.push({ 
            type: 'message', 
            message: { 
              ...message, 
              content: currentTextContent.trim(),
              id: `${message.id}-text-final`
            } 
          });
        }
      } else {
        // Fallback to the old approach if parts are not available
        items.push({ type: 'message', message });
        
        if (message.toolInvocations) {
          for (const toolInvocation of message.toolInvocations) {
            if (isSearchTool(toolInvocation.toolName)) {
              items.push({ 
                type: 'tool-step', 
                toolInvocation: toolInvocation as ToolInvocationData, 
                messageId: message.id 
              });
            }
          }
        }
      }
    }
  }
  
  return items;
}