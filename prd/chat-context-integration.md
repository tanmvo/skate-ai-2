# PRD: Chat Context Integration with Message History Buffer

**Version:** 1.0
**Status:** Draft
**Created:** 2025-01-13
**Owner:** Product Team

---

## Executive Summary

Integrate conversation history context into the chat API by implementing a message history buffer that passes the last N messages to Claude on each request. This reduces redundant tool calls by providing the AI with recent conversation context, improving response quality and reducing latency.

---

## Problem Statement

### Current State
- **No conversation memory**: Each API request to `/api/chat` only receives the current user message
- **Redundant tool calls**: AI must search documents repeatedly for information already discussed
- **Poor conversation flow**: AI cannot reference previous exchanges, insights, or search results
- **Inefficient token usage**: Re-searching for content instead of referencing prior findings

### Example Scenario
```
User: "What are the main themes in interview 1?"
AI: [searches documents] → Returns themes

User: "Tell me more about the first theme"
AI: [searches documents AGAIN] → Should reference previous response
```

### Impact
- Slower response times (multiple tool calls per exchange)
- Degraded user experience (AI seems forgetful)
- Higher API costs (redundant searches)
- Inefficient use of Claude's 200K context window

---

## Goals & Success Metrics

### Primary Goals
1. **Enable conversation continuity** - AI maintains context across exchanges
2. **Reduce redundant tool calls** - AI references previous search results instead of re-searching
3. **Improve response quality** - Coherent multi-turn conversations with follow-up capability
4. **Maintain performance** - No significant latency increase

### Success Metrics
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Tool calls per exchange | ~2-3 | ~1-2 | Analytics tracking |
| Average response time | ~3-5s | <4s | Server-side timing |
| Follow-up question handling | Poor | Good | Manual testing |
| Context accuracy | N/A | >90% | User feedback |

---

## Requirements

### Functional Requirements

#### FR-1: Message History Buffer
**Priority:** P0 (Critical)

- **FR-1.1**: Fetch last 10 messages (5 exchanges) from database on each chat request
- **FR-1.2**: Messages ordered chronologically (oldest to newest)
- **FR-1.3**: Include full message content with tool calls, citations, and message parts
- **FR-1.4**: Buffer size configurable via constant (default: 10)
- **FR-1.5**: Fresh context on new chat creation (no history carryover)

**Acceptance Criteria:**
```typescript
// Configuration
const MESSAGE_HISTORY_BUFFER_SIZE = 10; // Easily adjustable

// Query structure
const recentMessages = await prisma.chatMessage.findMany({
  where: { chatId },
  orderBy: { timestamp: 'asc' },
  take: MESSAGE_HISTORY_BUFFER_SIZE,
});
```

#### FR-2: API Integration
**Priority:** P0 (Critical)

- **FR-2.1**: Pass message history to `streamText()` in messages array
- **FR-2.2**: Append current user message to history
- **FR-2.3**: Format messages in AI SDK v5 compatible structure
- **FR-2.4**: Preserve tool call metadata for citation validation

**Acceptance Criteria:**
```typescript
const messages = [
  ...formattedHistory,  // Last N messages
  currentUserMessage    // Current request
];

streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  system: systemPrompt,
  messages: messages,  // History + current
  tools: searchTools,
  // ... other config
});
```

#### FR-3: Message Truncation Strategy
**Priority:** P1 (High)

- **FR-3.1**: Truncate individual messages exceeding 4000 characters
- **FR-3.2**: Mark truncated messages with metadata flag
- **FR-3.3**: Preserve most recent content (truncate from end)
- **FR-3.4**: Log truncation events for monitoring

**Acceptance Criteria:**
```typescript
const MAX_MESSAGE_LENGTH = 4000;

function truncateMessage(message: Message): Message {
  if (message.content.length <= MAX_MESSAGE_LENGTH) {
    return message;
  }

  return {
    ...message,
    content: message.content.slice(0, MAX_MESSAGE_LENGTH),
    metadata: { ...message.metadata, truncated: true }
  };
}
```

