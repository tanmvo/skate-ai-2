import { z } from 'zod';
import { tool } from 'ai';
import { findRelevantChunks, SearchResult } from '../vector-search';
import { validateDocumentAccess, getDocumentNames, findDocumentIdsByNames, getStudyDocumentContext, DocumentLookupResult } from '../data';

/**
 * Core search function tools for LLM function calling
 * These tools wrap the existing vector search functionality
 */

export interface SearchToolResult {
  results: SearchResult[];
  totalFound: number;
  searchScope: 'all' | 'specific';
  documentNames: Record<string, string>;
  toolUsed: string;
}

/**
 * Search across all documents in the study
 */
export async function searchAllDocuments(
  query: string,
  studyId: string,
  options: {
    limit?: number;
    minSimilarity?: number;
  } = {}
): Promise<SearchToolResult> {
  const { limit = 5, minSimilarity = 0.1 } = options;
  
  if (!query.trim()) {
    throw new Error('Search query cannot be empty');
  }
  
  if (!studyId) {
    throw new Error('Study ID is required');
  }
  
  // Use existing vector search with study filter
  const results = await findRelevantChunks(query, {
    studyId,
    limit,
    minSimilarity,
  });

  // Get document names for result formatting
  const documentIds = [...new Set(results.map(r => r.documentId))];
  const documentNames = await getDocumentNames(documentIds);

  return {
    results,
    totalFound: results.length,
    searchScope: 'all',
    documentNames,
    toolUsed: 'search_all_documents',
  };
}

/**
 * Search within specific documents only
 */
export async function searchSpecificDocuments(
  query: string,
  studyId: string,
  documentIds: string[],
  options: {
    limit?: number;
    minSimilarity?: number;
  } = {}
): Promise<SearchToolResult> {
  const { limit = 5, minSimilarity = 0.1 } = options;
  
  if (!query.trim()) {
    throw new Error('Search query cannot be empty');
  }
  
  if (!studyId) {
    throw new Error('Study ID is required');
  }
  
  if (documentIds.length === 0) {
    throw new Error('No document IDs provided for specific search');
  }

  // Validate that all documents belong to the study and user has access
  const hasAccess = await validateDocumentAccess(documentIds, studyId);
  if (!hasAccess) {
    throw new Error('Access denied to one or more specified documents');
  }

  // Use existing vector search with document filter
  const results = await findRelevantChunks(query, {
    studyId,
    documentIds,
    limit,
    minSimilarity,
  });

  // Get document names for result formatting
  const documentNames = await getDocumentNames(documentIds);

  return {
    results,
    totalFound: results.length,
    searchScope: 'specific',
    documentNames,
    toolUsed: 'search_specific_documents',
  };
}

/**
 * Format document lookup results for LLM consumption
 */
export function formatDocumentLookupResult(result: DocumentLookupResult): string {
  let response = '';
  
  // Success cases
  if (result.found.length > 0) {
    const readyDocs = result.found.filter(doc => doc.status === 'READY');
    const notReadyDocs = result.found.filter(doc => doc.status !== 'READY');
    
    if (readyDocs.length > 0) {
      response += `✅ Found ${readyDocs.length} document(s):\n`;
      readyDocs.forEach(doc => {
        response += `• "${doc.name}" → ${doc.id}\n`;
      });
      
      // Provide explicit next step instruction
      const readyIds = readyDocs.map(doc => `"${doc.id}"`).join(', ');
      response += `\n🔍 Next: Use search_specific_documents with document IDs: [${readyIds}]`;
    }
    
    // Handle not ready documents
    if (notReadyDocs.length > 0) {
      response += `${readyDocs.length > 0 ? '\n\n' : ''}⚠️ ${notReadyDocs.length} document(s) are still processing:\n`;
      notReadyDocs.forEach(doc => {
        response += `• "${doc.name}" (${doc.status})\n`;
      });
    }
  }
  
  // Failure cases with suggestions
  if (result.notFound.length > 0) {
    if (result.found.length > 0) {
      response += '\n\n';
    }
    response += `❌ Could not find: ${result.notFound.join(', ')}\n`;
    
    if (result.alternatives.length > 0) {
      response += '\n💡 Did you mean:\n';
      result.alternatives.forEach(alt => {
        response += `• Instead of "${alt.query}": ${alt.suggestions.join(', ')}\n`;
      });
    }
    
    if (result.availableDocuments.length > 0) {
      response += `\n📄 Available documents: ${result.availableDocuments.join(', ')}`;
      response += `\n\n🔍 Alternative: Use search_all_documents to search across all available documents`;
    }
  }
  
  return response.trim();
}

