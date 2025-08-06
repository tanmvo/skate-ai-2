# PRD: AI SDK Generative UI Migration for Synthesis Tool

## Executive Summary

Our current synthesis tool implementation uses a custom streaming approach that doesn't follow AI SDK's standard generative UI patterns. This causes issues where tool results aren't properly captured by the `useChat` hook, leading to empty messages and citation display failures.

**Current State**: Custom `dataStream.writeData()` approach that AI SDK doesn't recognize  
**Target State**: Standard AI SDK generative UI pattern with `message.toolInvocations` integration

## Problem Analysis

### Critical Issue #1: Tool Results Not Captured by AI SDK
**Problem**: Our synthesis tool returns structured data via custom `dataStream.writeData()` events, but `useChat` doesn't capture these in the `data` array.
**Impact**: 
- `streamDataCount: 0` in browser console despite tool execution
- Empty message content when AI ignores tool results
- 400 errors: "Role and content are required"
- StructuredMessage component never renders

**Root Cause Analysis**:
```typescript
// Current problematic approach in synthesis-tools.ts
dataStream.writeData({
  type: 'synthesis-complete', 
  synthesis: synthesis.object,
  timestamp: Date.now()
});
// ❌ This data isn't captured by useChat hook's data array
```

### Critical Issue #2: AI Model Ignoring Tool Results
**Problem**: Even when synthesis tool executes successfully, Claude returns empty message content instead of using tool results.
**Evidence**:
- Server logs show: "🎯 Returning synthesis response to AI: {...}"  
- Network response shows empty message content despite tool success
- AI model temperature 0.0 and explicit system prompts don't resolve issue

### Critical Issue #3: Non-Standard Architecture Pattern
**Problem**: Our implementation doesn't follow AI SDK's established generative UI patterns that would solve these issues automatically.

**Reference Architecture** (from Vercel ai-chatbot):
1. Tool returns data → AI SDK captures in `message.toolInvocations`
2. Frontend checks `message.toolInvocations[toolName]` → Renders appropriate component
3. No custom streaming, no manual data capture needed

## Solution Architecture

### Target Architecture: AI SDK Generative UI Pattern

**✅ Preserves All Current Functionality:**
- **Text Streaming**: AI continues streaming text token-by-token to `message.content`
- **Progressive UI**: Messages render progressively as text streams in
- **Tool Execution**: Tools execute during streaming (not after) with results in `message.toolInvocations`
- **Error Handling**: Built-in error recovery and fallback mechanisms
- **Performance**: Same or better performance with less custom code

**✅ Simplifies Architecture:**
- Single data source (`message`) instead of multiple streams (`data`, `messageSynthesis`, etc.)
- Standard AI SDK patterns instead of custom streaming logic
- Automatic tool result capture instead of manual detection

Follow the proven 4-step pattern from Vercel's ai-chatbot:

#### 1. Tool Structure (Reference: get-weather.ts)
```typescript
// Tool returns data that AI SDK automatically captures
export async function synthesizeResearchFindings({
  researchQuestion,
  searchQueries,
  documentIds
}: {
  researchQuestion: string;
  searchQueries: string[];
  documentIds?: string[];
}) {
  // Execute searches and synthesis
  const synthesis = await generateObject({...});
  
  // Return structured data for AI SDK to capture
  return synthesis.object; // ✅ AI SDK captures this automatically
}
```

#### 2. API Route Integration (Reference: chat/route.ts)
```typescript
// Add synthesis tool to streamText configuration
const result = streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  messages,
  tools: {
    synthesizeResearchFindings,
    // ... existing search tools
  },
  maxSteps: 5,
});

// AI SDK handles tool calls and results automatically
return result.toDataStreamResponse();
```

#### 3. UI Component (Reference: weather.tsx)
```typescript
// Component receives tool result data as props
interface SynthesisDisplayProps {
  synthesis: StructuredResponse;
  onCitationClick?: (citation: Citation) => void;
}

export function SynthesisDisplay({ synthesis, onCitationClick }: SynthesisDisplayProps) {
  // Render structured citations and content
  return (
    <div className="synthesis-results">
      {/* Render synthesis.response with inline citations */}
      {/* Display synthesis.citations as expandable cards */}
    </div>
  );
}
```

