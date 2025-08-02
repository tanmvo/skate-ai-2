# PRD: Frontend Message Splitting - Tool Call & Results Separation

## Product Overview

Enhance Skate AI's chat interface by parsing AI SDK tool calling flow on the frontend to separate thinking steps from final results, providing natural progressive conversation bubbles that show AI reasoning process transparently.

## Problem Statement

- **Current Issue**: AI SDK `maxSteps` configuration creates single monolithic responses that combine tool acknowledgments with results in one chat bubble
- **UX Confusion**: Users see "Let me search for research.txt... [search results]" in single bubble, making the conversation flow feel unnatural
- **Missing User Control**: No option for users to choose between transparent (show AI thinking) vs efficient (direct results) interaction styles
- **Chat Flow Inconsistency**: Tool calling workflow doesn't match expected chat bubble patterns from modern AI interfaces

## Solution

Implement frontend message splitting that parses AI SDK tool calling flow to separate thinking steps from final responses, providing users with natural progressive conversation experience without requiring custom AI response formats.

## Core Features

### 1. AI SDK Tool Call Detection
**Stream Parsing**: Parse AI SDK streaming responses to detect tool calling phases
- Monitor `useChat` data stream for tool call events
- Detect when tools like `find_document_ids` and `search_specific_documents` are invoked
- Capture tool names, parameters, and results from the stream

### 2. Frontend Message Splitting
**Natural Flow Parsing**: Split AI SDK responses into logical conversation bubbles
- Tool call phase → "Thinking" bubble showing search activity
- Final text response → "Results" bubble with analysis and citations
- Preserve original AI SDK functionality without custom response formats

### 3. Progressive Conversation Display
**Enhanced Chat Flow**: Show AI thinking process transparently
- Thinking bubbles: Light blue with tool activity indicators ("Searching research.txt...")
- Results bubbles: Standard styling with full analysis and citations
- Smooth transitions between thinking and results phases

### 4. User Preference Toggle
**Show/Hide Thinking Steps**: Allow users to control conversation transparency
- Progressive Mode: Show tool calling bubbles + final results
- Direct Mode: Show only final results (hide tool calling bubbles)
- Persistent user preference with instant UI updates

## Phase 1: AI SDK Stream Parsing (Week 1)

### Phase 1.1: Tool Call Detection Infrastructure (2-3 days)

**Goal**: Parse AI SDK streaming data to detect tool calling phases

**Deliverables**:
- Enhanced `ChatPanel.tsx` with stream data monitoring
- Tool call event detection from `useChat` data stream
- Tool metadata extraction (tool names, parameters, results)

**Technical Implementation**:
```typescript
// Enhanced useChat monitoring
const { messages, data } = useChat({
  // ... existing config
});

// Parse tool call events from data stream
const parseToolCalls = (dataStream: unknown[]) => {
  return dataStream
    .filter(item => item?.type === 'tool-call' || item?.type === 'tool-result')
    .map(item => ({
      type: item.type,
      toolName: item.toolName,
      parameters: item.parameters,
      result: item.result,
      timestamp: Date.now()
    }));
};
```

**Success Criteria**: Reliable detection of tool call events during AI SDK streaming

### Phase 1.2: Message Phase Classification (2-3 days)

**Goal**: Classify message content into thinking vs results phases

**Deliverables**:
- Message phase detection logic
- Tool call activity summarization
- Final response content extraction

**Technical Implementation**:
```typescript
// Message phase classification
interface MessagePhase {
  type: 'thinking' | 'results';
  content: string;
  toolCalls?: ToolCallData[];
  timestamp: number;
}

const classifyMessagePhases = (message: Message, toolCalls: ToolCallData[]) => {
  const phases: MessagePhase[] = [];
  
  // Add thinking phase if tool calls detected
  if (toolCalls.length > 0) {
    phases.push({
      type: 'thinking',
      content: generateThinkingContent(toolCalls),
      toolCalls,
      timestamp: Date.now()
    });
  }
  
  // Add results phase with final message content
  phases.push({
    type: 'results',
    content: message.content,
    timestamp: Date.now()
  });
  
  return phases;
};
```

**Success Criteria**: Accurate classification of message content into logical phases

### Phase 1.3: Stream Processing Pipeline (1-2 days)

