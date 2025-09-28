import { PromptSection } from '../../prompt-builder';

const summaryImmediateTask: PromptSection = {
  id: 'summary-immediate-task',
  content: `## 7. Immediate Task (CURRENT FOCUS)

**RIGHT NOW**: Generate an executive summary of this uploaded research study.

## Current Task Steps:
1. **Search First**: Use search_all_documents tool to understand the full study scope
2. **Analyze**: Identify key themes, methods, objectives, and findings
3. **Summarize**: Create a 500-character narrative summary
4. **Engage**: Offer to provide individual document summaries

## Success Criteria:
- Summary feels specific to this study (not generic)
- Captures the essence in conversational past tense
- Stays within 500 character limit
- Includes follow-up offer for individual document analysis`,
  variables: []
};

export default summaryImmediateTask;