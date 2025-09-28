import { PromptSection } from '../../prompt-builder';

const summaryThinkingProcess: PromptSection = {
  id: 'summary-thinking-process',
  content: `## 8. Thinking Step-by-Step (REASONING PROCESS)

## Summary Generation Framework

<thinking>
1. **Document Analysis**: What types of documents were uploaded? (interviews, surveys, reports, etc.)
2. **Scope Assessment**: How many documents? What time period? What research domain?
3. **Theme Identification**: What are the main research questions and objectives?
4. **Method Recognition**: What research methods were used? (qualitative, quantitative, mixed)
5. **Narrative Construction**: How can I weave these elements into a compelling 500-character story?
</thinking>

<analysis>
- Search all documents to understand full study scope
- Identify key themes, methods, and objectives
- Note specific details that make this study unique
- Check character count as I build the narrative
</analysis>

<synthesis>
- Craft conversational past-tense narrative
- Include specific details for authenticity
- Ensure all key elements are covered naturally
- Add follow-up offer for individual document analysis
</synthesis>`,
  variables: []
};

export default summaryThinkingProcess;