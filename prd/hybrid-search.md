# PRD: Hybrid Search & LLM Tools Enhancement

## Product Overview

Transform Skate AI's research platform with intelligent hybrid search that combines semantic understanding with structured metadata queries, exposed through LLM function calling tools.

## Problem Statement

- **Current Issue**: LLM gets confused about document counts and study structure due to vector-only context
- **Citation Accuracy Issue**: When users ask about specific documents, citations show results from all documents in study instead of only the referenced documents
- **User Impact**: Inconsistent responses to basic questions like "how many documents do I have?" and incorrect source attribution
- **Technical Debt**: Pure vector search can't handle metadata queries effectively or respect document-specific context

## Solution

Implement hybrid search architecture with LLM tools that provide real-time database access for metadata queries while maintaining semantic search for content analysis.

## Phase 0: Citation Accuracy Foundation (1-2 weeks)

**Priority**: Critical foundation for all subsequent phases. Fixes immediate user-facing citation accuracy issues while building infrastructure for advanced hybrid search.

**Approach**: Parallel sub-agent implementation with phased reviews to manage complexity and ensure quality.

### Phase 0.1: Metadata Infrastructure Foundation (Sub-Agent A)

**Goal**: Build core metadata collection and context generation infrastructure

**Sub-Phases with Review Points**:

#### 0.1a: Core Metadata Collection (3-4 days)
- **Deliverables**:
  - `lib/types/metadata.ts` - Type definitions for study and document metadata
  - `lib/metadata-collector.ts` - Database queries for metadata extraction
  - Enhanced `lib/data.ts` with metadata functions
- **Success Criteria**: Can collect complete study metadata in single database query
- **Review Gate**: Validate metadata schema completeness and query performance

#### 0.1b: Basic Context Building (2-3 days) 
- **Deliverables**:
  - `lib/metadata-context.ts` - Core context builder with `buildContext()` function
  - `lib/metadata-formatter.ts` - LLM-optimized formatting utilities
- **Success Criteria**: Generate study context under 500 tokens consistently
- **Review Gate**: Test context quality and token efficiency with sample data

#### 0.1c: Basic Caching Infrastructure (2-3 days)
- **Deliverables**:
  - `lib/metadata-cache.ts` - Simple caching with TTL
  - Cache integration with metadata collector
  - Basic cache invalidation on document changes
- **Success Criteria**: Functional caching reduces database queries for repeated requests
- **Review Gate**: Verify cache works correctly with basic invalidation

### Phase 0.2: Smart Context Integration (Sub-Agent B)

**Goal**: Integrate metadata context with chat system for accurate citations

**Sub-Phases with Review Points**:

#### 0.2a: Basic Function Calling Infrastructure (2-3 days)
- **Deliverables**:
  - `lib/llm-tools/search-tools.ts` - Basic search function calling tools
    - `search_specific_documents()` - Search within specified documents
    - `search_all_documents()` - Search across all study documents
  - Enhanced `/app/api/chat/route.ts` with AI SDK function calling setup
  - Tool integration with existing vector search
- **Technical Approach**: Replace direct `findRelevantChunks()` calls with LLM function calling that routes to appropriate search tools (existing vector search function unchanged)
- **Success Criteria**: LLM successfully chooses appropriate search tool based on user queries
- **Review Gate**: Test function calling accuracy with document-specific vs. general queries

#### 0.2b: Metadata-Aware System Prompts (2-3 days)
- **Deliverables**:
  - System prompt integration with metadata context from Phase 0.1
  - Document list formatting for LLM tool selection
  - Tool routing logic based on document references in metadata
  - Citation filtering implementation using tool selections
- **Success Criteria**: 100% citation accuracy for document-specific queries via function calling
- **Review Gate**: End-to-end testing with real study data and various query types

#### 0.2c: Function Calling Reliability (1-2 days)
- **Deliverables**:
  - Error handling for tool execution failures
  - Fallback mechanisms (revert to current vector search if tools fail)
  - Basic token limit validation (fail gracefully if exceeded)
  - Essential logging for debugging tool issues
