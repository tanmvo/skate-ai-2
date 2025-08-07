# PRD: Progressive Tool Call UI

## Overview
Enhance the chat interface to show real-time AI tool execution progress, giving users visibility into what the AI is doing during analysis. This addresses the current "black box" experience where users only see the initial message and final result, missing the intermediate tool execution steps.

## Problem Statement
Currently, when users ask complex analysis questions, they see:
1. Their question
2. AI thinking message (e.g., "I'll search for pain points...")
3. [Black box period of 5-15 seconds]
4. Final comprehensive response

Users have no visibility into:
- Which documents are being searched
- What search queries are being executed
- How many results are found
- Why the AI is taking time to respond

## Solution: Progressive Tool Call UI

Show intermediate tool execution steps as discrete, compact UI elements grouped under the AI's "thinking" message.

### Visual Flow Example

**User Message:**
> "What are the main pain points mentioned in these documents?"

**AI Response with Progressive Steps:**
```
🤖 I'll search for pain points, challenges, and frustrations across the documents.

    🔍 Searching for: "pain points challenges frustrations problems difficulties"
    ✅ Found 7 relevant passages

    🔍 Searching for: "user pain points customer struggles issues feedback complaints"  
    ✅ Found 5 relevant passages

Based on my analysis of the documents, I can identify several key pain points...
```

### Technical Foundation

**Current State (app/api/chat/route.ts:137-158):**
```typescript
const result = streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  system: systemPrompt,
  messages: messages,
  tools: allTools,
  maxSteps: 5, // Already supports multi-tool workflows
  // ... existing config
});
```

**Network Stream Pattern (Reference):**
```
f:{"messageId":"msg-20Ikf..."}
0:"I'll search for pain points..."
9:{"toolCallId":"toolu_01NN...","toolName":"search_all_documents","args":{"query":"pain points challenges..."}}
a:{"toolCallId":"toolu_01NN...","result":"Found 7 relevant passages..."}
e:{"finishReason":"tool-calls","usage":{...}}
9:{"toolCallId":"toolu_015Nc...","toolName":"search_all_documents","args":{"query":"user pain points..."}}
a:{"toolCallId":"toolu_015Nc...","result":"Found 5 relevant passages..."}
e:{"finishReason":"tool-calls","usage":{...}}
0:"Based on my analysis..."
e:{"finishReason":"stop","usage":{...}}
```

## Core Requirements

### Visual Design
- **Discreet & Compact:** Tool calls should not dominate the UI
- **Grouped under thinking message:** All tool executions appear under the initial AI message
- **Simple styling:** Use existing design tokens, avoid complex Card components
- **Consistent with current design:** Maintain chat interface aesthetics

### Information Display
- **Show search query:** Display what the AI is searching for (when available)
- **Show result count:** Display number of results found (when available)
- **Loading states:** Show spinner/loading indicator during tool execution
- **Error states:** Show error message if tool fails

### Interaction Patterns
- **No tool name prominence:** Don't emphasize technical tool names like "search_all_documents"
- **No retry functionality:** Simple error display without user interaction
- **No collapse/expand:** Keep tool steps always visible
- **Immediate appearance:** Show tool call UI as soon as tool is invoked

### Accessibility
- **Screen reader support:** Announce tool execution states
- **Keyboard navigation:** Support standard keyboard interaction
- **Semantic markup:** Use appropriate ARIA labels and roles

## Success Metrics

### User Experience
- **Reduced confusion:** Users understand why AI responses take time
- **Increased trust:** Transparency builds confidence in AI analysis
- **Better engagement:** Users feel informed about AI capabilities

### Technical Performance
- **No latency impact:** Tool UI rendering doesn't slow response times
- **Progressive enhancement:** Core chat works even if tool UI fails
- **Minimal bundle size:** Keep component additions lightweight

## Implementation Phases

### Phase 1: Core Infrastructure
**Goal:** Capture and display basic tool call data

