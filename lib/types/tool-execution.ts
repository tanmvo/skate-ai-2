/**
 * Types and utilities for progressive tool call UI
 * Based on AI SDK ToolInvocation types
 */

export interface ToolInvocationData {
  state: 'partial-call' | 'call' | 'result';
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

/**
 * Extract search query from tool invocation arguments
 */
export function extractSearchQuery(args: unknown): string | null {
  if (!args || typeof args !== 'object') {
    return null;
  }
  
  const argsRecord = args as Record<string, unknown>;
  if (typeof argsRecord.query === 'string') {
    return argsRecord.query;
  }
  
  return null;
}

/**
 * Parse result count from search tool response
 */
export function parseResultCount(result: unknown): number | null {
  if (!result) {
    return null;
  }
  
  let resultText = '';
  if (typeof result === 'string') {
    resultText = result;
  } else if (typeof result === 'object' && result.toString) {
    resultText = result.toString();
  }
  
  // Look for patterns like "Found 7 relevant passages"
  const countMatch = resultText.match(/Found (\d+) relevant passages?/i);
  if (countMatch) {
    return parseInt(countMatch[1], 10);
  }
  
  // Alternative pattern: "7 relevant passages found"
  const altCountMatch = resultText.match(/(\d+) relevant passages? found/i);
  if (altCountMatch) {
    return parseInt(altCountMatch[1], 10);
  }
  
  return null;
}

/**
 * Get display name for tool
 */
export function getToolDisplayName(toolName: string): string {
  switch (toolName) {
    case 'search_all_documents':
      return 'Searching all documents';
    case 'search_specific_documents':
      return 'Searching specific documents';
    case 'find_document_ids':
      return 'Finding documents';
    default:
      return 'Running tool';
  }
}

/**
 * Check if tool invocation is search-related
 */
export function isSearchTool(toolName: string): boolean {
  return [
    'search_all_documents',
    'search_specific_documents', 
    'find_document_ids'
  ].includes(toolName);
}