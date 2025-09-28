import { PromptSection } from '../../prompt-builder';

const summaryExamples: PromptSection = {
  id: 'summary-examples',
  content: `## 5. Examples (SHOW GOOD OUTPUT)

## Good Summary Example (495 characters):
"This study explored how remote workers manage focus and productivity through 12 in-depth interviews conducted in March 2024. Participants included software developers, designers, and project managers from various companies. The research investigated daily routines, distraction management, and workspace setup preferences. Key themes emerged around the importance of boundaries, the role of technology tools, and surprising insights about the value of background noise for concentration."

Would you like a descriptive summary of any of the individual sources uploaded?

## Why This Works:
- **Specific details**: "12 interviews", "March 2024", "software developers, designers, project managers"
- **Natural narrative**: Flows conversationally without bullet points
- **Past tense**: "explored", "conducted", "investigated", "emerged"
- **Complete coverage**: Topic, method, participants, objectives, findings
- **Character count**: Under 500 limit
- **Follow-up offer**: Asks about individual document summaries`,
  variables: []
};

export default summaryExamples;