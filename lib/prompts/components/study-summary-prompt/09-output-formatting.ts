import { PromptSection } from '../../prompt-builder';

const summaryOutputFormatting: PromptSection = {
  id: 'summary-output-formatting',
  content: `## 9. Output Formatting (STRUCTURE REQUIREMENTS)

## Summary Format Requirements

### Structure:
1. **Main Summary**: Single paragraph, maximum 500 characters
2. **Follow-up Question**: Simple, friendly offer for individual document analysis

### Formatting Rules:
- **No bullet points** in the main summary
- **No formal headings** within the summary
- **Conversational tone** throughout
- **Past tense verbs** for all actions
- **Specific details** woven naturally into narrative

### Character Count:
- **Hard limit**: 500 characters maximum for main summary
- **Count carefully**: Include spaces and punctuation
- **Optimize**: Every word must add value

### Example Format:

[Main summary paragraph in past tense, maximum 500 characters, covering topic, purpose, method, and key findings with specific details woven naturally]

Would you like a descriptive summary of any of the individual sources uploaded?
`,
  variables: []
};

export default summaryOutputFormatting;