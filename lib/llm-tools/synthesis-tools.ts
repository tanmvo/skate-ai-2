import { z } from 'zod';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { searchAllDocuments, searchSpecificDocuments, SearchToolResult } from './search-tools';
import { structuredResponseSchema } from '../schemas/synthesis-schema';

/**
 * Groups search results by document for document-level citations
 */
interface DocumentGroup {
  documentId: string;
  documentName: string;
  chunks: Array<{
    content: string;
    similarity: number;
    chunkIndex: number;
  }>;
}

/**
 * Group search results by document to enable document-level citations
 */
function groupResultsByDocument(searchResults: SearchToolResult['results']): DocumentGroup[] {
  const groups = new Map<string, DocumentGroup>();
  
  for (const result of searchResults) {
    if (!groups.has(result.documentId)) {
      groups.set(result.documentId, {
        documentId: result.documentId,
        documentName: result.documentName,
        chunks: []
      });
    }
    
    const group = groups.get(result.documentId)!;
    group.chunks.push({
      content: result.content,
      similarity: result.similarity,
      chunkIndex: result.chunkIndex
    });
  }
  
  // Sort chunks by similarity within each document
  for (const group of groups.values()) {
    group.chunks.sort((a, b) => b.similarity - a.similarity);
  }
  
  return Array.from(groups.values());
}

/**
 * Create a synthesis prompt for the LLM
 */
function buildSynthesisPrompt(researchQuestion: string, documentGroups: DocumentGroup[]): string {
  let prompt = `You are a research assistant synthesizing findings from multiple documents. Your task is to:

1. **Analyze** the provided search results to answer the research question
2. **Synthesize** insights from across documents  
3. **Generate** a structured response with inline citations

## Research Question:
${researchQuestion}

## Available Documents and Content:
`;

  documentGroups.forEach((group, index) => {
    const docId = `doc${index + 1}`;
    prompt += `\n### Document ${index + 1}: "${group.documentName}" (ID: ${docId})\n`;
    
    // Include top 3 most relevant chunks per document
    const topChunks = group.chunks.slice(0, 3);
    topChunks.forEach((chunk, chunkIndex) => {
      prompt += `\n**Chunk ${chunkIndex + 1} (${Math.round(chunk.similarity * 100)}% relevance):**\n`;
      prompt += `${chunk.content}\n`;
    });
  });

  prompt += `

## Instructions:
1. **Synthesize insights** from the provided content to answer the research question
2. **Use inline citations** in the format {{cite:doc1}}, {{cite:doc2}}, etc. to reference specific documents
3. **Create document citations** with representative quotes that support your findings
4. **Structure your response** to be clear, comprehensive, and well-supported by evidence

## Response Format:
- **response**: Your main analysis with inline citation markers {{cite:docX}}
- **citations**: Array of document-level citations with representative text
- **metadata**: Summary of your synthesis process

Focus on generating insights, identifying patterns, and providing a comprehensive analysis rather than just restating information.`;

  return prompt;
}

/**
 * Create synthesis tools for AI function calling
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSynthesisTools(studyId: string, dataStream: any) {
  return {
    synthesize_research_findings: {
      description: 'Search documents and synthesize findings with precise inline source attribution. Use for complex analysis, theme identification, pattern recognition, and multi-document insights.',
      parameters: z.object({
        researchQuestion: z.string().describe('The main research question or analysis request to address'),
        searchQueries: z.array(z.string()).min(1).max(5).describe('Multiple search queries to gather comprehensive information (1-5 queries)'),
        documentIds: z.array(z.string()).optional().describe('Specific document IDs to search, if any (leave empty to search all documents)'),
      }),
      execute: async ({ researchQuestion, searchQueries, documentIds }: {
        researchQuestion: string;
        searchQueries: string[];
        documentIds?: string[];
      }) => {
        // Emit tool call start event
        dataStream.writeData({
          type: 'tool-call-start',
          toolName: 'synthesize_research_findings',
          parameters: { researchQuestion, searchQueries, documentIds },
          timestamp: Date.now()
        });

        try {
          // Step 1: Execute multiple searches to gather comprehensive data
          const allSearchResults = [];
          const searchFunction = documentIds && documentIds.length > 0
            ? (query: string) => searchSpecificDocuments(query, studyId, documentIds, { limit: 8 })
            : (query: string) => searchAllDocuments(query, studyId, { limit: 8 });

          // Collect search results from all queries with progress updates
          for (let i = 0; i < searchQueries.length; i++) {
            const query = searchQueries[i];
            
            // Stream progress update
            dataStream.writeData({
              type: 'synthesis-progress',
              stage: 'searching',
              progress: {
                current: i + 1,
                total: searchQueries.length,
                query: query,
                message: `Searching: ${query}`
              },
              timestamp: Date.now()
            });

            try {
              const result = await searchFunction(query);
              allSearchResults.push(...result.results);
              
              // Stream search completion
              dataStream.writeData({
                type: 'synthesis-progress',
                stage: 'search-complete',
                progress: {
                  current: i + 1,
                  total: searchQueries.length,
                  query: query,
                  resultCount: result.results.length,
                  message: `Found ${result.results.length} results for: ${query}`
                },
                timestamp: Date.now()
              });
              
            } catch (error) {
              console.warn(`Search failed for query "${query}":`, error);
              
              // Stream search error
              dataStream.writeData({
                type: 'synthesis-progress',
                stage: 'search-error',
                progress: {
                  current: i + 1,
                  total: searchQueries.length,
                  query: query,
                  error: error instanceof Error ? error.message : 'Unknown error',
                  message: `Search failed: ${query}`
                },
                timestamp: Date.now()
              });
            }
          }

          if (allSearchResults.length === 0) {
            throw new Error('No search results found for any of the provided queries');
          }

          // Step 2: Group results by document for document-level citations
          dataStream.writeData({
            type: 'synthesis-progress',
            stage: 'grouping',
            progress: {
              message: `Organizing ${allSearchResults.length} results from ${new Set(allSearchResults.map(r => r.documentId)).size} documents`
            },
            timestamp: Date.now()
          });

          const documentGroups = groupResultsByDocument(allSearchResults);
          
          if (documentGroups.length === 0) {
            throw new Error('No document groups created from search results');
          }

          // Step 3: Use generateObject to create structured synthesis
          dataStream.writeData({
            type: 'synthesis-progress',
            stage: 'analyzing',
            progress: {
              message: `Analyzing insights across ${documentGroups.length} documents...`
            },
            timestamp: Date.now()
          });

          const synthesis = await generateObject({
            model: anthropic('claude-3-5-sonnet-20241022'),
            schema: structuredResponseSchema,
            prompt: buildSynthesisPrompt(researchQuestion, documentGroups),
            temperature: 0.1,
          });

          // Step 4: Stream the structured response with unique identifier
          const synthesisId = `synthesis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          dataStream.writeData({
            type: 'synthesis-complete',
            synthesis: synthesis.object,
            timestamp: Date.now(),
            synthesisId
          });

          // Emit tool call success event
          dataStream.writeData({
            type: 'tool-call-end',
            toolName: 'synthesize_research_findings',
            success: true,
            timestamp: Date.now()
          });

          return `Research synthesis complete. Generated structured analysis with ${synthesis.object.citations.length} document citations from ${documentGroups.length} documents.`;

        } catch (error) {
          // Emit tool call error event
          dataStream.writeData({
            type: 'tool-call-end',
            toolName: 'synthesize_research_findings',
            success: false,
            timestamp: Date.now()
          });
          
          console.error('Synthesis tool error:', error);
          throw new Error(`Synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      },
    },
  };
}