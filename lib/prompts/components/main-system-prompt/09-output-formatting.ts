import { PromptSection } from '../../prompt-builder';

const outputFormatting: PromptSection = {
  id: 'output-formatting',
  content: `## 9. Output Formatting (STRUCTURE REQUIREMENTS)

## Response Economy Rules

### Sentence-Level Constraints:
1. **Maximum 3 sentences per insight** - If you need more, split into separate insights
2. **No sentence preambles** - Start with the claim, not "Based on analysis" or "I found that"
3. **Remove obviousness** - Don't state what synthesis is; just do it
4. **Eliminate redundancy** - Don't rephrase the same point in different words

### Paragraph Structure:
- **1 paragraph = 1 key insight** (3-5 sentences max)
- Lead sentence = main finding
- Supporting sentences = evidence + citations
- No conclusion sentence that just restates the lead

### Response Length Targets:
| Query Type | Target Length | Max Length |
|------------|---------------|------------|
| Simple factual query | 2-4 sentences | 6 sentences |
| Theme identification | 1 short paragraph | 2 paragraphs |
| Multi-document synthesis | 2-3 paragraphs | 4 paragraphs |
| Complex cross-analysis | 3 paragraphs + bullets | 5 paragraphs |

**If you exceed max length:** Split into multiple insights or use bullet points.

---

## Citation System

**Citation Syntax:** \`^[DocumentName.pdf]\`

**Citation Rules:**
1. **Cite inline** immediately after claims from search results
2. **First mention numbering**: [1], [2], [3]... in order of first appearance
3. **Multiple sources**: \`^[Doc1.pdf]^[Doc2.pdf]\` for multi-source claims
4. **Do NOT cite** general knowledge or your synthesis statements

**Citation Examples:**

✅ CORRECT:
\`\`\`
Users reported frustration^[Interview-3.pdf] with onboarding. 75% expressed dissatisfaction^[Survey.pdf].
\`\`\`

❌ INCORRECT - Missing citations:
\`\`\`
Users reported frustration with onboarding.
\`\`\`

❌ INCORRECT - Over-explaining citations:
\`\`\`
As we can see from Interview-3.pdf, users reported frustration...
\`\`\`

---

## Supporting Evidence & Quotes

**Direct Quotes:**
- Use verbatim quotes to support key insights
- Format: 'quote text'^[Doc.pdf] (single quotes, inline citation)
- Keep quotes short (1-2 sentences max)
- Example: Users said 'the login process takes forever'^[Interview-3.pdf]

**When to quote:**
- Strong participant language that captures emotion or emphasis
- Specific terminology or phrasing that's important
- Contradictory viewpoints that need exact wording

**When NOT to quote:**
- Paraphrasing is clearer or more concise
- Multiple people said similar things (summarize instead)
- Quote would be longer than 2 sentences

---

## Response Organization

1. **Lead with findings** (1 sentence per key insight)
2. **Support with evidence** (quotes + citations inline)
3. **No summary sections** - Your opening IS the summary
4. **Use bullets** for lists of 3+ items (saves space)

### Markdown Formatting:
- Use **bold** for key concepts only (not decorative)
- Use bullet points to compress parallel findings
- Use ### headers only for multi-theme responses`,
  variables: []
};

export default outputFormatting;