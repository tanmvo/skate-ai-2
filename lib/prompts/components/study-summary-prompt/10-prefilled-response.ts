import { PromptSection } from '../../prompt-builder';

const summaryPrefilledResponse: PromptSection = {
  id: 'summary-prefilled-response',
  content: `## 10. Prefilled Response (GUIDE OUTPUT STYLE)

Based on the document excerpts provided, your response should begin immediately with the summary text. No preamble, no analysis explanation, just the summary paragraph itself.

Example good response format:
"This study explored how designers manage client communication through interviews with five freelance professionals. Participants discussed workflow challenges around time tracking and invoicing, with one designer noting they spend 'almost 10 hours a month just chasing invoices.'"

Example bad response format:
"Let me analyze the documents to understand the full scope of this research study.

<thinking>
Analyzing document types...
</thinking>

This study explored..."`,
  variables: []
};

export default summaryPrefilledResponse;