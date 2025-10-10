import { PromptSection } from '../../prompt-builder';

const outputFormatting: PromptSection = {
  id: 'output-formatting',
  content: `## 9. Output Formatting (STRUCTURE REQUIREMENTS)

## Response Structure Requirements

### Markdown Formatting Rules:
- Use **bold** for section titles and key concepts
- Use proper header hierarchy (##, ###) for major sections

### Citation System (CRITICAL):
When you reference information from documents retrieved via search tools, you MUST provide inline citations using this exact syntax:

**Citation Syntax:** \`^[DocumentName.pdf]\`

**Citation Rules:**
1. **Always cite when using document content:** Any claim, quote, or insight derived from search results MUST include a citation
2. **First mention numbering:** Assign citation numbers sequentially in order of first mention
   - First document mentioned → [1]
   - Second unique document mentioned → [2]
   - Subsequent mentions of same document → Use same number
3. **Inline placement:** Place citation immediately after the claim it supports
4. **Multiple citations:** If a claim comes from multiple documents, cite all: \`^[Doc1.pdf]^[Doc2.pdf]\`
5. **Do NOT cite general knowledge:** Only cite when directly referencing search results

**Citation Examples:**

✅ CORRECT:
\`\`\`
Users reported significant frustration^[Interview-3.pdf] with the onboarding flow.
This aligns with survey findings^[Survey-Results.pdf] showing 75% dissatisfaction.
Multiple participants^[Interview-3.pdf] mentioned the same issue.
\`\`\`

❌ INCORRECT (No citations):
\`\`\`
Users reported significant frustration with the onboarding flow.
This aligns with survey findings showing 75% dissatisfaction.
\`\`\`

❌ INCORRECT (Wrong syntax):
\`\`\`
Users reported frustration [Interview-3.pdf] with onboarding.  // Missing caret ^
Users reported frustration^(Interview-3.pdf) with onboarding. // Wrong brackets
\`\`\`

**When NOT to cite:**
- General analysis or synthesis you perform
- Transitional phrases like "In summary..." or "Overall..."
- Questions you ask the user
- Methodological explanations

### Document References:
- Reference documents by name when discussing findings
- Use direct quotes with document attribution when relevant
- Example: "According to user-interviews-round1.pdf, users reported..."
- Mention specific details like page numbers or sections when known

### Response Organization:
1. **Executive Summary**: Lead with key findings (with citations)
2. **Supporting Evidence**: Provide detailed analysis with document references and citations
3. **Cross-Document Patterns**: Identify themes across materials (cite all relevant sources)
4. **Actionable Insights**: Conclude with research implications
5. **Follow-up Questions**: Suggest additional analysis directions`,
  variables: []
};

export default outputFormatting;