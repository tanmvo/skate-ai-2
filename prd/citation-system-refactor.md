# PRD: Citation System Refactoring with React Best Practices

## Overview
Refactor the existing citation system to follow React best practices from CLAUDE.md, focusing on custom hooks, component composition, performance optimization, and proper data fetching patterns. The primary goal is to eliminate duplicate search execution and improve code maintainability.

## Goals
- Encapsulate citation logic in custom hooks (hooks-first pattern)
- Eliminate prop drilling using React Context
- **Eliminate duplicate search execution** (currently re-running searches in `onFinish`)
- Improve performance with memoization and caching
- Break down complex components into smaller, composable pieces
- Follow SWR patterns for client-side data fetching
- Implement request-scoped caching to prevent duplicate search execution

## Design Decisions

### Caching Strategy
**Request-scoped cache** - Cache lives only during a single chat API request and is discarded afterward.
- Search results cached during tool execution
- Citations extracted from cache in `onFinish` callback
- Cache discarded when request completes
- **Rationale:** Simpler implementation, no memory leaks, eliminates duplicate work within request

### Context Scope
**Study-level** - CitationContext scoped to individual study pages.
- Provider wraps study chat interface in `app/study/[studyId]/page.tsx`
- Citations always associated with specific study documents
- Clear data boundaries and lifecycle

### Migration Strategy
**New citations only** - No database migration for existing citations.
- Existing citation data remains unchanged
- New citation processing uses refactored system
- Backward compatible with current database schema

### Performance Budget
**Target: 0ms additional latency**
- **Current problem:** Duplicate search execution adds 500-1000ms
- **Solution:** Cache search results during tool execution, reuse in `onFinish`
- **Acceptable citation rendering:** <10ms per message
- **Total improvement:** -500 to -1000ms (net performance gain)

### Testing Priority
**Hooks > Integration > Components**
1. **Hooks (highest priority):** Core business logic, most complex, highest risk
2. **Integration tests:** End-to-end citation flow validation
3. **Components (lower priority):** Simple presentation logic, visual testing

---

## Implementation Plan

### Phase 1: Custom Hooks Layer (2-3 hours)

#### 1.1 Create Citation Data Hook
**File:** `lib/hooks/useCitations.ts`

```typescript
interface UseCitationsResult {
  citations: CitationMap | null;
  isLoading: boolean;
  error: Error | null;
  mutate: () => void;
}

function useCitations(messageId: string): UseCitationsResult
```

**Requirements:**
- ✅ Use SWR for data fetching from `/api/citations/${messageId}`
- ✅ Return citation map, loading state, error state, mutate function
- ✅ Implement revalidation strategy: `revalidateOnFocus: false`
- ✅ Type-safe with existing `CitationMap` interface
- ✅ Handle empty/null states gracefully

#### 1.2 Create Citation Parsing Hook
**File:** `lib/hooks/useCitationParsing.ts`

```typescript
interface ParsedCitation {
  id: string;
  documentId: string;
  content: string;
}

interface UseCitationParsingResult {
  parsedContent: string;
  citations: ParsedCitation[];
}

function useCitationParsing(
  content: string,
  citationMap: CitationMap | null
): UseCitationParsingResult
```

**Requirements:**
- ✅ Memoize citation lookup creation using `useMemo`
- ✅ Memoize remark plugin initialization
- ✅ Return parsed markdown content with citation placeholders
- ✅ Prevent re-computation on every render
- ✅ Handle malformed citation syntax gracefully

#### 1.3 Create Citation Validation Hook
**File:** `lib/hooks/useCitationValidation.ts`

```typescript
interface CitationValidation {
  [citationId: string]: {
    isValid: boolean;
    documentExists: boolean;
    error?: string;
  }
}

function useCitationValidation(
  citations: CitationMap | null,
  studyId: string
): CitationValidation
```

**Requirements:**
- ✅ Validate document existence against current study documents
- ✅ Use existing `useDocuments()` hook for document list
- ✅ Return validation status for each citation
- ✅ Memoize validation results
- ✅ Handle deleted documents gracefully

**Tests Required:**
- Unit tests for all three hooks with SWR mocking
- Memoization behavior validation
- Error state handling
- Edge cases (null maps, empty content, deleted documents)

---

### Phase 2: React Context for Citation State (1-2 hours)

#### 2.1 Create Citation Context
**File:** `lib/contexts/CitationContext.tsx`

