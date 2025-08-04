# PRD: Inline Citations Enhancement

## Product Overview

Transform Skate AI's citation system from bottom-grouped citations to contextual inline citations that appear immediately next to the insights they support, improving research credibility and source traceability.

## Problem Statement

### **Current Citation UX Issues**
- **Disconnected Citations**: All citations appear grouped at the bottom of messages, disconnected from specific insights
- **Source Attribution Confusion**: Researchers can't quickly identify which sources support specific findings
- **Research Credibility Impact**: Bottom-grouped citations reduce the perceived credibility and academic rigor of AI-generated insights
- **Workflow Disruption**: Users must scroll between insights and citations, breaking research flow

### **User Impact**
- Researchers struggle to verify specific claims quickly
- Reduced confidence in AI-generated insights due to unclear source attribution
- Time wasted scrolling between insights and source references
- Academic/professional credibility concerns when sharing AI-generated research summaries

## Solution

Implement contextual inline citations that appear immediately adjacent to the insights they support, similar to academic paper formatting, while maintaining the existing citation panel for detailed source exploration.

## Current Architecture Analysis

### **Existing Citation Flow**
1. **Backend**: `lib/llm-tools/search-tools.ts` generates `SearchResult[]` from vector search
2. **API**: `app/api/chat/route.ts` streams content and citations separately via AI SDK
3. **Frontend**: `components/chat/ProgressiveMessage.tsx` displays content first, then all citations in a group
4. **Components**: `CitationBadge.tsx` and `CitationPanel.tsx` handle citation interactions

### **Key Technical Insights**
- Citations are already properly indexed and mapped to search results
- Current system streams citations separately from message content
- `ProgressiveMessage.tsx` at line 73-84 shows current grouping logic
- `CitationBadge.tsx` components are reusable and interaction-ready

## Phase 1: LLM Response Integration (1-2 weeks)

### 1.1 Enhanced System Prompting

**Goal**: Instruct Claude to include inline citation markers within response text

**Deliverables**:
- **Enhanced System Prompt** (`app/api/chat/route.ts`):
  - Add instructions for Claude to use `[cite:n]` markers where n matches citation index
  - Provide examples of proper inline citation placement
  - Maintain existing citation generation alongside inline markers
- **Citation-Text Coordination**: Ensure citations are available when Claude generates inline references

**Success Criteria**: 
- Claude consistently places citation markers in appropriate locations within response text
- Citation markers correctly correspond to available citation data
- No degradation in citation accuracy or relevance

### 1.2 Streaming Coordination

**Goal**: Ensure citations are available when processing inline markers

**Deliverables**:
- **Citation Buffering Logic**: Handle cases where citations arrive after text containing markers
- **Streaming Order Validation**: Ensure proper coordination between content and citation streams
- **Error Handling**: Graceful handling of mismatched citation markers

**Success Criteria**:
- 100% reliability in matching inline markers to available citations
- No broken inline citation references
- Smooth streaming experience without delays

## Phase 2: Frontend Parsing & Display (1-2 weeks)

### 2.1 Message Content Parser

**Goal**: Transform citation markers into interactive inline components

**Deliverables**:
- **Citation Parser** (`lib/utils/citation-parser.ts`):
  - Parse message content for `[cite:n]` markers
  - Replace markers with interactive `InlineCitationBadge` components
  - Preserve text formatting and structure
  - Handle edge cases (malformed markers, missing citations)

**Success Criteria**:
- Accurate parsing of all citation markers within message text
- Preserved text formatting and readability
- Robust handling of edge cases and parsing errors

### 2.2 Enhanced Message Display

**Goal**: Integrate inline citations seamlessly into message rendering

**Deliverables**:
- **Enhanced ProgressiveMessage** (`components/chat/ProgressiveMessage.tsx`):
  - Replace simple `{message.content}` with parsed content rendering
  - Maintain existing bottom-grouped citations as supplementary detail
  - Preserve all current functionality (copying, persistence error handling, etc.)
- **Inline Citation Component** (`components/chat/InlineCitationBadge.tsx`):
  - Variant of existing `CitationBadge` optimized for inline text flow
  - Smaller visual footprint while maintaining interactivity
  - Consistent styling with existing citation system

**Success Criteria**:
- Seamless integration of inline citations within message text
- Maintained readability and user experience
- Full backward compatibility with existing messages

### 2.3 Dual Citation Display

**Goal**: Provide both inline and detailed citation experiences

**Deliverables**:
- **Hybrid Citation UI**: Inline citations for immediate context + expanded `CitationPanel` for detailed exploration
- **Click-to-Expand**: Inline citations can expand to show full citation details
- **Cross-Reference Highlighting**: Clicking inline citations highlights corresponding entries in bottom panel

