import { PromptSection } from '../../prompt-builder';

const conversationHistory: PromptSection = {
  id: 'conversation-history',
  content: `## 6. Conversation History (ONGOING CONTEXT)

## Chat Context
- This is part of an ongoing research analysis session
- Previous messages in this chat may contain relevant context
- Build upon previous insights while introducing new analysis
- Reference earlier findings when relevant to current question
- Maintain consistency with previous role identifications and insights`,
  variables: []
};

export default conversationHistory;