```typescript
interface CitationContextValue {
  getCitationsForMessage: (messageId: string) => CitationMap | null;
  validateCitation: (citationId: string, documentId: string) => boolean;
  isDocumentValid: (documentId: string) => boolean;
  studyId: string;
}

function CitationProvider({
  children,
  studyId
}: {
  children: React.ReactNode;
  studyId: string;
})
```

**Requirements:**
- ✅ Provide citation lookup utilities to component tree
- ✅ Use `useDocuments(studyId)` hook for document validation
- ✅ Memoize context value to prevent unnecessary re-renders
- ✅ Type-safe context with no undefined states

#### 2.2 Update App Layout
**File:** `app/study/[studyId]/page.tsx`

**Requirements:**
- ✅ Wrap chat interface with `<CitationProvider>`
- ✅ Pass `studyId` prop to provider
- ✅ Ensure provider wraps all components needing citation data
- ✅ No breaking changes to existing component hierarchy

**Tests Required:**
- Context provider rendering tests
- Context value propagation tests
- Document validation integration tests

---

### Phase 3: Component Refactoring (2-3 hours)

#### 3.1 Refactor MarkdownRenderer
**File:** `components/chat/MarkdownRenderer.tsx`

**Changes:**
- ✅ Extract markdown rendering to `<MarkdownContent>` component
- ✅ Use `useCitationParsing()` hook for citation processing
- ✅ Simplify to composition pattern (< 50 lines)
- ✅ Add `React.memo` with custom comparison function
- ✅ Only re-render when content or citations change

#### 3.2 Create MarkdownContent Component
**File:** `components/chat/MarkdownContent.tsx`

```typescript
interface MarkdownContentProps {
  content: string;
  remarkPlugins?: PluggableList;
  components?: Partial<Components>;
}
```

**Requirements:**
- ✅ Pure presentational component
- ✅ Accepts remark plugins and custom components as props
- ✅ No citation-specific logic (separation of concerns)
- ✅ Memoized with `React.memo`

#### 3.3 Refactor CitationBadge
**File:** `components/chat/CitationBadge.tsx`

**Changes:**
- ✅ Use `useCitation()` context hook instead of props
- ✅ Remove `documentExists` prop (fetch from context)
- ✅ Add `React.memo` for performance optimization
- ✅ Implement error boundary for graceful degradation
- ✅ Show "Document deleted" tooltip when document missing

#### 3.4 Update ProgressiveMessage
**File:** `components/chat/ProgressiveMessage.tsx`

**Changes:**
- ✅ Remove citation prop drilling
- ✅ Citations automatically available via context
- ✅ Cleaner component tree
- ✅ No breaking changes to parent components

**Tests Required:**
- Component rendering tests with React Testing Library
- Citation badge interaction tests
- Error boundary behavior tests
- Markdown parsing edge cases

---

### Phase 4: Server-Side Citation Service (2-3 hours)

#### 4.1 Create Citation Service
**File:** `lib/services/citation-service.ts`

```typescript
interface SearchResultCache {
  toolCallId: string;
  results: SearchResult[];
  timestamp: number;
}

function cacheSearchResults(
  toolCallId: string,
  results: SearchResult[]
): void

function getCachedSearchResults(
  toolCallId: string
): SearchResult[] | null

function extractCitationsWithCache(
  toolCalls: ToolCall[]
): CitationMap
```

**Requirements:**
- ✅ Implement request-scoped cache for search results
- ✅ Cache keyed by tool call ID
- ✅ Cache search results during tool execution (before streaming)
- ✅ Reuse cached results in `onFinish` callback
- ✅ **Eliminate duplicate search execution**
- ✅ Cache cleared when request completes

#### 4.2 Implement Search Result Caching
**File:** `lib/cache/search-result-cache.ts`

```typescript
class SearchResultCache {
  private cache: Map<string, CacheEntry>;

  set(key: string, value: SearchResult[]): void
  get(key: string): SearchResult[] | null
  clear(): void
  has(key: string): boolean
}

// Request-scoped instance
export const searchResultCache = new SearchResultCache();
```

**Requirements:**
- ✅ In-memory cache with Map data structure
- ✅ Request-scoped lifecycle (manual clear after request)
- ✅ Thread-safe operations
- ✅ Simple get/set/clear interface

#### 4.3 Update Chat API Route
**File:** `app/api/chat/route.ts`

