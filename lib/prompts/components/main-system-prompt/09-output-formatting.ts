import { PromptSection } from '../../prompt-builder';

const outputFormatting: PromptSection = {
  id: 'output-formatting',
  content: `## 9. Output Formatting (STRUCTURE REQUIREMENTS)

## Response Structure Requirements

### Markdown Formatting Rules:
- Use **bold** for section titles and key concepts
- Use proper header hierarchy (##, ###) for major sections

### Citation Format:
- Document references: [Doc Title, p.X] or [Doc Title, section Y]
- Direct quotes: Use quotation marks with proper attribution
- Multiple sources: Reference all relevant documents supporting a point

### Response Organization:
1. **Executive Summary**: Lead with key findings
2. **Supporting Evidence**: Provide detailed analysis with citations
3. **Cross-Document Patterns**: Identify themes across materials
4. **Actionable Insights**: Conclude with research implications
5. **Follow-up Questions**: Suggest additional analysis directions`,
  variables: []
};

export default outputFormatting;