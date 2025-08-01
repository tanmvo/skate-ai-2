# PRD: Hybrid Search & LLM Tools Enhancement

## Product Overview

Transform Skate AI's research platform with intelligent hybrid search that combines semantic understanding with structured metadata queries, exposed through LLM function calling tools.

## Problem Statement

- **Current Issue**: LLM gets confused about document counts and study structure due to vector-only context
- **User Impact**: Inconsistent responses to basic questions like "how many documents do I have?"
- **Technical Debt**: Pure vector search can't handle metadata queries effectively

## Solution

Implement hybrid search architecture with LLM tools that provide real-time database access for metadata queries while maintaining semantic search for content analysis.

## Phase 1: Core Hybrid Search Infrastructure (2-3 weeks)

### 1.1 Query Classification System

**Goal**: Automatically detect query types to route appropriately
- **Deliverable**: `lib/query-classifier.ts` with ML-based intent detection
- **Success Criteria**: 95% accuracy on metadata vs content query classification
- **User Story**: "When I ask 'how many documents', system knows to use database query not vector search"

### 1.2 LLM Function Tools Foundation

**Goal**: Enable real-time database access through LLM function calling
- **Deliverables**:
  - `lib/llm-tools/document-tools.ts` - Document listing, counting
  - `lib/llm-tools/study-tools.ts` - Study information and management
  - Enhanced `/app/api/chat/route.ts` with AI SDK function calling
- **Success Criteria**: LLM can accurately count documents, list studies, get file info
- **User Story**: "Chat shows 'Searching documents...' and returns exact count with confidence"

### 1.3 Metadata Context Builder

**Goal**: Generate rich, structured context from database queries
- **Deliverable**: `lib/metadata-context.ts` with caching layer
- **Success Criteria**: Sub-200ms response times for metadata queries
- **User Story**: "LLM has accurate, real-time study and document information"

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

- 100% accuracy on document counting queries
- 95% user satisfaction with search relevance
- 3x increase in cross-study content discovery
- 50% reduction in search-related support queries

### Technical Performance

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