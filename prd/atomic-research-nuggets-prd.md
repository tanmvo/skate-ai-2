# Atomic Research Nuggets System PRD

## Executive Summary

Enhance Skate AI's citation quality and knowledge persistence by implementing an internal atomic research nuggets system. This system operates transparently behind the scenes to extract structured insights (observation + evidence + tags) from research documents, creating better citations and enabling cross-study pattern detection without exposing complexity to users.

## Problem Statement

### Current System Limitations
1. **Citation Quality Issues** - LLM citations return random text snippets that don't directly support generated insights
2. **No Knowledge Accumulation** - Insights from previous studies aren't leveraged in new analyses
3. **Limited Cross-Study Intelligence** - System can't identify patterns across multiple research sessions

### User Pain Points
- Researchers struggle to trust citations that seem disconnected from conclusions
- Valuable insights from past studies are forgotten and must be rediscovered
- No way to build on previous research knowledge within the platform
- Citations feel arbitrary rather than purposeful

## Proposed Solution

### Internal Nugget System Architecture
Implement a transparent knowledge extraction system that:
- **Automatically extracts structured insights** during document processing and chat interactions
- **Stores reusable research primitives** that compound knowledge over time
- **Enhances citations invisibly** by referencing relevant nuggets instead of random chunks
- **Enables cross-study intelligence** without exposing internal complexity to users

### Core Nugget Structure
Each nugget contains three essential components:
- **Observation**: The insight or finding extracted from research
- **Evidence**: Direct supporting quote/data from source document
- **Tags**: Categorical metadata for intelligent retrieval and clustering

### Transparent User Experience
Users continue their natural research workflow while the system:
- Generates better, more relevant citations automatically
- Builds knowledge that improves future research sessions
- Identifies cross-study patterns organically
- Creates foundation for future artifact generation (reports, insights summaries)

## Success Metrics

### User Experience Goals
- 90% of citations directly support the insights they reference (up from ~30% currently)
- 40% reduction in repeated questions across different study sessions
- Users notice improved insight quality without understanding the underlying system

### Technical Performance
- Nugget extraction accuracy: >85% relevance to source content
- Nugget-enhanced search response time: <3 seconds (no degradation from current system)
- Cross-study pattern detection: Successfully identifies themes across 3+ studies
- Knowledge accumulation: 25% improvement in insight quality as nugget database grows

## User Stories

### Research Teams
- **As a researcher**, I want citations that actually support my insights so I can trust the AI's analysis
- **As a research team lead**, I want the AI to remember insights from previous studies so new research builds on past work
- **As a UX researcher**, I want the system to get smarter over time rather than starting from scratch each session

### Product Teams  
- **As a product manager**, I want the AI to identify patterns across multiple user research sessions automatically
- **As a designer**, I want citations that help me understand the source of insights without manual verification
- **As a team**, we want research insights to accumulate institutional knowledge rather than being lost in chat history

## Technical Architecture

### Comprehensive Text Codification Strategy
Following established thematic analysis methodology, nuggets replace raw chunks by systematically codifying every meaningful text segment:

**Complete Coverage Approach:**
- **Systematic codification**: Every text chunk gets analyzed and converted to a structured nugget
- **No information loss**: Rather than selective extraction, we're enhancing raw text with analytical structure
- **Comprehensive coverage**: All content types (user quotes, technical details, edge cases) get codified
- **Document scale**: 10-page document → 20-30 text segments → 20-30 nuggets (1:1 replacement)

**Codification Flow:**
```
Document → Text Segmentation → Comprehensive Codification
Segment 1: "Users mentioned navigation difficulty..." 
  → Nugget: {observation: "Navigation confusion", evidence: "I couldn't find the menu", tags: ["ux", "navigation"]}
Segment 2: "Onboarding feedback shows..." 
  → Nugget: {observation: "Onboarding friction", evidence: "Too many steps to get started", tags: ["onboarding", "process"]}
Segment 3: "Technical implementation requires..." 
  → Nugget: {observation: "Technical constraint", evidence: "API limitations prevent real-time sync", tags: ["technical", "constraints"]}
Segment 4: "Pricing concerns were raised..." 
  → Nugget: {observation: "Price sensitivity", evidence: "Too expensive for small teams", tags: ["pricing", "barriers"]}
```

**Key Advantage - Complete Coverage:**
- **User research insights**: Codified with observation + evidence structure
- **Technical details**: Preserved with technical context and categorization  
- **Edge cases**: Captured and tagged for future discoverability
- **Sequential narrative**: Maintained through ordered nuggets with full context
- **Exact user language**: Preserved in evidence fields for marketing copy needs

**Storage Architecture - Nuggets Replace Chunks:**
- **Current system**: 20-30 raw text chunks per document
- **New system**: 20-30 structured nuggets per document (1:1 replacement)
- **Storage impact**: 20-25% **reduction** in total storage while gaining analytical structure