**Changes:**
- ✅ Cache search results during tool execution
- ✅ Store results in cache before streaming to client
- ✅ Replace `extractSearchResultsFromToolCalls()` with `extractCitationsWithCache()`
- ✅ Use cached results in `onFinish` callback
- ✅ Clear cache after response completes
- ✅ **Remove duplicate search execution (500-1000ms saved)**

**Tests Required:**
- Cache hit/miss behavior tests
- Citation extraction accuracy tests
- Performance benchmarks (before/after)
- Concurrent request isolation tests

---

### Phase 5: Performance Optimizations (1-2 hours)

#### 5.1 Add Memoization
**Requirements:**
- ✅ Add `React.memo` to all citation components
- ✅ Custom comparator functions for complex props
- ✅ Memoize expensive parsing operations in hooks
- ✅ Optimize re-render behavior during streaming
- ✅ Profile with React DevTools to verify

#### 5.2 Implement Code Splitting
**Requirements:**
- ✅ Lazy load citation components with `React.lazy()`
- ✅ Use Suspense boundaries for citation data loading
- ✅ Progressive enhancement for citation rendering
- ✅ Fallback UI while citations load

#### 5.3 Add Performance Monitoring
**File:** `lib/analytics/citation-metrics.ts`

```typescript
interface CitationMetrics {
  parsingTime: number;
  cacheHitRate: number;
  validationFailures: number;
}

function trackCitationParsing(duration: number): void
function trackCacheHit(hit: boolean): void
function trackValidationFailure(citationId: string, reason: string): void
```

**Requirements:**
- ✅ Track citation parsing performance
- ✅ Monitor cache hit rates
- ✅ Log citation validation failures
- ✅ Console.log metrics in development
- ✅ Optional analytics integration point

**Tests Required:**
- Performance regression tests
- Re-render count validation
- Cache hit rate monitoring

---

### Phase 6: Error Handling & Edge Cases (1 hour)

#### 6.1 Create Citation Error Boundary
**File:** `components/chat/CitationErrorBoundary.tsx`

```typescript
class CitationErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
>
```

**Requirements:**
- ✅ Wrap citation components in error boundary
- ✅ Graceful fallback UI when citations fail
- ✅ Log errors to console in development
- ✅ Optional error reporting integration
- ✅ Reset boundary on message change

#### 6.2 Handle Edge Cases

**Scenarios:**
1. **Document deleted after citation created**
   - ✅ Show "Document deleted" tooltip in badge
   - ✅ Gray out citation badge
   - ✅ Citation still renders in message

2. **Invalid citation format in database**
   - ✅ Skip rendering malformed citations
   - ✅ Log validation error
   - ✅ Don't crash UI

3. **Network failures when fetching citations**
   - ✅ SWR retry with exponential backoff
   - ✅ Show loading state during retry
   - ✅ Fallback to "Citations unavailable" after max retries

