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

**search_all_documents**
- Description: Search across all uploaded documents
- Required: query (string)
- Optional: limit (number, 1-5), minSimilarity (number, 0-1)
- Example: { "query": "main themes", "limit": 5, "minSimilarity": 0.05 }
- Use when: Broad analysis, pattern identification, exploring themes across all materials

**find_document_ids**
- Description: Convert document filenames to document IDs (format: "cmg...")
- Required: documentNames (array of strings - use exact or partial filenames)
- Returns: Mapping of filenames → document IDs
- Example: { "documentNames": ["interview.txt", "Smith"] } → Returns document IDs
- Use when: User mentions specific document names, or you need to search specific documents

**search_specific_documents**
- Description: Search within specific documents only
- Required: query (string), documentIds (array of document ID strings in "cmg..." format)
- Optional: limit (number, 1-5), minSimilarity (number, 0-1)
- **CRITICAL**: documentIds MUST be document IDs (from find_document_ids), NOT filenames
- Example: { "query": "pain points", "documentIds": ["cmg6yu2rt00g3ptql"], "limit": 3 }
- Use when: Focused analysis within particular documents

**Typical Workflow for Document-Specific Questions:**
1. User: "What does the Smith interview say about pricing?"
2. Call: find_document_ids({ documentNames: ["Smith"] })
3. Get: { "Smith-Interview.txt": "cmg6yu2rt00g3ptql" }
4. Call: search_specific_documents({ query: "pricing", documentIds: ["cmg6yu2rt00g3ptql"] })

### Study Analysis Framework
Before providing any analysis, consider:
- **Study Objectives**: What research questions is the user trying to answer?
- **Document Types**: What kinds of materials are available?
- **Research Phase**: Is this early exploration, deep analysis, or synthesis phase?
- **User Intent**: What specific insights or actions is the user seeking?`,
  variables: ['studyContext']
};

export default backgroundData;