/**
 * Enhanced search context interface
 */
export interface SearchContext {
  studyDocumentCount?: number;
  availableDocuments?: string[];
  originalQuery?: string;
}

/**
 * Format search tool results for LLM consumption with enhanced error handling
 */
export function formatSearchToolResults(result: SearchToolResult, context?: SearchContext): string {
  if (result.totalFound === 0) {
    return buildEnhancedNoResultsResponse(result, context);
  }

  const scope = result.searchScope === 'all' 
    ? `all documents (${Object.keys(result.documentNames).length} searched)`
    : `${Object.keys(result.documentNames).length} specified documents`;

  let formatted = `Found ${result.totalFound} relevant passages in ${scope}:\n\n`;
  
  result.results.forEach((item, index) => {
    const docName = result.documentNames[item.documentId] || item.documentName;
    const similarity = Math.round(item.similarity * 100);
    
    formatted += `**${index + 1}. ${docName}** (${similarity}% relevance)\n`;
    formatted += `${item.content.trim()}\n\n`;
    
    if (index < result.results.length - 1) {
      formatted += '---\n\n';
    }
  });

  return formatted;
}

/**
 * Build enhanced no results response with actionable suggestions
 */
function buildEnhancedNoResultsResponse(result: SearchToolResult, context?: SearchContext): string {
  const searchedDocs = Object.values(result.documentNames);
  const scope = result.searchScope === 'all' ? 'all documents' : searchedDocs.join(', ');
  
  let response = `No relevant content found in ${scope}.`;
  
  // Add context-specific suggestions
  if (context?.studyDocumentCount && result.searchScope === 'specific') {
    const totalDocs = context.studyDocumentCount;
    const searchedCount = searchedDocs.length;
    
    if (totalDocs > searchedCount) {
      response += `\n\n💡 **Suggestions:**`;
      response += `\n• Try searching all ${totalDocs} documents with search_all_documents`;
      response += `\n• Use broader search terms`;
      response += `\n• Lower the similarity threshold (try minSimilarity: 0.05)`;
      
      if (context.availableDocuments && context.availableDocuments.length > searchedCount) {
        const otherDocs = context.availableDocuments.filter(doc => !searchedDocs.includes(doc));
        if (otherDocs.length > 0) {
          response += `\n• Search other available documents: ${otherDocs.slice(0, 3).join(', ')}${otherDocs.length > 3 ? '...' : ''}`;
        }
      }
    }
  } else if (result.searchScope === 'all') {
    response += `\n\n💡 **Suggestions:**`;
    response += `\n• Try different search terms or synonyms`;
    response += `\n• Use broader, more general terms`;
    response += `\n• Lower the similarity threshold (try minSimilarity: 0.05)`;
    response += `\n• Check if the content you're looking for might be in a different format`;
  }
  
  return response;
}

/**
 * Tool definitions for AI SDK function calling
 */
export const searchToolDefinitions = {
  search_all_documents: {
    description: 'Search across all documents in the current study for relevant content',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant content',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
          minimum: 1,
          maximum: 10,
        },
        minSimilarity: {
          type: 'number',
          description: 'Minimum similarity score for results (default: 0.1)',
          minimum: 0,
          maximum: 1,
        },
      },
      required: ['query'],
    },
  },
  search_specific_documents: {
    description: 'Search within specific documents only. Use when the user mentions specific document names or wants to search particular files.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant content',
        },
        documentIds: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Array of document IDs to search within',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
          minimum: 1,
          maximum: 10,
        },
        minSimilarity: {
          type: 'number',
          description: 'Minimum similarity score for results (default: 0.1)',
          minimum: 0,
          maximum: 1,
        },
      },
      required: ['query', 'documentIds'],
    },
  },
};

/**
 * Create AI SDK v5 compatible tool definitions using tool() function
 */