#### 4. Message Routing (Reference: message.tsx)
```typescript
// Check message.toolInvocations instead of custom stream data
export function ProgressiveMessage({ message }: { message: Message }) {
  // AI SDK provides tool results in message.toolInvocations
  const synthesisResult = message.toolInvocations?.find(
    (invocation) => invocation.toolName === 'synthesizeResearchFindings'
  );

  if (synthesisResult && synthesisResult.state === 'result') {
    return (
      <SynthesisDisplay 
        synthesis={synthesisResult.result}
        onCitationClick={onCitationClick}
      />
    );
  }

  // Render standard message
  return <StandardMessage message={message} />;
}
```

## Implementation Phases

### Phase 1: Core Migration (Week 1)
**Priority**: Critical - Fixes fundamental architecture issues  
**Goal**: Working AI SDK generative UI pattern for synthesis tool

#### 1.1 Tool Architecture Migration
**Scope**: Refactor synthesis tool to return data instead of streaming events

**Key Changes**:
- [ ] Update `lib/llm-tools/synthesis-tools.ts` to return structured data directly
- [ ] Remove custom `dataStream.writeData()` calls  
- [ ] Return `synthesis.object` for AI SDK to capture
- [ ] Keep search functionality intact, only change data return pattern

**Expected Code**:
```typescript
// lib/llm-tools/synthesis-tools.ts - Updated approach
export async function synthesizeResearchFindings(params) {
  // Execute searches (unchanged)
  const searchResults = await executeSearches(params);
  
  // Generate synthesis (unchanged)
  const synthesis = await generateObject({
    model: anthropic('claude-3-5-sonnet-20241022'),
    schema: structuredResponseSchema,
    prompt: buildSynthesisPrompt(params.researchQuestion, searchResults)
  });

  // ✅ Return data for AI SDK to capture (NEW)
  return synthesis.object;
}
```

#### 1.2 API Route Integration
**Scope**: Update chat route to use standard AI SDK tool integration

**Key Changes**:
- [ ] Replace `createDataStreamResponse()` with `streamText().toDataStreamResponse()`
- [ ] Add synthesis tool to `tools` configuration
- [ ] Remove custom data streaming logic
- [ ] Maintain backward compatibility with search tools

**Expected Code**:
```typescript
// app/api/chat/route.ts - Updated approach
const result = streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  system: systemPrompt,
  messages,
  tools: {
    // Existing tools (unchanged)
    ...createSearchTools(studyId),
    // New synthesis tool (updated pattern)
    synthesizeResearchFindings: synthesizeResearchFindings,
  },
  maxSteps: 5,
});

// ✅ Standard AI SDK response (NEW)
return result.toDataStreamResponse();
```

**Success Criteria**:
- [ ] Synthesis tool executes and AI SDK captures results in `message.toolInvocations`
- [ ] Browser console shows tool invocation data instead of empty `streamDataCount`
- [ ] No 400 errors when saving messages
- [ ] Existing search tools continue working unchanged

### Phase 2: UI Component Integration (Week 2)
**Priority**: High - Restores structured message display  
**Goal**: Functional synthesis display using AI SDK patterns

#### 2.1 Message Detection & Routing
**Scope**: Update message components to use `message.toolInvocations`

**Key Changes**:
- [ ] Update `ProgressiveMessage.tsx` to check `message.toolInvocations`
- [ ] Remove custom `structuredResponse` prop dependency
- [ ] Implement tool result detection similar to weather example
- [ ] Maintain error boundaries and loading states

**Expected Code**:
```typescript
// components/chat/ProgressiveMessage.tsx - Updated detection
export function ProgressiveMessage({ message }: { message: Message }) {
  const synthesisInvocation = message.toolInvocations?.find(
    (inv) => inv.toolName === 'synthesizeResearchFindings' && inv.state === 'result'
  );

  if (synthesisInvocation) {
    return (
      <CitationErrorBoundary>
        <SynthesisDisplay 
          synthesis={synthesisInvocation.result}
          onCitationClick={onCitationClick}
        />
      </CitationErrorBoundary>
    );
  }

  // Standard message rendering
  return <StandardMessage message={message} />;
}
```

#### 2.2 Synthesis Display Component
**Scope**: Create dedicated synthesis display component following weather.tsx pattern