#### FR-4: System Prompt Updates
**Priority:** P1 (High)

- **FR-4.1**: Update section 6 (Conversation History) to reflect new capability
- **FR-4.2**: Instruct AI to reference previous messages before tool calls
- **FR-4.3**: Provide examples of good context usage
- **FR-4.4**: Keep conversation history in messages array (not system prompt)

**Acceptance Criteria:**
```markdown
## 6. Conversation History (ONGOING CONTEXT)

You have access to the last 10 messages in this conversation. Before using search tools:

1. **Check recent messages** for relevant information already discussed
2. **Reference previous findings** when answering follow-up questions
3. **Build upon prior insights** rather than repeating analysis
4. **Use tools only when** new information is needed

Example:
User: "What are the main themes?"
You: [search] → "Three themes: accessibility, cost, convenience"

User: "Tell me more about accessibility"
You: "Based on my previous analysis, accessibility was mentioned..." [reference, no new search needed]
```

### Non-Functional Requirements

#### NFR-1: Performance
- **NFR-1.1**: Message fetch query <50ms (indexed timestamp field)
- **NFR-1.2**: No additional latency >200ms for context formatting
- **NFR-1.3**: Total API response time remains <4s average
- **NFR-1.4**: Database query uses existing indexes

#### NFR-2: Scalability
- **NFR-2.1**: Support up to 1000 messages per chat (fetch last 10)
- **NFR-2.2**: No memory leaks from context accumulation
- **NFR-2.3**: Efficient query pattern (no N+1 queries)

#### NFR-3: Maintainability
- **NFR-3.1**: Buffer size configurable via constant
- **NFR-3.2**: Clear separation of concerns (utility functions)
- **NFR-3.3**: Comprehensive error handling
- **NFR-3.4**: Logging for debugging and monitoring

---

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ ChatPanel.tsx (Client)                                      │
│  - User sends message                                       │
│  - Current behavior unchanged                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ /api/chat POST Handler                                      │
│                                                              │
│  1. Authenticate & validate                                 │
│  2. Save user message to DB                                 │
│  3. **NEW: Fetch last N messages** ◄─────────┐             │
│  4. Format message history                    │             │
│  5. Build system prompt                       │             │
│  6. Call streamText() with history            │             │
│  7. Stream response                           │             │
│  8. Save assistant message                    │             │
└────────────────────┬──────────────────────────┴─────────────┘
                     │                          │
                     ▼                          ▼
          ┌──────────────────┐      ┌──────────────────────┐
          │ Claude API       │      │ Message History DB   │
          │ (with context)   │      │ (last 10 messages)   │
          └──────────────────┘      └──────────────────────┘
```

### Data Flow

#### Current Flow (Before)
```typescript
POST /api/chat
├─ Input: { message, id: chatId }
├─ Save user message
├─ Call Claude with: system + [currentMessage]
└─ Return: AI response (no context)
```

#### New Flow (After)
```typescript
POST /api/chat
├─ Input: { message, id: chatId }
├─ Save user message
├─ Fetch: last 10 messages from DB
├─ Format: AI SDK compatible message array
├─ Call Claude with: system + [history..., currentMessage]
└─ Return: AI response (with context)
```

### Implementation Details

#### 1. Message History Fetcher
**File:** `lib/chat/message-history.ts` (new)

```typescript
import { prisma } from '@/lib/prisma';
import { UIMessage } from '@ai-sdk/react';
import { reconstructMessageParts } from '@/lib/hooks/useMessages';

export const MESSAGE_HISTORY_BUFFER_SIZE = 10;
export const MAX_MESSAGE_LENGTH = 4000;

interface HistoryMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  toolCalls?: any;
  messageParts?: any;
  citations?: any;
  timestamp: Date;
}