- **Success Criteria**: 100% fallback reliability when function calling fails, basic token management
- **Review Gate**: Test error scenarios and fallback behavior

### Phase 0.3: Integration & Validation (Both Agents)

**Goal**: Integrate both sub-systems and validate end-to-end functionality

**Activities**:
- Integration testing between metadata infrastructure and chat system
- User acceptance testing with real study scenarios
- Performance optimization and monitoring setup
- Documentation and handoff preparation

**Success Criteria**:
- 100% citation accuracy for document-specific queries via LLM function calling
- Functional metadata context generation (no specific performance targets)
- Zero regressions in existing chat functionality
- Robust error handling and fallback mechanisms
- Ready foundation for Phase 1 advanced features

**Final Review Gate**: Complete system validation before proceeding to Phase 1

## Phase 1: Core Hybrid Search Infrastructure (2-3 weeks)

### 1.1 Query Classification System

**Goal**: Automatically detect query types to route appropriately
- **Deliverable**: `lib/query-classifier.ts` with ML-based intent detection
- **Success Criteria**: 95% accuracy on metadata vs content query classification
- **User Story**: "When I ask 'how many documents', system knows to use database query not vector search"

### 1.2 Advanced LLM Function Tools

**Goal**: Expand beyond Phase 0 basic search tools to comprehensive database access
- **Deliverables**:
  - `lib/llm-tools/document-tools.ts` - Advanced document operations (listing, counting, metadata queries)
  - `lib/llm-tools/study-tools.ts` - Study information and management tools
  - `lib/llm-tools/analytics-tools.ts` - Usage analytics and insights tools
  - Enhanced tool orchestration and chaining capabilities
- **Success Criteria**: LLM can accurately count documents, list studies, get detailed file info, analyze usage patterns
- **User Story**: "Chat shows 'Searching documents...' and returns exact count with confidence and additional insights"

**Note**: Builds upon Phase 0 basic function calling infrastructure

### 1.3 Advanced Metadata Context Features

**Goal**: Enhance metadata context with advanced features beyond Phase 0 foundation
- **Deliverables**: 
  - Query-aware context filtering and optimization
  - Cross-study metadata aggregation
  - Metadata analytics and insights
- **Success Criteria**: Enhanced context relevance and cross-study capabilities
- **User Story**: "LLM provides rich contextual information that adapts to my specific research questions"

**Note**: Builds upon Phase 0 metadata infrastructure foundation

## Phase 2: Advanced Search Capabilities (3-4 weeks)

### 2.1 Cross-Study Global Search

**Goal**: Search and analyze across all user studies
- **Deliverables**:
  - `findDocumentsGlobally()` function with study context
  - `compareStudies()` LLM tool for cross-study analysis
  - Global search API endpoints
- **Success Criteria**: Users can find content across 100+ documents in <2 seconds
- **User Story**: "I can ask 'find all interview transcripts across my studies' and get comprehensive results"

### 2.2 Enhanced Vector + Metadata Hybrid Search

**Goal**: Combine semantic similarity with structured filtering
- **Deliverables**:
  - `searchWithMetadataFilters()` - filtered vector search
  - `getDocumentsByContentAndType()` - hybrid content/metadata queries
  - Query expansion and refinement logic
- **Success Criteria**: Hybrid queries return 40% more relevant results than pure vector search
- **User Story**: "Search for 'user pain points in PDF files from last month' works perfectly"

### 2.3 Intelligent Tool Selection

**Goal**: LLM automatically chooses optimal search strategy
- **Deliverable**: Tool orchestration logic that combines multiple search approaches
- **Success Criteria**: Complex queries resolved with minimal tool calls
- **User Story**: "Ask complex questions and LLM efficiently uses right combination of tools"

## Phase 3: User Experience Enhancements (2-3 weeks)

### 3.1 Tool Usage Transparency

**Goal**: Users see and understand LLM's search process
- **Deliverables**:
  - Tool execution progress indicators in chat UI
  - Expandable tool result sections
  - Search strategy explanations
