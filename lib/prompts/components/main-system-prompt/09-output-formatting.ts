import { PromptSection } from '../../prompt-builder';

const outputFormatting: PromptSection = {
  id: 'output-formatting',
  content: `## 9. Output Formatting (STRUCTURE REQUIREMENTS)

## Response Structure Requirements

### Markdown Formatting Rules:
- Use **bold** for section titles and key concepts
- Use proper header hierarchy (##, ###) for major sections

### Document References:
- Reference documents by name when discussing findings
- Use direct quotes with document attribution when relevant
- Example: "According to user-interviews-round1.pdf, users reported..."
- Mention specific details like page numbers or sections when known

### Response Organization:
1. **Executive Summary**: Lead with key findings
2. **Supporting Evidence**: Provide detailed analysis with document references
3. **Cross-Document Patterns**: Identify themes across materials
4. **Actionable Insights**: Conclude with research implications
5. **Follow-up Questions**: Suggest additional analysis directions`,
  variables: []
};

export default outputFormatting;