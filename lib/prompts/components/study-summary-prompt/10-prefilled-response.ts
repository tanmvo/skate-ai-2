import { PromptSection } from '../../prompt-builder';

const summaryPrefilledResponse: PromptSection = {
  id: 'summary-prefilled-response',
  content: `## 10. Prefilled Response (GUIDE OUTPUT STYLE)

I'll analyze all the uploaded documents to understand the scope and generate a concise study summary.

[Begin analysis of the uploaded research study documents]`,
  variables: []
};

export default summaryPrefilledResponse;