**Tasks:**
- [ ] Update `useChat` hook in ChatPanel to capture `toolInvocations`
- [ ] Create basic `ToolExecutionStep` component
- [ ] Integrate tool step display into `ProgressiveMessage` component
- [ ] Test with existing search tools (`search_all_documents`)

**Acceptance Criteria:**
- Tool calls appear as simple text when invoked
- Loading spinner shows during tool execution
- Completed tools show basic status

### Phase 2: Enhanced Information Display
**Goal:** Show meaningful tool execution details

**Tasks:**
- [ ] Extract and display search queries from tool arguments
- [ ] Parse and display result counts from tool responses
- [ ] Add loading → completed state transitions
- [ ] Style tool steps with Tailwind classes

**Acceptance Criteria:**
- Search queries are clearly displayed
- Result counts appear when tools complete
- Visual states clearly distinguish loading vs completed

### Phase 3: Error Handling & Polish
**Goal:** Handle edge cases and improve user experience

**Tasks:**
- [ ] Add error state display for failed tool calls
- [ ] Implement accessibility features (ARIA labels, screen reader announcements)
- [ ] Add fade-in animations with Tailwind
- [ ] Test with multiple tool sequences

**Acceptance Criteria:**
- Failed tools show clear error messages
- Screen readers announce tool execution progress
- Smooth animations enhance the experience
- Multiple tools display correctly in sequence

### Phase 4: Integration & Testing
**Goal:** Ensure robust production deployment

**Tasks:**
- [ ] Integration testing with existing chat flow
- [ ] Performance testing with multiple concurrent tool calls
- [ ] Cross-browser compatibility testing
- [ ] Mobile responsiveness verification

**Acceptance Criteria:**
- No regressions in existing chat functionality
- Tool UI works on all supported browsers
- Mobile experience remains smooth
- Performance impact is minimal

## Technical Implementation Details

### Component Structure
```
ProgressiveMessage
├── Initial AI message content
├── ToolExecutionGroup (new)
│   ├── ToolExecutionStep (loading)
│   ├── ToolExecutionStep (completed)
│   └── ToolExecutionStep (error)
└── Final AI response content
```

### Data Flow
1. `useChat` hook receives `toolInvocations` from AI SDK
2. `ProgressiveMessage` passes tool data to `ToolExecutionGroup`
3. Each tool invocation renders as individual `ToolExecutionStep`
4. States update progressively: call → partial → result

### Key Files to Modify
- `components/chat/ChatPanel.tsx` - Update useChat hook
- `components/chat/ProgressiveMessage.tsx` - Add tool execution display
- Create: `components/chat/ToolExecutionGroup.tsx`
- Create: `components/chat/ToolExecutionStep.tsx`

## Examples & References

### Vercel AI SDK Tool Invocation States
```typescript
interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  state: 'partial' | 'call' | 'result';
  args?: { query: string; limit?: number };
  result?: string | object;
}
```

### Current Search Tools (lib/llm-tools/search-tools.ts)
- `search_all_documents`: Cross-document search
- `find_document_ids`: Document name resolution
- `search_specific_documents`: Targeted document search

### Network Stream Example (Production Data)
Based on actual network traffic showing tool call progression with real search queries and results.

## Risks & Mitigation

### Technical Risks
- **AI SDK version compatibility:** Ensure toolInvocations work with current v4.3.19
- **Performance impact:** Monitor rendering performance with multiple tools
- **Data availability:** Handle cases where tool args/results are incomplete

### UX Risks  
- **Information overload:** Keep tool steps simple and scannable
- **Visual clutter:** Maintain clean chat interface aesthetics
- **Mobile experience:** Ensure compact tool steps work on small screens

## Future Considerations

### Phase 2+ Enhancements
- **Tool result preview:** Show snippets of found content
- **Interactive citations:** Link from tool results to source documents
- **Execution timing:** Show how long each tool takes
- **Tool explanation:** Help text for understanding what tools do

### Analytics & Monitoring
- **Tool execution metrics:** Track success/failure rates
- **User engagement:** Measure interaction with tool UI
- **Performance monitoring:** Track rendering impact on chat performance