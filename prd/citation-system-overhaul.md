# Citation System Overhaul PRD

## Executive Summary

The current citation system has critical architectural flaws causing application crashes, inconsistent user experience, and test failures. This PRD outlines a 3-phase approach to fix immediate issues while adopting production-ready patterns from the Vercel AI chatbot template.

**Current State**: Fragmented citation architecture with type safety issues and streaming inconsistencies
**Target State**: Unified, production-ready citation system with robust streaming and error recovery

## Problem Analysis

### Critical Issue #1: Type Safety Crisis
**Problem**: `useToolCallData` expects `unknown[]` but `useChat.data` can be undefined/null
**Impact**: `dataStream.filter is not a function` crashes in production
**Root Cause**: Missing null checks and type guards in data stream processing

```typescript
// Current problematic code in useToolCallData.ts:7
export function useToolCallData(dataStream: unknown[], messageId: string)
// dataStream is sometimes undefined, causing .filter() to crash
```

### Critical Issue #2: Fragmented Citation Architecture
**Problem**: Three competing citation systems with inconsistent data flows:
- `CitationBadge` (simple inline badges)
- `CitationPanel` (sidebar citation display) 
- `StructuredMessage` (advanced inline citations with expansion)

**Impact**: 
- Inconsistent citation rendering across components
- Duplicate citation logic maintenance
- User confusion from different citation UX patterns

### Critical Issue #3: Test Infrastructure Breakdown
**Problem**: Multiple test system failures preventing safe development:
- VoyageAI client constructor error (`new` keyword missing)
- Missing Prisma client mocks in integration tests
- jsdom form submission incompatibilities
- 21 failing tests out of 281 total

**Impact**: Cannot validate citation fixes or deploy with confidence

## Solution Architecture

### Architectural Principles
1. **Single Citation System**: Unified citation component and data flow
2. **Type Safety First**: Comprehensive type guards and null checks
3. **Streaming-Native**: Built around AI SDK streaming patterns
4. **Error Recovery**: Graceful fallbacks for failed citations
5. **Progressive Enhancement**: Each phase independently deployable

### Technical Approach

#### Citation Data Flow (Target State)
```
Chat API → createDataStreamResponse → AI SDK Stream → useChat.data → 
useToolCallData (with type safety) → StructuredMessage → CitationBadge
```

#### Key Technical Decisions
- **Primary Citation Component**: `StructuredMessage` (most feature-complete)
- **Streaming Pattern**: Vercel template's `createDataStreamResponse`
- **Type Safety**: Comprehensive type guards in `useToolCallData`
- **Error Boundaries**: Around all citation components

## Implementation Phases

### Phase 1: Emergency Stabilization
**Timeline**: 1-2 days
**Priority**: Critical - Fixes app crashes
**Goal**: Stable, non-crashing citation system

#### Scope
1. **Fix Type Safety in `useToolCallData`**
   - Add null/undefined checks for `dataStream`
   - Implement proper type guards for `ChatStreamData`
   - Add error boundaries around tool call processing

2. **Consolidate Citation Rendering**
   - Choose `StructuredMessage` as primary citation component
   - Update `ChatPanel` to use unified citation props
   - Remove conflicting `CitationBadge` implementations

3. **Fix Critical Test Issues**
   - Add `new` constructor to VoyageAI client mocks
   - Mock Prisma client for integration tests
   - Replace form submission tests with direct function calls

#### Success Criteria
- Zero `dataStream.filter is not a function` errors
- All citation components render without crashes
- Test suite passes with >90% success rate
- Chat interface functional end-to-end

#### Deliverables
- Updated `lib/hooks/useToolCallData.ts` with type safety
- Consolidated citation rendering in `ChatPanel.tsx`
- Fixed test mocks in failing test files
- Error boundaries around citation components

### Phase 2: Vercel Template Integration
**Timeline**: 3-5 days
**Priority**: High - Production reliability
**Goal**: Robust streaming citation system with enhanced UX
**Resources**: https://github.com/vercel/ai-chatbot

#### Scope
1. **Adopt `createDataStreamResponse` Pattern**
   - Refactor `/api/chat/route.ts` to use Vercel streaming approach
   - Implement proper data stream typing from template
   - Maintain existing search/synthesis tools compatibility

