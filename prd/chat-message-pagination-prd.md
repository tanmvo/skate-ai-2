# Chat Message Pagination & Progressive Loading PRD

## Problem Statement

**Current State:**
The current chat message loading system loads ALL messages for a chat at once through a single API call (`/api/studies/[studyId]/chats/[chatId]/messages`). This approach works for the MVP but will create performance and UX issues as chats grow longer:

- **Performance Impact**: Loading 100+ messages causes slow initial page loads (2-3 seconds+)
- **Memory Usage**: All messages stay in memory regardless of visibility
- **Network Overhead**: Large payloads for chats with many messages (especially those with tool calls and citations)
- **Poor User Experience**: Long loading times before users can interact with the chat
- **Scroll Performance**: Rendering hundreds of messages causes scroll lag

**Evidence from Current Implementation:**
- `useMessages.ts` fetches all messages with `orderBy: { timestamp: 'asc' }` 
- `ChatPanel.tsx` renders all messages in a single scrollable container
- No message virtualization or progressive rendering
- 5-minute SWR cache helps but doesn't solve initial load performance

## Success Metrics

- **Performance**: Initial chat load time < 500ms (down from 2-3s for long chats)
- **User Experience**: 95% of users can start chatting within 1 second of chat selection
- **Memory Efficiency**: 70% reduction in memory usage for chats with 50+ messages
- **Scalability**: Support chats with 500+ messages without degradation

## User Experience Design

### Initial Load Behavior
1. **Fast Initial Load**: Show last 5 messages immediately (< 500ms)
2. **Smart Pagination**: "View Previous Messages" button appears if more messages exist
3. **Context Preservation**: Always show enough recent context for meaningful conversation
4. **Tool Call Context**: Include tool call data with messages to preserve AI reasoning context

### Progressive Loading Flow
```
[View Previous Messages (25)] ← Button to load more
Message 1                      ← Oldest visible (of 5 loaded)
  └─ Tool: search_documents    ← Tool calls preserved for context
Message 2
  └─ Tool: search_citations
Message 3
Message 4 
Message 5                      ← Newest message  
[Input field]                  ← User can immediately start typing
```

### UI Components

#### Load Previous Messages Button
- **Position**: Above the oldest visible message
- **Styling**: Subtle, non-intrusive button with message count
- **Label**: "View Previous Messages (25)" or "Load 25 Earlier Messages"
- **Loading State**: Show spinner and disable during fetch
- **Success State**: Smooth insertion of new messages with scroll position preservation

#### Loading States
- **Initial Load**: Skeleton placeholders for 3 messages (reduced from 3-5)
- **Previous Messages**: Small spinner in button, messages fade in
- **Error State**: "Failed to load messages" with retry option
- **Tool Call Loading**: Preserve tool call progress indicators within messages

#### Scroll Behavior
- **Preserve Position**: When loading previous messages, maintain user's current scroll position
- **Auto-Scroll**: Only auto-scroll to bottom for new real-time messages
- **Memory Management**: Consider message virtualization for chats with 100+ messages

## Technical Implementation

### Database & API Changes

#### New Pagination API Endpoint
```typescript
GET /api/studies/[studyId]/chats/[chatId]/messages?cursor=[messageId]&limit=5&direction=before|after&includeToolCalls=true

Response:
{
  messages: ChatMessage[], // Includes tool call data for context
  pagination: {
    hasMore: boolean,
    cursor: string | null,
    totalCount: number
  }
}
```

#### Database Query Optimization
```sql
-- Cursor-based pagination for consistent results
-- Include tool calls in message fetch for complete context
SELECT m.*, tc.tool_call_data 
FROM chat_messages m
LEFT JOIN tool_calls tc ON m.id = tc.message_id
WHERE m.chat_id = ? AND m.timestamp < ?  -- cursor-based
ORDER BY m.timestamp DESC 
LIMIT 5;
```

**Why Cursor-Based Pagination:**
- Consistent results even when new messages are added
- Better performance than OFFSET/LIMIT for large datasets  
- No "page drift" when real-time messages arrive