**Goal**: Create real-time processing pipeline for incoming messages

**Deliverables**:
- Real-time stream processing hook
- Phase detection during message streaming
- State management for message phases

**Success Criteria**: Smooth real-time processing without blocking UI updates

## Phase 2: Message Splitting & Bubble Management (Week 2)

### Phase 2.1: Bubble Component Architecture (2-3 days)

**Goal**: Create separate bubble components for thinking and results phases

**Deliverables**:
- `ThinkingBubble` component for tool call activities
- Enhanced `ResultsBubble` component for final responses
- Shared bubble styling and animation system

**Technical Implementation**:
```typescript
const ThinkingBubble = ({ toolCalls, className }) => {
  const generateThinkingText = (toolCalls) => {
    const toolNames = toolCalls.map(tc => tc.toolName);
    if (toolNames.includes('find_document_ids')) return 'Looking up documents...';
    if (toolNames.includes('search_specific_documents')) return 'Searching specific documents...';
    if (toolNames.includes('search_all_documents')) return 'Searching all documents...';
    return 'Processing your request...';
  };

  return (
    <Card className={cn("bg-blue-50 border-blue-200 max-w-[70%]", className)}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-blue-700">
          <Search className="h-3 w-3 animate-pulse" />
          <span className="text-sm">{generateThinkingText(toolCalls)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const ResultsBubble = ({ content, citations, className }) => {
  return (
    <Card className={cn("bg-muted max-w-[80%]", className)}>
      <CardContent className="p-3">
        <div className="prose prose-sm">{content}</div>
        {citations && <CitationDisplay citations={citations} />}
      </CardContent>
    </Card>
  );
};
```

**Success Criteria**: Clean, visually distinct bubble components with proper styling

### Phase 2.2: Message Phase Rendering (2-3 days)

**Goal**: Render message phases as separate bubbles based on tool call detection

**Deliverables**:
- Phase-based message rendering logic
- Progressive bubble display as messages stream in
- Smooth transitions between thinking and results phases

**Technical Implementation**:
```typescript
const PhaseBasedMessage = ({ message, toolCalls, citations, showThinking }) => {
  const phases = classifyMessagePhases(message, toolCalls);
  
  return (
    <div className="space-y-3">
      {phases.map((phase, index) => {
        if (phase.type === 'thinking' && !showThinking) return null;
        
        return (
          <div key={`${message.id}-${phase.type}-${index}`}>
            {phase.type === 'thinking' ? (
              <ThinkingBubble 
                toolCalls={phase.toolCalls} 
                className="animate-fade-in"
              />
            ) : (
              <ResultsBubble 
                content={phase.content}
                citations={citations}
                className="animate-fade-in delay-200"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
```

**Success Criteria**: Smooth progressive display of thinking → results phases

### Phase 2.3: Real-time Stream Integration (2-3 days)

**Goal**: Integrate phase rendering with real-time AI SDK streaming

**Deliverables**:
- Stream-aware bubble updates
- Progressive phase reveal during message generation
- Optimistic UI updates for better perceived performance

**Technical Implementation**:
```typescript
// Hook for real-time phase updates
const useMessagePhases = (message, dataStream) => {
  const [phases, setPhases] = useState<MessagePhase[]>([]);
  
  useEffect(() => {
    const toolCalls = parseToolCalls(dataStream);
    const currentPhases = classifyMessagePhases(message, toolCalls);
    
    // Update phases progressively as stream comes in
    setPhases(currentPhases);
  }, [message, dataStream]);
  
  return phases;
};

// In ChatPanel.tsx
const phases = useMessagePhases(message, data);
return <PhaseBasedMessage phases={phases} showThinking={showThinking} />;
```

**Success Criteria**: Real-time phase updates that feel natural and responsive

## Phase 3: User Preference System (Week 3)

### Phase 3.1: Response Mode Toggle (2-3 days)

**Goal**: Allow users to switch between progressive and direct modes

**Deliverables**:
- Toggle component in chat interface
- Local storage for preference persistence
- Real-time mode switching

