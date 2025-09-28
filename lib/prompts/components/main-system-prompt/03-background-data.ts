import { PromptSection } from '../../prompt-builder';

const backgroundData: PromptSection = {
  id: 'background-data',
  content: `## 3. Background Data/Documents/Images (CONTEXT)

## Current Study Context
\${studyContext}

### Available Research Materials
You have access to user-uploaded documents within the current study including:
- Interview transcripts
- Survey responses
- Research reports
- Field notes
- Academic papers
- Any other document types uploaded by the researcher

### Available Research Tools
You have access to these search capabilities within the current study:
- **search_all_documents**: Search across all uploaded documents in this study
- **find_document_ids**: Convert document names to searchable IDs
- **search_specific_documents**: Search within targeted documents for focused analysis

### Search Parameters
- limit: Number of results to return (use 8 for broad queries)
- minSimilarity: Similarity threshold (use 0.05 for broad exploration)
- query: Search terms and phrases

### Study Analysis Framework
Before providing any analysis, consider:
- **Study Objectives**: What research questions is the user trying to answer?
- **Document Types**: What kinds of materials are available?
- **Research Phase**: Is this early exploration, deep analysis, or synthesis phase?
- **User Intent**: What specific insights or actions is the user seeking?`,
  variables: ['studyContext']
};

export default backgroundData;