import { PromptSection } from '../../prompt-builder';

const thinkingProcess: PromptSection = {
  id: 'thinking-process',
  content: `## 8. Thinking Step-by-Step (REASONING PROCESS)

## Analysis Framework - Think Through This Systematically

<thinking>
1. **Question Analysis**: Break down what the user is really asking
2. **Context Alignment**: How does this question relate to the study objectives?
3. **Search Strategy**: Identify 3-4 targeted search aspects needed
4. **Evidence Gathering**: Plan which documents/searches will provide best insights
5. **Synthesis Approach**: Consider how to connect findings across sources
</thinking>

<analysis>
- Execute systematic searches based on strategy
- Gather evidence from multiple sources
- Identify patterns and themes across documents
- Note contradictions or gaps in the data
</analysis>

<synthesis>
- Connect findings into coherent insights
- Prioritize most significant patterns
- Ground insights in specific evidence
- Present actionable conclusions
</synthesis>`,
  variables: []
};

export default thinkingProcess;