export async function fetchMessageHistory(
  chatId: string,
  excludeMessageId?: string
): Promise<UIMessage[]> {
  try {
    // Fetch last N messages
    const messages = await prisma.chatMessage.findMany({
      where: {
        chatId,
        ...(excludeMessageId && { id: { not: excludeMessageId } })
      },
      orderBy: { timestamp: 'desc' },
      take: MESSAGE_HISTORY_BUFFER_SIZE,
      select: {
        id: true,
        role: true,
        content: true,
        toolCalls: true,
        messageParts: true,
        citations: true,
        timestamp: true,
      },
    });

    // Reverse to chronological order (oldest first)
    const chronologicalMessages = messages.reverse();

    // Format to AI SDK structure
    return chronologicalMessages.map(msg => formatMessageForAI(msg));
  } catch (error) {
    console.error('Failed to fetch message history:', error);
    return []; // Graceful degradation
  }
}

function formatMessageForAI(msg: HistoryMessage): UIMessage {
  const role = msg.role.toLowerCase() as 'user' | 'assistant';

  // Truncate if needed
  const content = msg.content.length > MAX_MESSAGE_LENGTH
    ? msg.content.slice(0, MAX_MESSAGE_LENGTH)
    : msg.content;

  // Reconstruct message parts for assistant messages
  const parts = role === 'assistant' && (msg.toolCalls || msg.messageParts)
    ? reconstructMessageParts(content, msg.toolCalls, msg.messageParts)
    : [{ type: 'text', text: content }];

  return {
    id: msg.id,
    role,
    parts,
    createdAt: msg.timestamp,
    citations: msg.citations || undefined,
  } as UIMessage;
}

export function logMessageHistory(messages: UIMessage[]): void {
  console.log(`[Context] Loaded ${messages.length} messages for conversation context`);

  const truncatedCount = messages.filter(
    msg => msg.parts.some(part => part.type === 'text' && part.text?.length === MAX_MESSAGE_LENGTH)
  ).length;

  if (truncatedCount > 0) {
    console.warn(`[Context] ${truncatedCount} messages truncated due to length`);
  }
}
```

#### 2. API Route Updates
**File:** `app/api/chat/route.ts` (modify)

```typescript
// Add import
import { fetchMessageHistory, logMessageHistory } from '@/lib/chat/message-history';

export async function POST(req: NextRequest) {
  try {
    // ... existing auth, validation, rate limiting ...

    const { message, id: chatId } = await req.json();

    // ... save user message ...

    // **NEW: Fetch conversation history**
    const messageHistory = await fetchMessageHistory(chatId);
    logMessageHistory(messageHistory);

    // **NEW: Combine history with current message**
    const currentUserMessage = convertToModelMessages([message])[0];
    const allMessages = [...messageHistory, currentUserMessage];

    // ... build system prompt ...

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const searchTools = createSearchTools(studyId);

        const result = streamText({
          model: anthropic('claude-sonnet-4-20250514'),
          system: systemPrompt,
          messages: allMessages, // **CHANGED: was convertedMessages**
          stopWhen: stepCountIs(10),
          tools: searchTools,
          temperature: 0.3,
          toolChoice: 'auto',
          experimental_transform: smoothStream({ chunking: 'word' }),
        });

        result.consumeStream();
        dataStream.merge(result.toUIMessageStream({ sendReasoning: true }));
      },
      // ... rest of stream setup unchanged ...
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    // ... existing error handling ...
  }
}
```

#### 3. System Prompt Updates
**File:** `lib/prompts/components/main-system-prompt/06-conversation-history.ts` (modify)

```typescript
import { PromptSection } from '../../prompt-builder';