#### Updated Database Indexes
```sql
-- Composite index for efficient message pagination
CREATE INDEX idx_chat_messages_pagination ON chat_messages(chat_id, timestamp DESC);
```

### Frontend Implementation

#### Updated useMessages Hook
```typescript
// New hook: usePaginatedMessages.ts
export function usePaginatedMessages(studyId: string, chatId: string | null) {
  const [allMessages, setAllMessages] = useState<AISDKMessage[]>([]);
  const [hasMoreBefore, setHasMoreBefore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const { data: initialData, error, isLoading } = useSWR(
    chatId ? [`messages-initial`, studyId, chatId] : null,
    () => fetchMessages(studyId, chatId, { 
      limit: 5, 
      direction: 'latest', 
      includeToolCalls: true 
    })
  );

  const loadPreviousMessages = async () => {
    // Load previous 25 messages before current cursor
  };

  return {
    messages: allMessages,
    hasMoreBefore,
    isLoadingMore,
    loadPreviousMessages,
    error,
    isLoading,
  };
}
```

#### ChatPanel Component Updates
```typescript
// Add pagination UI and logic
export function ChatPanel({ studyId, onCitationClick }: ChatPanelProps) {
  const { 
    messages, 
    hasMoreBefore, 
    isLoadingMore, 
    loadPreviousMessages 
  } = usePaginatedMessages(studyId, currentChatId);

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      {/* Chat header */}
      
      <div className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 relative">
        {/* Load Previous Messages Button */}
        {hasMoreBefore && (
          <div className="w-full mx-auto max-w-3xl px-4">
            <Button 
              variant="ghost" 
              size="sm"
              disabled={isLoadingMore}
              onClick={loadPreviousMessages}
              className="w-full text-muted-foreground"
            >
              {isLoadingMore ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                `View Previous Messages`
              )}
            </Button>
          </div>
        )}
        
        {/* Messages */}
        {messages.map((message) => (
          <ProgressiveMessage key={message.id} {...messageProps} />
        ))}
      </div>
    </div>
  );
}
```

### SWR Caching Strategy

#### Cache Keys and Invalidation
```typescript
// Separate cache keys for different message ranges
const cacheKeys = {
  initial: [`messages-initial`, studyId, chatId],
  page: [`messages-page`, studyId, chatId, cursor],
  full: [`messages-full`, studyId, chatId] // For backwards compatibility
};

// Invalidate all message caches when new message arrives
const invalidateMessageCaches = () => {
  mutate(key => key?.[0]?.startsWith('messages'), undefined, { revalidate: false });
};
```

#### Memory Management
- **Cache Size Limits**: Limit SWR cache to 50 messages per chat
- **Automatic Cleanup**: Clear old message caches when switching chats
- **Persistence Strategy**: Consider localStorage for recently viewed messages

### Error Handling & Retry Logic

#### Network Failures
```typescript
const loadPreviousMessages = async () => {
  try {
    setIsLoadingMore(true);
    const result = await fetchPreviousMessages();
    // Handle success
  } catch (error) {
    toast.error('Failed to load previous messages', {
      action: { label: 'Retry', onClick: loadPreviousMessages }
    });
  } finally {
    setIsLoadingMore(false);
  }
};
```

#### Scroll Position Edge Cases
- **Message Height Changes**: Handle dynamic message heights (progressive rendering)
- **Race Conditions**: Prevent multiple simultaneous pagination requests
- **Browser Navigation**: Restore scroll position when returning to chat

## Data Flow Architecture

### Message Loading Sequence
1. **Chat Selection**: Load last 5 messages immediately (with tool calls)
2. **Cache Check**: Check SWR cache for recent messages and tool call data
3. **Pagination Request**: User clicks "Load Previous" → fetch 25 more messages with tool calls
4. **Merge & Update**: Prepend new messages to existing array, preserving tool call associations
5. **Scroll Preservation**: Maintain user's current view position

