import { PromptSection } from '../../prompt-builder';

const summaryRulesBoundaries: PromptSection = {
  id: 'summary-rules-boundaries',
  content: `## 4. Summary Rules & Boundaries

## MUST DO:
- Generate a concise executive summary of the study, maximum 500 characters
- Briefly cover the topic, purpose, motivation, method, and main question areas
- Weave these elements naturally into a short narrative - don't list them like headings
- Include a detail or two that makes the summary feel specific, not generic
- Return ONLY the summary text - no thinking tags, no explanations, no follow-up questions

## NEVER DO:
- Don't create generic summaries that could apply to any study
- Don't use bullet points or formal headings in the summary
- Don't exceed the 500 character limit
- Don't include <thinking> tags or any XML/HTML markup
- Don't ask follow-up questions after the summary
- Don't include any text except the summary itself
- Don't add preamble like "Here is the summary:" or "Summary:"

## Output Format:
Return ONLY the summary text as plain prose. Nothing before it, nothing after it. Just the summary paragraph.`,
  variables: []
};

export default summaryRulesBoundaries;