const conversationHistory: PromptSection = {
  id: 'conversation-history',
  content: `## 6. Conversation History (ONGOING CONTEXT)

### Context Awareness
You have access to recent conversation history (up to 10 previous messages). Use this context to:

1. **Answer follow-up questions** without redundant searches
2. **Reference previous findings** when applicable
3. **Build upon prior analysis** for deeper insights
4. **Maintain conversation continuity** across exchanges

### Tool Usage Strategy
Before calling any search tools:

**FIRST** - Check if the information is already available in recent messages:
- Was this topic discussed in previous exchanges?
- Did you already search for this information?
- Are there relevant findings from prior tool calls?

**THEN** - Only use tools when:
- User asks about NEW topics not covered in history
- User requests UPDATED or DIFFERENT search criteria
- Prior search results insufficient for current question

### Examples

**Good - Using Context:**
\`\`\`
User: "What are the main themes in the interviews?"
Assistant: [searches] "I found three themes: 1) Cost concerns 2) Ease of use 3) Trust issues"

User: "Tell me more about the cost concerns"
Assistant: "Based on my previous analysis, cost concerns appeared in 8 of 12 interviews. Let me elaborate on the specific patterns I found..." [NO NEW SEARCH]
\`\`\`

**Bad - Ignoring Context:**
\`\`\`
User: "What are the main themes?"
Assistant: [searches] "Three themes: cost, ease, trust"

User: "Tell me more about cost"
Assistant: [searches again unnecessarily]
\`\`\`

### Multi-Turn Analysis
When conducting multi-step analysis:
1. Reference document IDs and passages from prior searches
2. Build cumulative insights across multiple exchanges
3. Cite previous findings: "As I mentioned earlier..." or "Building on the themes we discussed..."
4. Track which documents you've already analyzed to avoid redundancy`,
  variables: []
};

export default conversationHistory;
```

### Database Schema
No schema changes required. Existing structure supports this feature:

```prisma
model ChatMessage {
  id            String      @id @default(cuid())
  role          MessageRole
  content       String      @db.Text
  toolCalls     Json?       // ✓ Already captured
  messageParts  Json?       // ✓ Already captured
  citations     Json?       // ✓ Already captured
  timestamp     DateTime    @default(now()) // ✓ Used for ordering
  chatId        String      // ✓ Used for filtering
  // ... relations ...

  @@index([chatId, timestamp]) // ✓ Efficient query
}
```

---

## Edge Cases & Error Handling

### Edge Case 1: Empty History (New Chat)
**Scenario:** First message in a new chat

**Handling:**
```typescript
const messageHistory = await fetchMessageHistory(chatId);
// Returns empty array [] - no error

const allMessages = [...messageHistory, currentUserMessage];
// Results in [currentUserMessage] - works as before
```

**Expected Behavior:** System works identically to current implementation (no context)

### Edge Case 2: Very Long Messages
**Scenario:** User or AI generates message >4000 chars

**Handling:**
```typescript
function formatMessageForAI(msg: HistoryMessage): UIMessage {
  const content = msg.content.length > MAX_MESSAGE_LENGTH
    ? msg.content.slice(0, MAX_MESSAGE_LENGTH) + '...' // Truncate
    : msg.content;
  // ... rest of formatting
}
```

**Expected Behavior:** Older/longer messages truncated gracefully, no context overflow

### Edge Case 3: Database Query Failure
**Scenario:** Database unavailable during history fetch

**Handling:**
```typescript
export async function fetchMessageHistory(chatId: string): Promise<UIMessage[]> {
  try {
    const messages = await prisma.chatMessage.findMany({...});
    return messages;
  } catch (error) {
    console.error('Failed to fetch message history:', error);
    return []; // Graceful degradation - continue without history
  }
}
```

**Expected Behavior:** Request proceeds without history context (current behavior)

### Edge Case 4: Corrupted Message Data
**Scenario:** Message with invalid JSON in toolCalls/messageParts

**Handling:**
```typescript
function formatMessageForAI(msg: HistoryMessage): UIMessage {
  try {
    const parts = role === 'assistant' && (msg.toolCalls || msg.messageParts)
      ? reconstructMessageParts(content, msg.toolCalls, msg.messageParts)
      : [{ type: 'text', text: content }];

    return { id: msg.id, role, parts, createdAt: msg.timestamp };
  } catch (error) {
    console.warn(`Failed to parse message ${msg.id}, using plain text fallback`, error);
    return {
      id: msg.id,
      role,
      parts: [{ type: 'text', text: content }],
      createdAt: msg.timestamp
    };
  }
}
```

**Expected Behavior:** Falls back to text-only version of message

### Edge Case 5: Context Exceeds Token Limit
**Scenario:** 10 messages × 4000 chars = 40K chars (~10K tokens) + system prompt + tools

**Handling:**
- Current limits prevent this (4K per message × 10 = ~10K tokens)
- Claude Sonnet 4 has 200K context (plenty of headroom)
- Monitor via logging, add stricter truncation if needed

**Expected Behavior:** Should never occur with current limits

---

## Testing Strategy

### Unit Tests
**File:** `tests/unit/lib/chat/message-history.test.ts` (new)

```typescript
describe('fetchMessageHistory', () => {
  it('should fetch last 10 messages in chronological order', async () => {
    // Create 15 messages
    // Verify only last 10 returned
    // Verify oldest-to-newest ordering
  });

  it('should handle empty chat gracefully', async () => {
    // New chat with no messages
    // Should return empty array
  });

  it('should truncate long messages', async () => {
    // Create message with 5000 chars
    // Verify truncated to 4000
  });

  it('should exclude specific message ID', async () => {
    // Useful for avoiding duplicate current message
  });
});

