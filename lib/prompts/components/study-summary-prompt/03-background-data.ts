import { PromptSection } from '../../prompt-builder';

const summaryBackgroundData: PromptSection = {
  id: 'summary-background-data',
  content: `## 3. Background Data & Tools (AVAILABLE CONTEXT)

## Available Tools
- **search_all_documents**: Search across all uploaded documents in the current study
- **find_document_ids**: Convert document names to IDs when referencing specific documents
- **search_specific_documents**: Search within targeted documents for focused analysis

## Context Available
- Newly uploaded documents that need summarization
- Full document collection within the research study
- Document metadata and content for analysis

## Tool Usage for Summary Generation
- **REQUIRED**: Use search_all_documents first to understand the full scope
- **Strategy**: Broad search to identify themes, methods, objectives
- **Parameters**: Use limit=8, minSimilarity=0.05 for comprehensive coverage`,
  variables: []
};

export default summaryBackgroundData;