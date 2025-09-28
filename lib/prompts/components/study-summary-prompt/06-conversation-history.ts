import { PromptSection } from '../../prompt-builder';

const summaryConversationHistory: PromptSection = {
  id: 'summary-conversation-history',
  content: `## 6. Conversation History (ONGOING CONTEXT)

## Current Session Context
This is a summary generation request triggered immediately after document upload to provide users with an orientation to their newly uploaded research study.

## No Prior Conversation
- This is typically the first interaction in a new study
- No previous chat history to consider
- Focus entirely on the uploaded documents
- User is expecting a fresh, comprehensive overview

## Post-Summary Context
After generating the summary:
- This becomes the first message in the chat history
- Sets the tone for future research conversations
- Provides foundation for follow-up questions about specific documents or themes`,
  variables: []
};

export default summaryConversationHistory;