**Technical Implementation**:
```typescript
const ResponseModeToggle = () => {
  const [responseMode, setResponseMode] = useLocalStorage('responseMode', 'progressive');
  
  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
      <MessageSquare className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">Show thinking steps</span>
      <Switch 
        checked={responseMode === 'progressive'}
        onCheckedChange={(checked) => 
          setResponseMode(checked ? 'progressive' : 'direct')
        }
      />
    </div>
  );
};
```

**Success Criteria**: Persistent user preference with immediate UI updates

### Phase 3.2: Chat Integration (1-2 days)

**Goal**: Integrate response mode with chat functionality

**Deliverables**:
- Mode parameter passed to chat API
- Dynamic UI updates based on preference
- Existing message re-rendering for mode changes

**Success Criteria**: Seamless mode switching affects both new and existing messages

### Phase 3.3: Enhanced UX Polish (1-2 days)

**Goal**: Polish the overall user experience

**Deliverables**:
- Smooth animations for bubble transitions
- Improved spacing and typography
- Accessibility enhancements
- Mobile responsive design

**Success Criteria**: Professional, polished interface that feels natural on all devices

## Phase 4: Testing & Optimization (Week 4)

### Phase 4.1: Comprehensive Testing (2-3 days)

**Test Scenarios**:
```typescript
// Progressive Mode Tests
✅ User asks about specific document → Shows thinking + results bubbles
✅ User asks general question → Shows thinking + results bubbles  
✅ Document not found → Shows thinking + error guidance bubbles
✅ Tool calling fails → Shows thinking + fallback suggestion bubbles

```

### Phase 4.2: Performance Optimization (1-2 days)

**Optimization Areas**:
- Response parsing performance
- Bubble rendering efficiency
- Citation loading optimization
- Memory usage for message history

### Phase 4.3: Edge Case Handling (1-2 days)

**Edge Cases**:
- Malformed structured responses
- Very long thinking or results content
- Network interruptions during streaming
- Citation parsing errors

## Success Metrics

### User Experience Metrics
- **Response Clarity**: 95% of users understand the difference between thinking and results
- **Preference Usage**: 40% of users actively choose their preferred mode
- **User Satisfaction**: 90% positive feedback on response clarity

### Technical Metrics
- **Parsing Accuracy**: 99% successful parsing of structured responses
- **Performance**: No measurable impact on chat response times
- **Reliability**: 99.9% uptime for dual response functionality


## Technical Architecture

### Response Flow Diagram
```
User Query → Chat API → AI with Mode-Aware Prompt → Structured Response → Frontend Parser → Dual Bubbles
                ↓                    ↓                     ↓                     ↓              ↓
            Mode Param        Tool Calling         THINKING/RESULTS        Bubble Type      UI Display
```

### Component Hierarchy
```
ChatPanel
├── ResponseModeToggle
├── MessageList
│   ├── UserMessage (standard bubble)
│   └── AssistantMessage
│       ├── ThinkingBubble (progressive mode only)
│       └── ResultsBubble (always shown)
│           └── CitationDisplay
└── MessageInput
```

### Data Flow
1. User submits query with preferred response mode
2. Backend generates structured response based on mode
3. Frontend parses response into thinking/results components
4. UI renders appropriate bubbles based on user preference
5. Citations attach only to results bubbles

## Risk Assessment

### Low Risk
- **Backward Compatibility**: Fallback to standard responses ensures no breaking changes
- **Performance Impact**: Minimal parsing overhead
- **User Confusion**: Clear visual differentiation prevents confusion

### Medium Risk
- **AI Consistency**: AI might not always follow structured format (Mitigation: Robust parsing with fallbacks)
- **Mobile UX**: Dual bubbles on small screens (Mitigation: Responsive design testing)

### Mitigation Strategies
- Comprehensive fallback handling for non-structured responses
- Progressive enhancement approach
- Extensive mobile testing
- User feedback collection for iteration

## Implementation Dependencies

### Technical Dependencies
- Existing AI SDK tool calling functionality ✅
- Current chat infrastructure ✅  
- Citation system ✅
- useChat hook from Vercel AI SDK ✅

### No Breaking Changes
- All existing functionality preserved
- Default to progressive mode for seamless transition
- Fallback parsing ensures compatibility

---

**This PRD enhances user experience by parsing natural AI SDK tool calling flow to create transparent, progressive conversation bubbles while maintaining the robust tool calling and citation system already implemented.**