2. **Implement Unified Streaming Architecture**
   - Single citation data flow through AI SDK streaming
   - Tool call events and citations in same data stream
   - Real-time UI updates with proper error recovery

3. **Add Production Resilience Features**
   - Enhanced error recovery patterns from template
   - Graceful fallbacks for streaming failures
   - Improved loading states and user feedback

#### Success Criteria
- Citations stream in real-time during AI responses
- Seamless integration with existing search/synthesis tools
- No citation data loss during streaming interruptions
- Enhanced error messages and recovery options

#### Deliverables
- Refactored `/api/chat/route.ts` using Vercel patterns
- Updated streaming types in `lib/types/chat-phases.ts`
- Enhanced error handling in `ChatPanel.tsx`
- Real-time citation streaming components

### Phase 3: Production Hardening
**Timeline**: 1 week
**Priority**: Medium - Enhanced user experience
**Goal**: Enterprise-grade citation system with monitoring

#### Scope
1. **Advanced Streaming Features**
   - `smoothStream()` implementation for better UX
   - Resumable stream contexts for interrupted conversations
   - Dynamic tool configuration based on query complexity

2. **Multi-Model Support**
   - Claude Haiku for simple queries
   - Claude Sonnet for complex synthesis tasks
   - Automatic model selection based on citation complexity

3. **Comprehensive Testing & Monitoring**
   - Integration tests for streaming citation pipeline
   - Performance testing for large document sets
   - Telemetry integration for citation performance monitoring

#### Success Criteria
- Smooth citation streaming without UI flickering
- Resume conversations after interruptions
- Automatic model selection working correctly
- Comprehensive test coverage >95%
- Production telemetry capturing citation metrics

#### Deliverables
- `smoothStream()` implementation
- Resumable stream context system
- Multi-model configuration system
- Comprehensive test suite
- Telemetry dashboard integration

## Risk Assessment

### High Risk
- **Phase 1**: Breaking existing citation functionality during consolidation
  - *Mitigation*: Feature flags and gradual rollout
- **Phase 2**: Data loss during streaming refactor
  - *Mitigation*: Keep current API as fallback during transition

### Medium Risk
- **Phase 3**: Performance degradation with advanced features
  - *Mitigation*: Performance testing and optimization checkpoints

### Low Risk
- Test infrastructure changes affecting unrelated functionality
  - *Mitigation*: Isolated test environment and gradual test migration

## Success Metrics

### Phase 1 Metrics
- **Crash Rate**: 0% citation-related crashes
- **Test Pass Rate**: >90% (from current ~75%)
- **Error Rate**: <1% citation rendering failures

### Phase 2 Metrics
- **Citation Latency**: <200ms from tool call to UI display
- **Streaming Reliability**: >99% successful citation streams
- **User Experience**: Seamless citation display during AI responses

### Phase 3 Metrics
- **Performance**: <100ms citation rendering for 50+ citations
- **Reliability**: >99.9% uptime with resume capability
- **User Satisfaction**: Citation system rated >4.5/5 in user feedback

## Dependencies

### Phase 1 Dependencies
- Access to test environment
- Ability to modify core citation components

### Phase 2 Dependencies
- Phase 1 completion
- Vercel template code analysis
- AI SDK streaming documentation

### Phase 3 Dependencies
- Phase 2 completion
- Production environment access
- Telemetry infrastructure setup

## Timeline Summary

- **Week 1**: Phase 1 (Emergency Stabilization)
- **Week 2**: Phase 2 (Vercel Template Integration)
- **Week 3-4**: Phase 3 (Production Hardening)

**Total Timeline**: 3-4 weeks for complete citation system overhaul

## Next Steps

1. **Phase 1 Planning**: Create detailed implementation plan for emergency fixes
2. **Resource Allocation**: Assign developers to each phase
3. **Environment Setup**: Prepare staging environment for safe testing
4. **Stakeholder Review**: Get approval for phased approach and timeline

This PRD serves as the foundation for systematically transforming the citation system from its current fragmented state into a production-ready, user-friendly experience.