### Nugget Data Structure
```typescript
interface ResearchNugget {
  id: string;
  observation: string;      // The insight/finding extracted from segment
  evidence: string;         // Direct quote/data from original text segment
  tags: string[];          // Searchable categories (auto-generated)
  confidence: number;      // AI confidence score for codification quality
  segmentIndex: number;    // Sequential position in document (maintains narrative flow)
  documentId: string;      // Source document
  studyId: string;         // Source study
  extractedAt: DateTime;   // When nugget was created
  extractedBy: 'ai' | 'user'; // Extraction method
}
```

### Intelligent Retrieval Implementation
**Nuggets-Only Search Architecture:**
- **Single search pathway**: All queries search against structured nuggets only
- **Comprehensive coverage**: Since every text segment is codified, no information gaps exist
- **Multi-purpose serving**: Same nugget collection serves research insights, exact quotes, technical details, and edge cases
- **Enhanced intelligence**: Structured data enables better semantic matching and cross-study pattern detection

**Embedding Strategy:**
- **Nuggets embedded**: Using `observation + evidence` combined text via Voyage AI
- **No raw chunk embeddings**: Eliminates dual embedding storage and complexity
- **Optimized search**: Single vector space with enhanced semantic understanding through structured content

### Database Schema Changes
```sql
-- Research nuggets table (replaces document_chunks)
CREATE TABLE research_nuggets (
  id TEXT PRIMARY KEY,
  observation TEXT NOT NULL,
  evidence TEXT NOT NULL,
  tags TEXT[], 
  confidence DECIMAL(3,2),
  segment_index INTEGER NOT NULL, -- Sequential position for narrative flow
  document_id TEXT REFERENCES documents(id),
  study_id TEXT REFERENCES studies(id),
  embedding BYTEA, -- Serialized vector embedding
  extracted_at TIMESTAMP DEFAULT NOW(),
  extracted_by TEXT DEFAULT 'ai'
);

-- Note: document_chunks table will be deprecated and removed
-- All text retrieval will use research_nuggets exclusively
```

## User Experience Design

### Transparent Nugget Operation
1. **Automatic Codification** - System codifies all text segments during document processing
2. **Background Processing** - Nugget creation happens invisibly without user intervention  
3. **No UI Changes Required** - Existing chat interface remains unchanged
4. **Complete Coverage** - All user needs served through single nugget-based system

### Enhanced User Experience Across All Use Cases
**Research Analysis**: Strategic insights with supporting evidence from observation + evidence structure
**Exact Quote Finding**: Direct access to user language through evidence fields with proper context
**Technical Details**: Technical information preserved and categorized for easy retrieval
**Cross-Study Patterns**: AI can identify themes across codified knowledge base
**Marketing Copy**: Authentic user language available through evidence fields with full context

### Enhanced Citation Experience
**Current**: `[Citation 1]` → Random text snippet often unrelated to insight
**Enhanced**: `[Citation 1]` → Contextually relevant nugget evidence that directly supports the insight and maintains source context

### Invisible Intelligence
- Users experience superior responses across all research use cases without learning new concepts
- Citations become more trustworthy and relevant automatically
- System builds structured knowledge that compounds and improves over time
- All team member needs (research, product, design, marketing) served through single intelligent system

## Implementation Roadmap

**Total Timeline:** 5 weeks (Phase 3.4 in main roadmap: Weeks 46-50)
**Investment:** $60K-80K
**Dependencies:** Authentication system, trust-building foundation, existing embeddings pipeline

### Week 46: Core Infrastructure
- [ ] Prisma schema migration for ResearchNugget table
- [ ] Basic nugget CRUD operations and repository pattern
- [ ] Nugget embedding generation pipeline (Voyage AI integration)
- [ ] Database migration scripts and testing

### Week 47: AI Extraction Pipeline  
- [ ] LLM prompt engineering for observation + evidence + tags extraction
- [ ] Confidence scoring and quality thresholds
- [ ] Real-time nugget extraction during chat interactions
- [ ] Batch processing pipeline for existing document collections

### Week 48: Nuggets-Only Search Implementation
- [ ] Single-pathway search implementation using nuggets exclusively
- [ ] Deprecation of raw chunk search and embedding systems
- [ ] Updated AI SDK tools to leverage structured nugget search
- [ ] Search performance optimization and caching for nugget-only architecture

### Week 49: Citation Enhancement
- [ ] Citation system upgrade to reference nuggets
- [ ] Cross-study pattern detection and clustering
- [ ] Enhanced context delivery for LLM responses
- [ ] A/B testing framework for citation quality measurement

### Week 50: Testing & Optimization
- [ ] Comprehensive testing across existing studies
- [ ] Performance monitoring and optimization
- [ ] Quality validation with real user data
- [ ] Documentation and knowledge transfer for future artifact generation features

## Dependencies & Risks

### Technical Dependencies
- Authentication system (Week 26-28) - Required for user-scoped nuggets
- Trust-building foundation (Week 18-25) - Nuggets enhance explainability work
- Current Voyage AI embedding pipeline - Must remain stable for parallel operation
- AI SDK v5 tool system - Needs updates for nugget-enhanced search tools