- **Success Criteria**: 90% user satisfaction with search transparency
- **User Story**: "I can see exactly how the AI found my answer and verify the sources"

### 3.2 Global Search Interface

**Goal**: Dedicated cross-study search with advanced filtering
- **Deliverables**:
  - `components/GlobalSearch.tsx` with filter sidebar
  - Study/document type/date range filters
  - Search result clustering by study
- **Success Criteria**: Users discover 3x more relevant content with global search
- **User Story**: "Powerful search interface helps me explore all my research at once"

### 3.3 Enhanced Chat Context Display

**Goal**: Rich document context awareness in chat
- **Deliverables**:
  - Document context sidebar showing available files
  - Real-time document counts and study info
  - Quick document access from chat
- **Success Criteria**: 50% reduction in "what documents do I have?" questions
- **User Story**: "Always know exactly what documents are available in current study"

## Phase 4: Advanced Analysis Tools (3-4 weeks)

### 4.1 Research Analysis LLM Tools

**Goal**: Sophisticated content analysis capabilities
- **Deliverables**:
  - `extractThemes()` - thematic analysis across documents
  - `getQuotesAbout()` - targeted quote extraction
  - `analyzeDocumentTypes()` - content type analysis
  - `getDocumentTimeline()` - temporal document analysis
- **Success Criteria**: Generate insights that would take researchers hours to find manually
- **User Story**: "Ask 'what themes emerge across all user interviews' and get structured analysis"

### 4.2 Comparative Study Analysis

**Goal**: Multi-study research insights and comparisons
- **Deliverables**:
  - Cross-study theme comparison tools
  - Longitudinal analysis capabilities
  - Research pattern detection
- **Success Criteria**: Identify insights across studies that users miss in manual analysis
- **User Story**: "Compare findings across different research projects and time periods"

### 4.3 Performance Optimization & Caching

**Goal**: Handle large document sets efficiently
- **Deliverables**:
  - Intelligent caching for frequent queries
  - Query result pagination and streaming
  - Background pre-computation of common analyses
- **Success Criteria**: Sub-3 second response times even with 500+ documents
- **User Story**: "Fast, responsive search even with large research databases"

## Technical Requirements

### New Database Fields (Optional Enhancement)

```prisma
model Document {
  // Enhanced metadata for better search
  description    String?   // User-provided description
  tags          String[]  // Document categories
  wordCount     Int?      // For search ranking
  lastAccessed  DateTime? // Usage analytics
}
```

### API Endpoints

- `GET /api/search/global` - Cross-study search
- `POST /api/tools/execute` - Manual tool execution
- `GET /api/studies/compare` - Study comparison data

### Performance Targets

- Metadata queries: <200ms response time
- Content search: <2s for 100+ documents
- Global search: <3s across all user data
- Tool execution: <1s for simple tools, <5s for analysis tools

## Success Metrics

### User Experience

- **Phase 0**: 100% citation accuracy for document-specific queries
- 100% accuracy on document counting queries
- 95% user satisfaction with search relevance
- 3x increase in cross-study content discovery
- 50% reduction in search-related support queries

### Technical Performance

- **Phase 0**: Functional metadata context generation and reliable fallback mechanisms
- Sub-3 second response times for complex queries
- 99.9% uptime for search functionality
- <500ms p95 latency for metadata tools
- Support for 1000+ documents per user

### Business Impact

- Increased user engagement with research analysis features
- Higher user retention through improved search experience
- Enhanced product differentiation in research AI space
- Foundation for advanced analytics and insights features

## Risk Mitigation

- **Complexity Risk**: Phased rollout with feature flags
- **Performance Risk**: Comprehensive load testing and caching strategy
- **User Adoption Risk**: Progressive enhancement - existing functionality remains unchanged
- **Technical Risk**: Fallback to current vector search if hybrid search fails

## Conclusion

This enhancement transforms Skate AI from a document chat tool into an intelligent research analysis platform that amplifies researcher capabilities through sophisticated search and analysis tools.