describe('formatMessageForAI', () => {
  it('should format USER messages correctly', () => {
    // Plain text messages
  });

  it('should format ASSISTANT messages with tool calls', () => {
    // Messages with search tool calls
    // Verify parts reconstruction
  });

  it('should handle corrupted message data gracefully', () => {
    // Invalid JSON in toolCalls
    // Should fall back to text-only
  });
});
```

### Integration Tests
**File:** `tests/integration/api/chat-with-context.test.ts` (new)

```typescript
describe('POST /api/chat with message history', () => {
  it('should include previous messages in context', async () => {
    // Create chat with 3 prior messages
    // Send new message
    // Verify Claude receives all 4 messages
  });

  it('should reduce redundant tool calls', async () => {
    // Send: "What are the themes?"
    // Send: "Tell me about theme 1"
    // Verify second request uses fewer tool calls
  });

  it('should handle database failures gracefully', async () => {
    // Mock prisma.chatMessage.findMany to throw
    // Verify request still succeeds (without context)
  });
});
```

### Manual Testing Scenarios

#### Scenario 1: Basic Context Continuity
```
1. Upload 3 interview documents
2. Ask: "What are the main themes?"
3. Ask: "Tell me more about the first theme"
4. Ask: "Are there specific quotes about that?"

✅ Expected: AI references previous findings without re-searching
✅ Success Metric: <2 tool calls per exchange (vs current 3-4)
```

#### Scenario 2: Multi-Document Analysis
```
1. Upload 5 research papers
2. Ask: "What does paper 1 say about methodology?"
3. Ask: "How does paper 2's approach differ?"
4. Ask: "Which approach is more common?"

✅ Expected: AI builds cumulative comparison
✅ Success Metric: Coherent cross-document analysis
```

#### Scenario 3: New Chat Behavior
```
1. Create new chat
2. First message should have no history
3. Add 15 messages total
4. Next message should only include last 10

✅ Expected: Fresh start, proper truncation
✅ Success Metric: No context bleed between chats
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
**Effort:** 3-5 days

- [ ] **Task 1.1:** Create `lib/chat/message-history.ts` utility
  - [ ] Implement `fetchMessageHistory()` function
  - [ ] Implement `formatMessageForAI()` function
  - [ ] Add truncation logic
  - [ ] Add logging utilities
  - [ ] Unit tests (80%+ coverage)

- [ ] **Task 1.2:** Update `/api/chat` route
  - [ ] Import message history utilities
  - [ ] Fetch history before streaming
  - [ ] Combine history with current message
  - [ ] Pass to `streamText()`
  - [ ] Integration tests

- [ ] **Task 1.3:** Update system prompt (section 6)
  - [ ] Rewrite conversation history section
  - [ ] Add tool usage strategy
  - [ ] Add examples
  - [ ] Test prompt changes