### Potential Risks
1. **Nugget Quality** - AI codification accuracy may vary across document types and domains
2. **Migration Complexity** - Transitioning from raw chunks to nuggets requires careful data migration
3. **Performance Impact** - Comprehensive codification may increase initial document processing time
4. **User Expectations** - Improved citations may raise expectations for all AI responses
5. **Codification Coverage** - Risk of missing nuanced context during systematic text codification

### Mitigation Strategies
- Confidence scoring with minimum thresholds (>0.8) for nugget quality assurance
- Comprehensive codification testing across diverse document types before full rollout
- Performance monitoring with optimization targets for document processing times
- Transparent system operation ensures no user education required
- Careful migration strategy with backup systems during transition period

## Success Criteria

### Week 46-47 Success (Infrastructure & Extraction)
- Nugget creation and storage pipeline operational with >95% success rate
- AI extraction achieves >80% relevance scoring on test documents
- Embedding generation completes within 5 seconds per nugget
- Zero performance degradation to existing document processing

### Week 48-49 Success (Search & Citations)
- Parallel search returns results within 3-second target (no degradation)
- Citation quality improvement measurable via A/B testing
- Cross-study pattern detection identifies themes across 3+ related studies
- System successfully processes existing document library without errors

### Week 50 Success (Overall System)
- 90% improvement in citation relevance compared to current baseline
- 40% reduction in repeated insights across study sessions
- User satisfaction with responses maintained or improved (measured via existing analytics)
- Foundation established for future artifact generation features (reports, summaries)
- Knowledge base demonstrates compound learning effects over time

## Future Considerations

### Artifact Generation Capabilities (Phase 4+)
The nugget system creates the foundation for powerful artifact generation:
- **Insight Reports** - AI-generated summaries using nuggets across multiple studies
- **Research Briefs** - Structured documents combining observations and evidence
- **Pattern Analysis** - Cross-study theme identification and trend reports
- **Executive Summaries** - High-level findings with supporting evidence citations

### Enterprise Enhancement Opportunities (Phase 5)
- **Team Collaboration** - Shared nugget repositories for research teams
- **Quality Validation** - Human-in-the-loop nugget approval workflows
- **Custom Taxonomies** - Organization-specific tagging and categorization systems
- **Export Integration** - Direct nugget export to external research tools (Dovetail, Aurelius)

### Scalability Planning
- **Incremental Processing** - Real-time nugget extraction during document uploads
- **Compression Optimization** - Vector embedding optimization for large nugget repositories
- **Caching Strategy** - Intelligent caching for frequently accessed nugget patterns
- **Cross-User Learning** - Anonymous pattern sharing to improve extraction quality (with privacy controls)

---

## Implementation Decision Points

### Nugget Extraction Strategy
**Decision**: Process all existing documents during initial migration to create immediate value
**Rationale**: Users should see improved citations across their entire document library, not just new uploads

### Tag Generation Approach  
**Decision**: AI-generated free-form tags with automatic clustering
**Rationale**: Avoids complex taxonomy management while enabling emergent categorization patterns

### Cross-Study Access Pattern
**Decision**: User-scoped nuggets searchable across all studies within account
**Rationale**: Maximizes value of accumulated knowledge while maintaining privacy boundaries

### Quality Control Mechanism
**Decision**: Confidence-based filtering with transparent fallback to raw chunks
**Rationale**: Maintains system reliability while improving citation quality incrementally

---

## Pre-Implementation Validation Strategy

### LLM Output Quality Evaluation Framework
Before committing to full implementation, validate nugget effectiveness through controlled testing:

**Phase 0: Proof of Concept (1 week)**
- [ ] Extract nuggets from 5-10 existing documents using current LLM
- [ ] Compare LLM responses using nuggets vs. raw chunks
- [ ] Measure citation relevance, insight quality, and response coherence
- [ ] Evaluate storage cost vs. output quality tradeoff

**Evaluation Metrics:**
1. **Citation Relevance**: Do nugget-based citations directly support insights? (Target: >85%)
2. **Response Quality**: Blind comparison of nugget vs. chunk-based responses (Target: >70% preference)
3. **Cross-Study Intelligence**: Can LLM identify patterns across nugget collections? (Qualitative assessment)
4. **Processing Efficiency**: Time and cost to extract nuggets vs. benefit gained

**Success Criteria for Proceeding:**
- Citation relevance improves by >50% compared to current system
- User preference for nugget-enhanced responses >70% in blind tests
- Storage cost increase justified by measurable output quality improvements
- Cross-study pattern detection demonstrates clear value

**Evaluation Tools:**
- Side-by-side response comparisons with existing documents
- Citation accuracy scoring (manual review)
- Synthetic user questions testing cross-study intelligence
- Cost-benefit analysis including storage and processing overhead

**Decision Point:**
If evaluation shows insufficient improvement to justify system replacement:
- Refine codification prompts and techniques
- Test alternative LLM models for better extraction quality
- Consider hybrid transition period with both systems running
- Evaluate if comprehensive codification provides sufficient value over current system

**Expected Outcome:**
Validation should demonstrate significant improvement in citation quality and user experience while achieving 20-25% storage cost reduction, making this a clear positive ROI decision.