### Real-Time Message Integration
```typescript
// New messages always appear at the bottom
const handleNewMessage = (message: AISDKMessage) => {
  setAllMessages(prev => [...prev, message]);
  scrollToBottom(); // Only for newly sent messages
};
```

### State Management Flow
```
useMessages (deprecated) → usePaginatedMessages
     ↓                           ↓
Direct SWR fetch        →    Paginated fetch + state management  
     ↓                           ↓
All messages loaded     →    Progressive loading with cursor tracking
```

## Performance Optimizations

### Bundle Size Impact
- **New Dependencies**: None (using existing SWR, React)
- **Code Splitting**: Pagination logic in separate hook
- **Bundle Analysis**: Estimated +2KB gzipped

### Database Performance
- **Index Strategy**: Composite index on (chat_id, timestamp)
- **Query Performance**: Sub-100ms response time for paginated queries
- **Connection Pooling**: Existing Prisma connection pooling handles increased queries

### Frontend Performance
- **Render Optimization**: Memoize message components to prevent unnecessary re-renders
- **Virtual Scrolling**: Consider react-window for chats with 200+ messages (future enhancement)
- **Image Lazy Loading**: Defer loading of citation previews until visible

## Implementation Phases

### Phase 1: Core Pagination API (Week 1)
- [ ] New paginated messages API endpoint
- [ ] Database query optimization and indexing
- [ ] Cursor-based pagination logic
- [ ] API integration tests

**Acceptance Criteria:**
- API supports cursor-based pagination with before/after directions
- Database queries execute in < 100ms
- Pagination metadata includes hasMore and cursor info

### Phase 2: Frontend Integration (Week 2)  
- [ ] New usePaginatedMessages hook
- [ ] ChatPanel component updates
- [ ] "Load Previous Messages" button UI
- [ ] Scroll position preservation logic

**Acceptance Criteria:**
- Initial chat load shows last 5 messages (with tool calls) in < 500ms
- "Load Previous" button appears when hasMoreBefore = true  
- Clicking button loads 25 previous messages with tool call data smoothly
- Scroll position maintained during pagination
- Tool call context preserved and displayed appropriately

### Phase 3: Performance & Polish (Week 3)
- [ ] SWR cache optimization
- [ ] Error handling and retry logic
- [ ] Loading states and animations
- [ ] Memory cleanup and cache management

**Acceptance Criteria:**
- Memory usage reduced by 70% for chats with 50+ messages
- Error states handled gracefully with retry options
- Smooth loading animations and transitions  
- No memory leaks when switching between chats
- Tool call data efficiently cached and managed

### Phase 4: Advanced Features (Future)
- [ ] Virtual scrolling for very long chats
- [ ] Search within chat history
- [ ] Message bookmarking/favorites
- [ ] Export selected message ranges

## UI/UX Mockups

### Desktop Layout
```
┌─ Chat Header ──────────────────────────────────┐
├───────────────────────────────────────────────┤
│ [View Previous Messages (25)]                 │ ← Pagination button
│                                               │
│ 💬 Message 1 (oldest visible)                │
│ 🤖 Assistant response...                     │
│    🔧 Tool: search_documents (context)       │
│ 💬 Message 2                                 │
│ 🤖 Assistant response with citations...      │
│    🔧 Tool: search_citations (context)       │
│ 💬 Message 5 (newest visible)                │
│ 🤖 Most recent response                      │
│                                               │
├───────────────────────────────────────────────┤
│ [Type a message...]                     [Send]│
└───────────────────────────────────────────────┘
```

### Mobile Layout
```
┌─ Chat Header ──────────────┐
├───────────────────────────┤
│ [Load 25 Previous ↑]      │ ← Mobile-optimized button
│                           │
│ 💬 Message content...     │
│ 🤖 AI response...         │
│                           │
│ [Show 25 More ↑]          │ ← Appears after scrolling up
│                           │
├───────────────────────────┤
│ [Message input...]   [→]  │
└───────────────────────────┘
```