**Deliverables:**
- Working message history buffer
- Updated API route with context
- Updated system prompt
- Unit + integration tests passing

**Testing Checklist:**
- [ ] New chat works (empty history)
- [ ] Multi-turn conversation maintains context
- [ ] Truncation works for long messages
- [ ] Error handling (DB failure)
- [ ] No performance regression (<4s response time)

### Phase 2: Validation & Optimization (Week 2)
**Effort:** 2-3 days

- [ ] **Task 2.1:** Manual testing with real data
  - [ ] Load sample research documents
  - [ ] Test conversation scenarios (5+ exchanges)
  - [ ] Verify tool call reduction
  - [ ] Check response quality

- [ ] **Task 2.2:** Performance monitoring
  - [ ] Add analytics tracking for:
    - Message history fetch time
    - Tool call frequency
    - Context size (token count)
  - [ ] Verify <50ms history fetch
  - [ ] Verify overall latency <4s

- [ ] **Task 2.3:** Edge case verification
  - [ ] Test with 100+ message chats
  - [ ] Test with very long messages
  - [ ] Test with corrupted message data
  - [ ] Test concurrent requests

**Deliverables:**
- Performance metrics dashboard
- Edge case handling verified
- Quality assurance sign-off

**Success Criteria:**
- [ ] Tool calls reduced by 30-50%
- [ ] Response time unchanged (<4s avg)
- [ ] Zero critical bugs
- [ ] User feedback positive (manual testing)

### Phase 3: Polish & Documentation (Week 2)
**Effort:** 1-2 days

- [ ] **Task 3.1:** Code review & refactoring
  - [ ] Peer review
  - [ ] Address feedback
  - [ ] Refactor for clarity

- [ ] **Task 3.2:** Documentation
  - [ ] Update CLAUDE.md with context feature
  - [ ] Add inline code comments
  - [ ] Update API documentation

- [ ] **Task 3.3:** Monitoring & logging
  - [ ] Add structured logging
  - [ ] Create debugging guide
  - [ ] Set up alerts (if needed)

**Deliverables:**
- Production-ready code
- Complete documentation
- Monitoring in place

---

## Configuration Reference

### Constants
**File:** `lib/chat/message-history.ts`

```typescript
// Message history configuration
export const MESSAGE_HISTORY_BUFFER_SIZE = 10;  // Number of messages to include
export const MAX_MESSAGE_LENGTH = 4000;          // Characters per message
export const ENABLE_HISTORY_LOGGING = true;      // Debug logging

// Future optimization options (not implemented in MVP)
// export const USE_TOKEN_BASED_LIMIT = false;
// export const MAX_CONTEXT_TOKENS = 8000;
```

### Adjusting Buffer Size
To change the number of messages included:

```typescript
// Increase to 20 messages (10 exchanges)
export const MESSAGE_HISTORY_BUFFER_SIZE = 20;

// Decrease to 6 messages (3 exchanges)
export const MESSAGE_HISTORY_BUFFER_SIZE = 6;
```

**Recommended ranges:**
- **Minimum:** 4 messages (2 exchanges) - too little context
- **Sweet spot:** 10-20 messages (5-10 exchanges)
- **Maximum:** 30 messages (15 exchanges) - may impact performance

---

## Monitoring & Metrics

### Key Metrics to Track

#### Performance Metrics
```typescript
// lib/analytics/chat-analytics.ts (extend existing)

trackChatEvent('context_loaded', {
  studyId,
  messageCount: history.length,
  fetchTimeMs: historyFetchTime,
  truncatedCount: truncated,
});

trackChatEvent('tool_usage', {
  studyId,
  toolCallsCount: toolCalls.length,
  hasContext: messageHistory.length > 0,
});
```

#### Analytics Dashboard Views
- **Context Usage:**
  - Average messages in context per request
  - Truncation frequency
  - Fetch time distribution

- **Tool Call Reduction:**
  - Tool calls per exchange (before/after)
  - % of follow-up questions requiring tools
  - Search result reuse rate

