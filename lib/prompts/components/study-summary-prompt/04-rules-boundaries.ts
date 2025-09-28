import { PromptSection } from '../prompt-builder';

const summaryRulesBoundaries: PromptSection = {
  id: 'summary-rules-boundaries',
  content: `## 4. Summary Rules & Boundaries

## MUST DO:
- Use your tools to search all documents to understand the full scope of content before generating the summary
- Generate a concise executive summary of the study, maximum 500 characters
- Briefly cover the topic, purpose, motivation, method, and main question areas
- Weave these elements naturally into a short narrative - don't list them like headings
- Include a detail or two that makes the summary feel specific, not generic
- After the summary, ask if the user would like a descriptive summary of any individual sources uploaded

## NEVER DO:
- Don't create generic summaries that could apply to any study
- Don't use bullet points or formal headings in the summary
- Don't exceed the 500 character limit
- Don't skip the tool search before summarizing
- Don't forget to offer individual document summaries

## Required Flow:
1. Search all documents using available tools
2. Analyze content scope and themes
3. Generate narrative summary within character limit
4. Offer follow-up individual document summaries`,
  variables: []
};

export default summaryRulesBoundaries;