**Key Changes**:
- [ ] Create `components/chat/SynthesisDisplay.tsx` 
- [ ] Move structured citation rendering from `StructuredMessage.tsx`
- [ ] Implement citation expansion/collapse functionality
- [ ] Add synthesis metadata display (search queries, document count)

**Expected Code**:
```typescript
// components/chat/SynthesisDisplay.tsx - New component
interface SynthesisDisplayProps {
  synthesis: StructuredResponse;
  onCitationClick?: (citation: Citation) => void;
}

export function SynthesisDisplay({ synthesis, onCitationClick }: SynthesisDisplayProps) {
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set());

  const renderResponseWithCitations = (text: string) => {
    // Parse {{cite:id}} markers and render as interactive badges
    return text.split(/(\{\{cite:\w+\}\})/).map((part, index) => {
      const citationMatch = part.match(/\{\{cite:(\w+)\}\}/);
      if (citationMatch) {
        const citationId = citationMatch[1];
        const citation = synthesis.citations.find(c => c.id === citationId);
        return (
          <CitationBadge 
            key={index}
            citation={citation}
            onClick={() => onCitationClick?.(citation)}
            expanded={expandedCitations.has(citationId)}
          />
        );
      }
      return part;
    });
  };

  return (
    <Card className="bg-muted">
      <CardContent className="p-4 space-y-4">
        <div className="prose prose-sm max-w-none">
          {renderResponseWithCitations(synthesis.response)}
        </div>
        
        {synthesis.metadata && (
          <SynthesisMetadata metadata={synthesis.metadata} />
        )}
      </CardContent>
    </Card>
  );
}
```

**Success Criteria**:
- [ ] StructuredMessage renders with proper citations when synthesis tool called
- [ ] Citation badges work with expand/collapse functionality  
- [ ] No dependency on custom stream data or ChatPanel state
- [ ] Synthesis metadata displays correctly

### Phase 3: ChatPanel Simplification (Week 3)
**Priority**: Medium - Code cleanup and reliability  
**Goal**: Simplified ChatPanel without custom synthesis state management

#### 3.1 Remove Custom Synthesis State
**Scope**: Clean up ChatPanel by removing synthesis-specific state management

**Key Changes**:
- [ ] Remove `messageSynthesis` state from `ChatPanel.tsx`
- [ ] Remove custom synthesis detection in `onFinish` callback
- [ ] Simplify message saving logic (no special synthesis handling needed)
- [ ] Remove synthesis-related debugging code

**Expected Code**:
```typescript
// components/chat/ChatPanel.tsx - Simplified approach
export function ChatPanel({ studyId, onCitationClick }: ChatPanelProps) {
  // ❌ Remove: const [messageSynthesis, setMessageSynthesis] = useState<Record<string, StructuredResponse>>({});
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { studyId },
    onFinish: async (message) => {
      // ✅ Simplified: AI SDK handles tool results automatically
      await saveMessageWithRetry('ASSISTANT', message.content);
      // No custom synthesis detection needed
    },
  });

  return (
    <div className="h-full flex flex-col">
      {/* Messages render using standard AI SDK patterns */}
      {messages.map(message => (
        <ProgressiveMessage 
          key={message.id}
          message={message} // ✅ AI SDK provides toolInvocations automatically
          onCitationClick={onCitationClick}
        />
      ))}
    </div>
  );
}
```

#### 3.2 Remove Custom Hook Dependencies
**Scope**: Clean up unused hooks and utilities

**Key Changes**:
- [ ] Remove `useToolCallData` hook usage (no longer needed)
- [ ] Remove custom data stream processing
- [ ] Remove synthesis-specific props from ProgressiveMessage
- [ ] Clean up imports and unused code

**Success Criteria**:
- [ ] ChatPanel code simplified by ~50 lines
- [ ] No custom stream data processing 
- [ ] Standard AI SDK message flow works end-to-end
- [ ] All synthesis functionality preserved with simpler architecture

### Phase 4: Testing & Validation (Week 4)
**Priority**: Medium - Ensure reliability  
**Goal**: Comprehensive testing of new AI SDK integration

#### 4.1 Integration Testing
**Scope**: Test synthesis tool with AI SDK generative UI patterns