**Success Criteria**:
- Users can quickly verify sources inline while having access to detailed citation information
- Smooth interaction between inline and panel citations
- Enhanced rather than replaced citation exploration experience

## Phase 3: Polish & Optimization (1 week)

### 3.1 Visual Design & UX

**Goal**: Optimize inline citation appearance and interactions

**Deliverables**:
- **Inline Citation Styling**: Subtle, professional appearance that doesn't disrupt reading flow
- **Hover States**: Rich tooltips showing citation previews
- **Responsive Design**: Proper behavior across different device sizes
- **Accessibility**: Screen reader support and keyboard navigation

**Success Criteria**:
- Citations enhance rather than distract from content readability
- Professional, academic appearance suitable for research contexts
- Full accessibility compliance

### 3.2 Performance & Edge Cases

**Goal**: Ensure robust performance and handle all edge cases

**Deliverables**:
- **Parser Performance**: Efficient parsing of messages with many citations
- **Edge Case Handling**: Malformed markers, missing citations, streaming inconsistencies
- **Backward Compatibility**: Existing messages without inline markers display correctly
- **Testing Coverage**: Comprehensive unit and integration tests

**Success Criteria**:
- No performance degradation with complex citation patterns
- Graceful handling of all identified edge cases
- 100% backward compatibility with existing citation system

## Technical Requirements

### **New Components**
```typescript
// lib/utils/citation-parser.ts
interface ParsedContent {
  text: string;
  inlineCitations: InlineCitation[];
}

// components/chat/InlineCitationBadge.tsx  
interface InlineCitationBadgeProps {
  citation: Citation;
  index: number;
  compact?: boolean; // Smaller for inline use
}
```

### **Enhanced Types**
```typescript
// lib/types/citations.ts
interface MessageWithInlineCitations extends MessageWithCitations {
  hasInlineCitations: boolean;
  parsedContent?: ParsedContent;
}
```

### **System Prompt Enhancement**
- Add citation placement instructions to existing system prompt
- Provide examples of proper inline citation usage
- Maintain existing citation generation quality

## Success Metrics

### **User Experience Improvements**
- **Source Verification Speed**: 70% reduction in time to verify specific claims
- **Research Flow**: 50% reduction in scrolling between insights and citations  
- **User Satisfaction**: 90% preference for inline citations over bottom-grouped
- **Credibility Perception**: Increased perceived professionalism of AI-generated research

### **Technical Performance**
- **Parser Performance**: <50ms parsing time for messages with 20+ citations
- **Rendering Performance**: No impact on message rendering speed
- **Backward Compatibility**: 100% compatibility with existing citation system
- **Error Handling**: Graceful handling of all edge cases with no broken displays

### **Functional Quality**
- **Citation Accuracy**: Maintain 100% accuracy of citation-to-source mapping
- **Interaction Reliability**: 100% reliability of citation interactions (click, hover, expand)
- **Cross-Device Consistency**: Consistent experience across desktop, tablet, mobile

## Implementation Considerations

### **Backward Compatibility**
- All existing messages continue to display with bottom-grouped citations
- New messages with inline markers get enhanced display
- Gradual migration - no breaking changes to existing functionality

### **Progressive Enhancement**
- System gracefully falls back to current citation display if inline parsing fails
- Feature can be enabled/disabled via feature flags
- Non-disruptive rollout to existing users

### **Performance Safeguards**
- Parser optimization for messages with many citations
- Lazy loading of citation details to prevent performance impact
- Memory-efficient rendering of complex citation patterns

## Risk Mitigation

- **UX Risk**: A/B testing to validate user preference for inline vs grouped citations
- **Performance Risk**: Comprehensive performance testing with large citation sets
- **Complexity Risk**: Phased rollout with feature flags for quick rollback if needed
- **Technical Risk**: Robust fallback to existing citation system if parsing fails

## Dependencies

### **Prerequisite Systems**
- Existing citation system (`CitationBadge`, `CitationPanel`) must remain stable
- Current AI SDK streaming implementation needs to support citation-text coordination
- Vector search and citation generation accuracy must be maintained

### **No External Dependencies**
- Implementation uses existing tech stack (React, TypeScript, Tailwind)
- No new third-party libraries required
- Builds upon existing ShadCN UI components

## Conclusion

This enhancement transforms Skate AI's citation system from a disconnected reference list into a contextual, academic-quality source attribution system that maintains research credibility while improving user workflow efficiency.

The phased approach ensures that improvements are delivered incrementally while maintaining full backward compatibility and providing measurable user experience improvements at each stage.