export function createSearchTools(studyId: string) {
  return {
    search_all_documents: tool({
      description: 'Search across all documents in the current study for relevant content',
      inputSchema: z.object({
        query: z.string().describe('The search query to find relevant content'),
        limit: z.number().min(1).max(15).optional().describe('Maximum number of results to return (default: 3, recommended: 10-15 for multi-document analysis)'),
        minSimilarity: z.number().min(0).max(1).optional().describe('Minimum similarity score for results (default: 0.1)'),
      }),
      execute: async ({ query, limit = 3, minSimilarity = 0.1 }) => {
        if (!query.trim()) {
          throw new Error('Search query cannot be empty');
        }

        try {
          const result = await searchAllDocuments(query, studyId, { limit, minSimilarity });
          const formattedResult = formatSearchToolResults(result);

          // Return formatted text for LLM (citation extraction will re-run search using input params)
          return formattedResult;
        } catch (error) {
          console.error('Search error:', error);
          throw error;
        }
      },
    }),
    find_document_ids: tool({
      description: 'Find document IDs by their filenames. Use this before search_specific_documents when users mention specific document names.',
      inputSchema: z.object({
        documentNames: z.array(z.string()).min(1).describe('Array of document filenames to look up (e.g., ["research.txt", "data.pdf"])'),
        includeAlternatives: z.boolean().optional().describe('Include similar document names if exact match fails (default: true)'),
      }),
      execute: async ({ documentNames }) => {
        if (!documentNames || documentNames.length === 0) {
          throw new Error('At least one document name is required');
        }

        try {
          const result = await findDocumentIdsByNames(documentNames, studyId);
          const formattedResult = formatDocumentLookupResult(result);
          return formattedResult;
        } catch (error) {
          console.error('Document lookup error:', error);
          throw error;
        }
      },
    }),
    search_specific_documents: tool({
      description: 'Search within specific documents only. Use when the user mentions specific document names or wants to search particular files.',
      inputSchema: z.object({
        query: z.string().describe('The search query to find relevant content'),
        documentIds: z.array(z.string()).min(1).describe('Array of document IDs to search within'),
        limit: z.number().min(1).max(15).optional().describe('Maximum number of results to return (default: 3, recommended: 10-15 for multi-document analysis)'),
        minSimilarity: z.number().min(0).max(1).optional().describe('Minimum similarity score for results (default: 0.1)'),
      }),
      execute: async ({ query, documentIds, limit = 3, minSimilarity = 0.1 }) => {
        if (!query.trim()) {
          throw new Error('Search query cannot be empty');
        }
        
        if (!documentIds || documentIds.length === 0) {
          throw new Error('At least one document ID is required for specific document search');
        }

        // Check if any of the provided IDs look like filenames instead of UUIDs
        const filenamePattern = /\.(txt|pdf|docx|doc)$/i;
        const potentialFilenames = documentIds.filter(id => filenamePattern.test(id));
        if (potentialFilenames.length > 0) {
          throw new Error(`Document IDs cannot be filenames. Found potential filenames: ${potentialFilenames.join(', ')}. Use find_document_ids tool first to convert filenames to document IDs.`);
        }

        try {
          const result = await searchSpecificDocuments(query, studyId, documentIds, { limit, minSimilarity });

          // Get study context for enhanced error messages
          let context: SearchContext | undefined;
          try {
            const studyContext = await getStudyDocumentContext(studyId);
            context = {
              studyDocumentCount: studyContext.totalDocuments,
              availableDocuments: studyContext.availableNames,
              originalQuery: query,
            };
          } catch (error) {
            console.warn('Failed to get study context for error formatting:', error);
          }

          const formattedResult = formatSearchToolResults(result, context);

          // Return formatted text for LLM (citation extraction will re-run search using input params)
          return formattedResult;
        } catch (error) {
          console.error('Specific document search error:', error);
          throw error;
        }
      },
    }),
  };
}


/**
 * Validate search tool parameters
 */
export function validateSearchParameters(toolName: string, parameters: Record<string, unknown>): string[] {
  const errors: string[] = [];
  
  if (!parameters.query || typeof parameters.query !== 'string') {
    errors.push('Query is required and must be a string');
  }
  
  if (parameters.limit !== undefined) {
    if (typeof parameters.limit !== 'number' || parameters.limit < 1 || parameters.limit > 10) {
      errors.push('Limit must be a number between 1 and 10');
    }
  }
  
  if (parameters.minSimilarity !== undefined) {
    if (typeof parameters.minSimilarity !== 'number' || parameters.minSimilarity < 0 || parameters.minSimilarity > 1) {
      errors.push('MinSimilarity must be a number between 0 and 1');
    }
  }
  
  if (toolName === 'search_specific_documents') {
    if (!parameters.documentIds || !Array.isArray(parameters.documentIds)) {
      errors.push('DocumentIds is required for specific document search and must be an array');
    } else if (parameters.documentIds.length === 0) {
      errors.push('At least one document ID is required for specific document search');
    }
  }
  
  return errors;
}