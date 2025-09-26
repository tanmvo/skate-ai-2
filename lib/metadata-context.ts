import { DocumentReference, SearchContext } from './types/metadata';
import { getMetadataContext } from './metadata-collector';
import { getStudyDocumentReferences } from './data';

/**
 * Context generation utilities for LLM function calling
 */

export async function buildStudyContext(studyId: string): Promise<string> {
  try {
    const context = await getMetadataContext(studyId);

    if (!context) {
      return 'No study context available.';
    }

    const { study, availableDocuments, readyDocuments, searchableChunks } = context;
    
    // Build concise context string optimized for LLM consumption
    const contextParts: string[] = [];
    
    // Basic study info
    contextParts.push(`Study: "${study.name}"`);
    contextParts.push(`Documents: ${study.documentCount} total, ${readyDocuments} ready, ${availableDocuments.length} searchable`);
    contextParts.push(`Content: ${searchableChunks} searchable chunks`);
    
    // Document list for reference
    if (availableDocuments.length > 0) {
      contextParts.push('\nAvailable documents:');
      availableDocuments.forEach((doc, index) => {
        contextParts.push(`${index + 1}. "${doc.fileName}" (${doc.chunkCount} chunks)`);
      });
    }

    return contextParts.join('\n');
    
  } catch (error) {
    console.error('Error building study context:', error);
    return 'Error loading study context.';
  }
}

export async function buildSearchContext(studyId: string, targetDocuments?: string[]): Promise<SearchContext> {
  try {
    const availableDocuments = await getStudyDocumentReferences(studyId);
    
    const searchContext: SearchContext = {
      studyId,
      availableDocuments,
      searchScope: targetDocuments ? 'specific' : 'all',
    };

    if (targetDocuments && targetDocuments.length > 0) {
      // Filter to only include specified documents that exist
      const validDocuments = availableDocuments.filter(doc => 
        targetDocuments.includes(doc.id)
      );
      
      searchContext.targetDocuments = validDocuments.map(doc => doc.id);
    }

    return searchContext;
    
  } catch (error) {
    console.error('Error building search context:', error);
    throw new Error(`Failed to build search context: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function formatDocumentList(documents: DocumentReference[], maxTokens: number = 200): string {
  if (documents.length === 0) {
    return 'No documents available';
  }

  let result = '';
  let tokenCount = 0;
  
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const line = `${i + 1}. "${doc.name}" (${doc.chunkCount} chunks)\n`;
    
    // Rough token estimation (1 token ≈ 4 characters)
    const lineTokens = Math.ceil(line.length / 4);
    
    if (tokenCount + lineTokens > maxTokens && i > 0) {
      const remaining = documents.length - i;
      result += `... and ${remaining} more documents`;
      break;
    }
    
    result += line;
    tokenCount += lineTokens;
  }

  return result.trim();
}

export function extractDocumentReferences(query: string, availableDocuments: DocumentReference[]): string[] {
  const documentIds: string[] = [];
  const queryLower = query.toLowerCase();
  
  // Look for explicit document name mentions
  for (const doc of availableDocuments) {
    const docNameLower = doc.name.toLowerCase();
    
    // Check for exact name match or partial matches
    if (queryLower.includes(docNameLower) || 
        queryLower.includes(`"${docNameLower}"`) ||
        queryLower.includes(`'${docNameLower}'`)) {
      documentIds.push(doc.id);
    }
  }
  
  return documentIds;
}

export function shouldUseSpecificDocuments(query: string, availableDocuments: DocumentReference[]): boolean {
  const queryLower = query.toLowerCase();
  
  // Check for specific document indicators
  const specificIndicators = [
    'in document',
    'from document',
    'in file',
    'from file',
    'this document',
    'that document',
    'document titled',
    'file named',
  ];
  
  const hasSpecificIndicator = specificIndicators.some(indicator => 
    queryLower.includes(indicator)
  );
  
  if (hasSpecificIndicator) {
    return true;
  }
  
  // Check if specific documents are mentioned
  const referencedDocs = extractDocumentReferences(query, availableDocuments);
  return referencedDocs.length > 0;
}

export function buildToolSelectionPrompt(
  studyContext: string, 
  availableDocuments: DocumentReference[],
  query: string
): string {
  const shouldUseSpecific = shouldUseSpecificDocuments(query, availableDocuments);
  const referencedDocs = extractDocumentReferences(query, availableDocuments);
  
  let prompt = `${studyContext}\n\nAvailable search tools:
- search_all_documents: Search across all documents in the study
- search_specific_documents: Search within specific documents only

Current query: "${query}"
`;

  if (shouldUseSpecific && referencedDocs.length > 0) {
    const referencedNames = referencedDocs
      .map(id => availableDocuments.find(doc => doc.id === id)?.name)
      .filter(Boolean)
      .map(name => `"${name}"`)
      .join(', ');
    
    prompt += `\nQuery appears to reference specific documents: ${referencedNames}
Use search_specific_documents with these document IDs: ${referencedDocs.join(', ')}`;
  } else {
    prompt += `\nQuery appears to be general - use search_all_documents to search across all available documents.`;
  }

  return prompt;
}