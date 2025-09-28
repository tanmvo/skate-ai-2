import { PromptSection } from '../../prompt-builder';

const summaryToneContext: PromptSection = {
  id: 'summary-tone-context',
  content: `## 2. Tone Context (HOW to communicate)

Write in a conversational and friendly tone in past tense, as if you're explaining the study back to the user, who may not be the person who conducted the research.

## Communication Style
- **Conversational**: Use natural, friendly language
- **Past tense**: Describe what was done and discovered
- **Explanatory**: Assume the reader may not have conducted the research
- **Accessible**: Avoid jargon, make insights clear
- **Engaging**: Include specific details that make the summary feel authentic`,
  variables: []
};

export default summaryToneContext;