- **Quality Indicators:**
  - Average conversation length
  - User retry/regenerate frequency
  - Message copy frequency (engagement proxy)

### Logging Examples

```typescript
// Success case
console.log('[Context] Loaded 10 messages (832ms ago to now)');
console.log('[Context] 0 messages truncated');

// Warning case
console.warn('[Context] 2 messages truncated due to length (>4000 chars)');

// Error case (graceful degradation)
console.error('[Context] Failed to fetch history: DatabaseTimeout');
console.log('[Context] Proceeding without history context');
```

---

## Risks & Mitigation

### Risk 1: Performance Degradation
**Impact:** High | **Probability:** Low

**Risk:** Adding history fetch + formatting adds latency

**Mitigation:**
- Use indexed queries (`chatId`, `timestamp`)
- Fetch only required fields (`select`)
- Cache-friendly query pattern (no N+1)
- Monitor fetch time (<50ms target)
- Graceful degradation on failure

### Risk 2: Context Overflow
**Impact:** Medium | **Probability:** Low

**Risk:** 10 messages + system prompt + tools exceeds context limit

**Mitigation:**
- Claude Sonnet 4 has 200K context (plenty of headroom)
- Per-message truncation (4K chars)
- Monitor total token usage
- Drop oldest messages if needed (future enhancement)

### Risk 3: AI Still Over-Uses Tools
**Impact:** Medium | **Probability:** Medium

**Risk:** Despite context, AI continues redundant searches

**Mitigation:**
- Strong system prompt guidance (section 6)
- Monitor tool call frequency
- Iterate on prompt engineering
- Consider adding "recent findings" summary (future enhancement)
- A/B test with/without context

### Risk 4: Data Corruption Impact
**Impact:** Low | **Probability:** Low

**Risk:** Corrupted message breaks entire request

**Mitigation:**
- Try/catch around message formatting
- Fallback to text-only messages
- Skip problematic messages
- Log corruption for investigation
- Continue request with partial context

---

## Future Enhancements (Out of Scope for MVP)

### 1. Token-Based Context Management
**Complexity:** Medium | **Value:** Medium

Replace fixed message count with dynamic token-based limit:
```typescript
// Calculate tokens for each message
// Include messages until hitting token budget
// More efficient use of context window
```

### 2. Intelligent Context Summarization
**Complexity:** High | **Value:** High

For very long conversations:
```typescript
// Summarize older messages (beyond 10)
// Include summary in context
// Maintains continuity without full history
```

### 3. Recent Findings Cache
**Complexity:** Medium | **Value:** High

Add "Recent Findings" section to system prompt:
```markdown
## Recent Search Results (Last 3 Searches)
1. Theme: "user frustrations" - Found in 8/12 interviews
2. Quote search: "difficult to use" - 15 mentions across documents
3. Document comparison: Paper1 vs Paper2 methodologies
```

### 4. Conversation Memory Across Chats
**Complexity:** High | **Value:** Medium

Study-level memory that persists across chat sessions:
- Key findings discovered
- Document insights
- User preferences

### 5. Configurable History per User
**Complexity:** Low | **Value:** Low

Allow users to adjust context window:
```typescript
// User preference: minimal, standard, extensive
// Maps to: 6, 10, 20 messages
```

---

## Open Questions

None - All requirements clarified through stakeholder discussion.

---

## Appendix

### A. Related Documentation
- [AI SDK v5 Documentation](https://sdk.vercel.ai/docs)
- [Anthropic Prompt Engineering Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering)
- [System Prompt Framework](lib/prompts/CLAUDE.md)

### B. Code References
- Current chat API: `app/api/chat/route.ts:80-371`
- Message model: `prisma/schema.prisma:90-102`
- Message fetching: `lib/hooks/useMessages.ts:89-108`
- System prompt: `lib/prompts/templates/main-system-prompt.ts:7-51`

### C. Testing Data
Test conversation sequences available in:
- `tests/fixtures/sample-conversations.json`
- `tests/fixtures/research-documents/` (3 sample interviews)

---

**End of PRD**
