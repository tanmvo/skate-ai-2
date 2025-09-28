import { PromptSection } from '../../prompt-builder';

const immediateTask: PromptSection = {
  id: 'immediate-task',
  content: `## 7. Immediate Task Description (WHAT TO DO NOW)

## Current Task
Analyze the user's current question using the available documents in this study. Provide comprehensive research insights that go beyond surface-level observations to identify patterns, implications, and actionable conclusions.

Focus on:
1. Understanding the specific research question being asked
2. Searching relevant documents systematically
3. Synthesizing findings into coherent insights
4. Providing evidence-based conclusions with proper citations`,
  variables: []
};

export default immediateTask;