4. **Empty citation maps**
   - ✅ No-op rendering (don't show badges)
   - ✅ No error states
   - ✅ Clean message display

#### 6.3 Add User Feedback
**Requirements:**
- ✅ Toast notifications for citation validation failures (optional)
- ✅ Loading skeleton while citations load
- ✅ Tooltip explanations for citation states
- ✅ Accessible error messages

**Tests Required:**
- Error boundary rendering tests
- Edge case handling for all scenarios
- Accessibility tests for error states

---

### Phase 7: Testing & Validation (2 hours)

#### 7.1 Unit Tests
**Files:**
- `__tests__/hooks/useCitations.test.ts`
- `__tests__/hooks/useCitationParsing.test.ts`
- `__tests__/hooks/useCitationValidation.test.ts`

**Requirements:**
- ✅ Mock SWR responses
- ✅ Test all hook return values
- ✅ Validate memoization behavior
- ✅ Test error states
- ✅ Test loading states
- ✅ **Coverage target: 95%+**

#### 7.2 Component Tests
**Files:**
- `__tests__/components/CitationBadge.test.tsx`
- `__tests__/components/MarkdownRenderer.test.tsx`
- `__tests__/components/CitationErrorBoundary.test.tsx`

**Requirements:**
- ✅ Test citation rendering with context
- ✅ Validate tooltip behavior
- ✅ Test document existence states
- ✅ Accessibility compliance
- ✅ **Coverage target: 90%+**

#### 7.3 Integration Tests
**File:** `__tests__/integration/citation-system.test.ts`

**Test scenarios:**
1. ✅ Full citation flow (extraction → parsing → rendering)
2. ✅ Cache behavior validation
3. ✅ Streaming citation updates
4. ✅ Multi-document citation handling
5. ✅ Error recovery scenarios

**Requirements:**
- ✅ End-to-end test with real components
- ✅ Mock API responses
- ✅ Validate citation accuracy
- ✅ Performance benchmarks

---

### Phase 8: Documentation & Cleanup (1 hour)

#### 8.1 Update Type Definitions
**Requirements:**
- ✅ Export all citation types from `lib/types/citations.ts`
- ✅ Add JSDoc comments to public APIs
- ✅ Update interface documentation
- ✅ Ensure 100% type coverage

#### 8.2 Code Documentation
**Requirements:**
- ✅ Add JSDoc to all hooks
- ✅ Document cache behavior
- ✅ Add usage examples to components
- ✅ Update CLAUDE.md with citation patterns

#### 8.3 Cleanup Old Code
**Requirements:**
- ✅ Remove deprecated citation utilities
- ✅ Update imports across codebase
- ✅ Remove unused dependencies
- ✅ Clean up commented code

---

## Success Criteria

### Code Quality
- ✅ All citation logic encapsulated in custom hooks
- ✅ Zero prop drilling for citation data
- ✅ Components are <100 lines each (composition pattern)
- ✅ 95%+ TypeScript type coverage
- ✅ ESLint passes with no warnings

### Performance
- ✅ **Search results cached (no duplicate execution)**
- ✅ **500-1000ms latency reduction (net performance gain)**
- ✅ Citation parsing memoized properly
- ✅ <10ms citation rendering time per message
- ✅ Zero unnecessary re-renders during streaming

### Reliability
- ✅ Error boundaries prevent UI crashes
- ✅ Graceful degradation for all edge cases
- ✅ 95%+ unit test coverage for hooks
- ✅ Integration tests for full citation flow
- ✅ All edge cases handled without errors

### Developer Experience
- ✅ Clear separation of concerns
- ✅ Easy to add new citation features
- ✅ Follows all CLAUDE.md patterns
- ✅ Comprehensive documentation
- ✅ Type-safe APIs

---

## Timeline

**Total: 12-16 hours**

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Custom Hooks | 2-3 hours | HIGH |
| Phase 2: React Context | 1-2 hours | HIGH |
| Phase 3: Component Refactoring | 2-3 hours | HIGH |
| Phase 4: Server-Side Caching | 2-3 hours | **CRITICAL** |
| Phase 5: Performance Optimization | 1-2 hours | MEDIUM |
| Phase 6: Error Handling | 1 hour | HIGH |
| Phase 7: Testing | 2 hours | HIGH |
| Phase 8: Documentation | 1 hour | MEDIUM |

---

## Rollback Plan

If issues arise during implementation:

1. **Keep old citation utilities** until new implementation validated
2. **Feature flag** new citation system with `ENABLE_NEW_CITATIONS` env var
3. **Gradual rollout:**
   - Phase A: Non-streaming citations first
   - Phase B: Enable streaming citations
   - Phase C: Full rollout
4. **Database schema unchanged** (backward compatible)
5. **Easy revert:** Git branch isolation, no breaking schema changes

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance regression | HIGH | LOW | Benchmark tests, performance monitoring |
| Breaking existing citations | HIGH | MEDIUM | Backward compatible, feature flag |
| Cache memory leaks | MEDIUM | LOW | Request-scoped cache, auto-cleanup |
| Type errors in hooks | LOW | LOW | Comprehensive TypeScript coverage |
| SWR integration bugs | MEDIUM | MEDIUM | Extensive unit tests, SWR mocking |

---

## Open Questions

None - all questions from implementation plan have been answered:
- ✅ **Caching Strategy:** Request-scoped
- ✅ **Context Scope:** Study-level
- ✅ **Migration:** New citations only
- ✅ **Performance Budget:** 0ms additional latency (net -500 to -1000ms gain)
- ✅ **Testing Priority:** Hooks > Integration > Components

---

## References

- [CLAUDE.md React Patterns](../CLAUDE.md#react-development-patterns)
- [SWR Documentation](https://swr.vercel.app/)
- [React Context Best Practices](https://react.dev/learn/passing-data-deeply-with-context)
- [React Hooks Best Practices](https://react.dev/reference/react)