### Loading States
```
┌─ Loading Previous Messages ─┐
│ ⟳ Loading 25 messages...    │ ← Subtle loading indicator
│                             │
│ 💬 Existing message 1       │
│ 🤖 Existing response 1      │
└─────────────────────────────┘

┌─ After Loading ─────────────┐
│ [View Previous Messages]    │ ← Button reappears if more exist
│                             │
│ 💬 Newly loaded message     │ ← Fade-in animation
│ 🤖 Newly loaded response    │
│ 💬 Existing message 1       │ ← Scroll position preserved
│ 🤖 Existing response 1      │
└─────────────────────────────┘
```

## Testing Strategy

### Unit Tests
- [ ] `usePaginatedMessages` hook behavior
- [ ] Cursor-based pagination logic
- [ ] Message merging and deduplication
- [ ] Error handling scenarios

### Integration Tests
- [ ] API endpoint pagination functionality
- [ ] SWR cache integration
- [ ] Real-time message integration with pagination
- [ ] Cross-browser scroll behavior

### Performance Tests
- [ ] Load testing with chats containing 500+ messages
- [ ] Memory usage profiling
- [ ] Network request optimization
- [ ] Scroll performance with large message lists

### User Experience Tests
- [ ] A/B test pagination vs. infinite scroll
- [ ] User comprehension of "Load Previous" button
- [ ] Error recovery scenarios
- [ ] Mobile responsiveness

## Migration Strategy

### Backwards Compatibility
- Keep existing `useMessages` hook for gradual migration
- Maintain current API endpoints during transition period
- Feature flag for pagination rollout

### Rollout Plan
1. **Internal Testing**: Enable pagination for development chats
2. **Beta Testing**: 10% of users with feature flag
3. **Gradual Rollout**: 25% → 50% → 100% over 2 weeks
4. **Monitoring**: Track performance metrics and user feedback

### Rollback Plan
- Feature flag allows instant rollback to current system
- Database queries remain backwards compatible
- SWR cache keys isolated to prevent conflicts

## Risk Assessment

### Technical Risks
- **Risk**: Cursor-based pagination complexity with real-time messages
- **Mitigation**: Comprehensive testing of edge cases, fallback to offset pagination if needed

- **Risk**: Scroll position preservation across different browsers
- **Mitigation**: Browser-specific testing, progressive enhancement approach

- **Risk**: Memory leaks from accumulated message state
- **Mitigation**: Implement cleanup logic, memory usage monitoring

### User Experience Risks  
- **Risk**: Users lose context with pagination
- **Mitigation**: Load sufficient initial messages (10), clear button labeling

- **Risk**: Additional clicks to access message history
- **Mitigation**: Optimize initial load size, consider infinite scroll for future

### Performance Risks
- **Risk**: Database performance degradation with cursor queries
- **Mitigation**: Database indexing strategy, query performance monitoring

## Future Enhancements

### Phase 2 Features
- **Infinite Scroll**: Replace button with automatic loading when scrolling up
- **Message Search**: Search within chat history with result highlighting  
- **Message Threading**: Reply to specific messages with context preservation
- **Message Reactions**: Like/bookmark important messages

### Advanced Pagination
- **Smart Preloading**: Preload next page when user scrolls near boundary
- **Contextual Loading**: Load more messages around search results
- **Date-based Navigation**: Jump to messages from specific dates
- **Message Density Options**: User preference for 10/25/50 messages per page

## Conclusion

This PRD outlines a comprehensive approach to implementing chat message pagination that will:

1. **Improve Performance**: 70% reduction in initial load time and memory usage
2. **Enhance UX**: Users can start chatting immediately while maintaining access to history
3. **Scale Effectively**: Support chats with 500+ messages without degradation
4. **Maintain Quality**: Preserve existing features like citations, tool calls, and real-time updates

The phased implementation approach allows for iterative testing and refinement while maintaining backwards compatibility. Success will be measured through performance metrics, user engagement, and system scalability improvements.