**Key Changes**:
- [ ] Add integration tests for synthesis tool invocation
- [ ] Test `message.toolInvocations` data structure
- [ ] Validate citation rendering with real synthesis results
- [ ] Test error handling and fallback scenarios

#### 4.2 Performance Validation
**Scope**: Ensure migration doesn't degrade performance

**Key Changes**:
- [ ] Benchmark synthesis response times before/after
- [ ] Test UI rendering performance with multiple citations
- [ ] Validate memory usage with tool invocation data
- [ ] Test concurrent synthesis requests

**Success Criteria**:
- [ ] All synthesis integration tests pass
- [ ] Performance within 10% of current implementation
- [ ] Error handling works for tool failures
- [ ] Backward compatibility with search tools maintained

## Migration Risks & Mitigation

### High Risk: Breaking Existing Synthesis Functionality
**Risk**: Current synthesis tool stops working during migration  
**Mitigation**: 
- Phase 1 focus on tool output only, keep UI unchanged initially
- Feature flag for new vs old synthesis approach
- Rollback plan to revert synthesis-tools.ts changes

### Medium Risk: AI Model Behavior Changes
**Risk**: AI model responds differently to standard tool pattern  
**Mitigation**:
- Test with various synthesis questions during Phase 1
- Monitor AI tool selection behavior
- Adjust system prompts if needed for tool usage

### Low Risk: ChatPanel State Management Issues
**Risk**: Removing custom state breaks other functionality  
**Mitigation**:
- Phase 3 focuses only on synthesis state removal
- Keep search tool citations handling unchanged initially
- Gradual removal of unused state variables

## Success Metrics

### Phase 1 Success Metrics
- [ ] Browser console shows `message.toolInvocations` data for synthesis
- [ ] Zero 400 "Role and content required" errors
- [ ] AI model uses synthesis tool results in responses
- [ ] Server logs show successful synthesis with AI SDK integration

### Phase 2 Success Metrics  
- [ ] StructuredMessage renders automatically when synthesis tool called
- [ ] Citation badges display and expand correctly
- [ ] Synthesis metadata shows search queries and document counts
- [ ] No custom stream data dependencies in UI components

### Phase 3 Success Metrics
- [ ] ChatPanel.tsx reduced by 40+ lines of synthesis-specific code
- [ ] Message saving simplified to single code path
- [ ] No synthesis state management in ChatPanel
- [ ] All functionality preserved with simpler architecture

### Overall Success Metrics
- [ ] **End-to-End**: Synthesis questions work identically to current UX
- [ ] **Architecture**: Standard AI SDK patterns throughout
- [ ] **Maintainability**: 30% fewer lines of synthesis-specific code
- [ ] **Reliability**: Zero synthesis-related crashes or empty messages

## Dependencies & Prerequisites

### External Dependencies
- [ ] AI SDK documentation for `toolInvocations` structure (need to analyze from Vercel examples)
- [ ] Understanding of `streamText().toDataStreamResponse()` vs `createDataStreamResponse()`

### Internal Dependencies
- [ ] Existing synthesis tool functionality (Phase 1 builds on this)
- [ ] Current CitationBadge and related UI components (Phase 2 uses these)
- [ ] Search tools integration (must remain unchanged throughout)

## Questions for Clarification

1. **Tool Result Structure**: Can you help me understand the exact structure of `message.toolInvocations[0].result` from the Vercel examples?

2. **API Route Pattern**: Should we use `streamText().toDataStreamResponse()` or continue with `createDataStreamResponse()` for the migration?

3. **Backward Compatibility**: Do we need to maintain the existing synthesis tool API during migration, or can we do a clean cutover?

4. **Testing Strategy**: What's the preferred approach for testing the new AI SDK patterns - integration tests or manual validation?

## Next Steps

1. **Get Missing Information**: Clarify questions about AI SDK `toolInvocations` structure
2. **Phase 1 Planning**: Create detailed technical plan for tool migration  
3. **Environment Setup**: Prepare branch for safe AI SDK pattern testing
4. **Stakeholder Alignment**: Confirm migration approach and timeline

This migration will transform our synthesis tool from a custom streaming approach to the standard AI SDK generative UI pattern, fixing the fundamental issues with tool result capture and message display while simplifying our codebase significantly.