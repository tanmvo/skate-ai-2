import { StudyMetadata, DocumentMetadata, MetadataContext } from './types/metadata';

/**
 * LLM-optimized formatting utilities for metadata context
 */

export function formatStudyOverview(study: StudyMetadata, maxTokens: number = 100): string {
  const overview = [
    `Study: "${study.name}"`,
    `Created: ${study.createdAt.toLocaleDateString()}`,
    `Documents: ${study.documentCount} (${study.documents.filter(d => d.status === 'READY').length} ready)`,
    `Searchable content: ${study.chunksWithEmbeddings} chunks`,
  ];

  let result = overview.join(' | ');
  
  // Rough token estimation and truncation if needed
  const estimatedTokens = Math.ceil(result.length / 4);
  if (estimatedTokens > maxTokens) {
    // Fallback to minimal format
    result = `Study: "${study.name}" | ${study.documentCount} docs, ${study.chunksWithEmbeddings} chunks`;
  }

  return result;
}

export function formatDocumentSummary(documents: DocumentMetadata[], maxTokens: number = 200): string {
  if (documents.length === 0) {
    return 'No documents available';
  }

  const readyDocs = documents.filter(doc => doc.status === 'READY' && doc.hasEmbeddings);
  
  if (readyDocs.length === 0) {
    return `${documents.length} documents found, but none are ready for search`;
  }

  let summary = `${readyDocs.length} searchable documents:\n`;
  let tokenCount = Math.ceil(summary.length / 4);

  for (let i = 0; i < readyDocs.length; i++) {
    const doc = readyDocs[i];
    const line = `• "${doc.fileName}" (${doc.fileType}, ${doc.chunkCount} chunks)\n`;
    const lineTokens = Math.ceil(line.length / 4);
    
    if (tokenCount + lineTokens > maxTokens && i > 0) {
      const remaining = readyDocs.length - i;
      summary += `• ... and ${remaining} more documents`;
      break;
    }
    
    summary += line;
    tokenCount += lineTokens;
  }

  return summary.trim();
}

export function formatContextForLLM(context: MetadataContext, maxTokens: number = 400): string {
  const sections: string[] = [];
  let tokenCount = 0;

  // Study overview (always include)
  const studyOverview = formatStudyOverview(context.study, 80);
  sections.push(studyOverview);
  tokenCount += Math.ceil(studyOverview.length / 4);

  // Available documents summary
  if (context.availableDocuments.length > 0 && tokenCount < maxTokens - 100) {
    const remainingTokens = maxTokens - tokenCount - 20; // Leave buffer
    const docSummary = formatDocumentSummary(context.availableDocuments, remainingTokens);
    sections.push('\nSearchable documents:');
    sections.push(docSummary);
  } else if (context.availableDocuments.length === 0) {
    sections.push('\nNo searchable documents available');
  }

  return sections.join('\n');
}

export function formatToolDescription(toolName: string, studyContext: string): string {
  const baseDescriptions = {
    search_all_documents: 'Search across all documents in the current study',
    search_specific_documents: 'Search within specific documents only',
  };

  const baseDesc = baseDescriptions[toolName as keyof typeof baseDescriptions] || 'Unknown tool';
  
  // Add context-specific guidance
  if (toolName === 'search_specific_documents') {
    return `${baseDesc}. Use when the user mentions specific document names or asks to search within particular files. ${studyContext}`;
  }
  
  if (toolName === 'search_all_documents') {
    return `${baseDesc}. Use for general queries that should search across all available documents. ${studyContext}`;
  }

  return baseDesc;
}

export function formatSearchResults(results: Array<{
  documentId: string;
  documentName: string;
  content: string;
  similarity: number;
}>, selectedTool: string, documentNames?: Record<string, string>): string {
  if (results.length === 0) {
    return `No relevant content found using ${selectedTool}`;
  }

  const formattedResults = results.map((result, index) => {
    const docName = documentNames?.[result.documentId] || result.documentName || 'Unknown document';
    const similarity = Math.round(result.similarity * 100);
    
    return `[${index + 1}] ${docName} (${similarity}% relevance)\n${result.content.trim()}`;
  }).join('\n\n---\n\n');

  return `Found ${results.length} relevant passages using ${selectedTool}:\n\n${formattedResults}`;
}

export function formatTokenUsageWarning(estimatedTokens: number, maxTokens: number): string {
  if (estimatedTokens > maxTokens * 0.8) {
    return `⚠️ Context approaching token limit (${estimatedTokens}/${maxTokens}). Some content may be truncated.`;
  }
  return '';
}

export function truncateContext(context: string, maxTokens: number): string {
  const estimatedTokens = Math.ceil(context.length / 4);
  
  if (estimatedTokens <= maxTokens) {
    return context;
  }

  // Calculate safe character limit
  const maxChars = maxTokens * 4 * 0.9; // 90% of limit for safety
  
  if (context.length <= maxChars) {
    return context;
  }

  // Truncate and add indicator
  const truncated = context.substring(0, maxChars - 50);
  const lastNewline = truncated.lastIndexOf('\n');
  
  // Try to break at a natural boundary
  if (lastNewline > maxChars * 0.5) {
    return truncated.substring(0, lastNewline) + '\n\n[Context truncated due to length...]';
  }
  
  return truncated + '\n\n[Context truncated due to length...]';
}

export function estimateTokenCount(text: string): number {
  // Simple estimation: 1 token ≈ 4 characters
  // This is rough but sufficient for basic token management
  return Math.ceil(text.length / 4);
}

export function formatErrorContext(error: string, studyId: string): string {
  return `Error loading context for study ${studyId}: ${error}. Using fallback search without metadata context.`;
}