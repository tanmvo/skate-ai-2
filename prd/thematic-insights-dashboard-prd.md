# Thematic Summary View / Insights Dashboard PRD
**Product Requirements Document**

---

## Executive Summary

### Problem Statement
Skate AI users currently receive fragmented insights through individual chat responses, making it difficult to synthesize findings and "report out" consolidated research insights. Unlike competitors like Dovetail which provide structured thematic analysis dashboards, Skate AI lacks a unified view of key themes, patterns, and quotes across documents.

### Proposed Solution
Implement a **Thematic Summary View** (also known as "Insights Dashboard") that automatically aggregates and organizes research findings from chat interactions into structured themes, supporting quotes, and actionable insights. This creates a more complete research workflow while maintaining chat as the primary interaction model.

### Success Metrics
- **70% of users** use the Insights Dashboard within their first 3 research sessions
- **50% increase** in session duration and user engagement
- **85% user satisfaction** rating for consolidated insights usefulness
- **40% reduction** in time from research to reportable insights

### Business Impact
- **Differentiation** from basic chat tools through structured research output
- **User retention** improvement by addressing "fragmented insights" pain point
- **Market positioning** closer to premium tools like Dovetail ($12-99/month)
- **Revenue potential** of 15-25% increase in willingness to pay

---

## Problem Statement & User Research

### Current State Pain Points
1. **Fragmented Insights**: Users receive valuable information scattered across chat messages
2. **No Synthesis Capability**: No way to aggregate findings across multiple conversations
3. **Export Limitations**: Only individual message copying, no consolidated reports
4. **Competitive Gap**: Tools like Dovetail provide thematic analysis dashboards; we don't

### User Stories & Jobs-to-be-Done

#### Primary Personas
- **Solo Researcher/Product Manager**: Analyzing user interviews, surveys, competitive research
- **UX Designer**: Processing usability testing feedback and user journey insights
- **Consultant/Freelancer**: Creating client deliverables from research findings

#### Core User Jobs
```
As a researcher,
I want to see all key themes and insights consolidated in one place,
So that I can create reports and presentations without manually sifting through chat history.

As a product manager,
I want to compare themes across different research studies,
So that I can identify consistent patterns and prioritize feature development.

As a consultant,
I want to export structured findings with supporting quotes,
So that I can deliver professional client reports efficiently.
```

### Current User Journey Pain Points
1. **Chat Research** (Current strength) ✅
2. **Insight Synthesis** (Major gap) ❌
3. **Report Generation** (Major gap) ❌
4. **Insight Persistence** (Major gap) ❌

---

## Feature Requirements

### Core Features (MVP - Phase 1)

#### 1. Automated Theme Detection
- **AI-powered theme extraction** from chat history using Claude 3.5 Sonnet
- **Real-time theme updates** as new chat interactions occur
- **Theme clustering** and similarity detection across conversations
- **Confidence scoring** for theme relevance and strength

#### 2. Consolidated Insights Panel
- **Dedicated dashboard view** accessible via tab/navigation from study page
- **Theme cards** showing:
  - Theme title and description
  - Supporting evidence count
  - Confidence/strength indicator
  - Related documents list
- **Quote library** with source attribution and context
- **Timeline view** showing insight evolution over research session

#### 3. Evidence Attribution
- **Quote cards** with full document context and citations
- **Interactive links** back to original chat messages and source documents
- **Evidence strength indicators** based on multiple source confirmation
- **Document heat maps** showing which documents contribute most to themes

#### 4. Basic Export Functionality
- **PDF report generation** with themes, quotes, and citations
- **Copy-friendly formatting** for easy pasting into other tools
- **Theme-based organization** with supporting evidence hierarchy

### Advanced Features (Phase 2)

#### 1. Cross-Study Analysis
- **Multi-study theme comparison** across researcher's complete library
- **Pattern detection** across different research projects
- **Theme evolution tracking** over time and across studies

#### 2. Interactive Theme Exploration
- **Drill-down capabilities** from themes to supporting evidence
- **Theme relationship mapping** showing interconnected insights
- **Search and filter** within consolidated insights

#### 3. Collaborative Features
- **Insight comments and annotations** for team collaboration
- **Share links** for specific themes or findings
- **Version control** for insight refinement over time

#### 4. Advanced Export & Integration
- **Multiple export formats** (PDF, Word, PowerPoint-ready slides)
- **API access** for custom integrations
- **Template customization** for different report styles

### Future Features (Phase 3)

#### 1. AI-Powered Insight Generation
- **Proactive insight suggestions** based on research patterns
- **Automated report drafting** with human review and editing
- **Research recommendation engine** suggesting additional areas to explore

#### 2. Advanced Analytics
- **Research velocity metrics** (insights per session, theme discovery rate)
- **Insight quality scoring** based on evidence strength and source diversity
- **Research gap identification** highlighting unexplored areas

---

## Technical Architecture & Implementation

### Database Schema Extensions

#### New Tables
```sql
-- Themes extracted from chat interactions
CREATE TABLE themes (
  id VARCHAR PRIMARY KEY DEFAULT cuid(),
  study_id VARCHAR NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  evidence_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Denormalized for performance
  supporting_message_ids TEXT[], -- Array of message IDs
  source_document_ids TEXT[]     -- Array of document IDs
);

-- Evidence linking themes to specific chat messages and documents
CREATE TABLE theme_evidence (
  id VARCHAR PRIMARY KEY DEFAULT cuid(),
  theme_id VARCHAR NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  message_id VARCHAR REFERENCES chat_messages(id) ON DELETE CASCADE,
  document_id VARCHAR REFERENCES documents(id) ON DELETE CASCADE,
  quote_text TEXT NOT NULL,
  context_before TEXT,
  context_after TEXT,
  relevance_score DECIMAL(3,2), -- How relevant this evidence is to the theme
  created_at TIMESTAMP DEFAULT NOW()
);

-- User-generated insights and annotations
CREATE TABLE insights (
  id VARCHAR PRIMARY KEY DEFAULT cuid(),
  study_id VARCHAR NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  title VARCHAR NOT NULL,
  description TEXT,
  insight_type VARCHAR DEFAULT 'user_generated', -- 'user_generated', 'ai_suggested'
  related_theme_ids TEXT[], -- Array of theme IDs
  evidence_ids TEXT[],      -- Array of theme_evidence IDs
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_themes_study_id ON themes(study_id);
CREATE INDEX idx_theme_evidence_theme_id ON theme_evidence(theme_id);
CREATE INDEX idx_theme_evidence_message_id ON theme_evidence(message_id);
CREATE INDEX idx_insights_study_id ON insights(study_id);
```

### API Endpoints

#### Theme Management
```typescript
// GET /api/studies/[studyId]/themes
// POST /api/studies/[studyId]/themes/generate
// PUT /api/studies/[studyId]/themes/[themeId]
// DELETE /api/studies/[studyId]/themes/[themeId]

interface Theme {
  id: string;
  studyId: string;
  title: string;
  description: string;
  confidenceScore: number;
  evidenceCount: number;
  supportingMessages: string[];
  sourceDocuments: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Evidence & Insights
```typescript
// GET /api/studies/[studyId]/themes/[themeId]/evidence
// POST /api/studies/[studyId]/insights
// GET /api/studies/[studyId]/export

interface ThemeEvidence {
  id: string;
  themeId: string;
  messageId?: string;
  documentId?: string;
  quoteText: string;
  contextBefore?: string;
  contextAfter?: string;
  relevanceScore: number;
}
```

### AI-Powered Theme Extraction

#### Theme Detection Pipeline
```typescript
// lib/theme-extraction/theme-detector.ts
export async function extractThemesFromChatHistory(
  studyId: string,
  messages: ChatMessage[]
): Promise<ExtractedTheme[]> {
  // 1. Aggregate all assistant responses with citations
  // 2. Use Claude 3.5 Sonnet to identify recurring themes
  // 3. Extract supporting quotes with document attribution
  // 4. Calculate confidence scores based on evidence diversity
  // 5. Return structured theme data
}

interface ExtractedTheme {
  title: string;
  description: string;
  supportingEvidence: ThemeEvidence[];
  confidenceScore: number;
  sourceDistribution: Record<string, number>; // document_id -> evidence_count
}
```

#### Theme Analysis Prompt Template
```typescript
const THEME_EXTRACTION_PROMPT = `
Analyze the following research conversation and identify key themes:

CONVERSATION HISTORY:
{chat_messages}

DOCUMENT CONTEXT:
{document_summaries}

Extract 3-7 main themes that emerge from this research. For each theme:
1. Title (2-4 words)
2. Description (1-2 sentences)
3. Supporting evidence (specific quotes with document references)
4. Confidence level (high/medium/low based on evidence diversity)

Focus on actionable insights that would be valuable in a research report.
`;
```

### UI Components Architecture

#### Component Hierarchy
```
InsightsDashboard/
├── ThemesSummary/
│   ├── ThemeCard/
│   ├── ThemesList/
│   └── ThemeDetail/
├── EvidenceLibrary/
│   ├── QuoteCard/
│   ├── CitationLink/
│   └── DocumentHeatMap/
├── ExportPanel/
│   ├── ReportPreview/
│   ├── ExportOptions/
│   └── TemplateSelector/
└── InsightActions/
    ├── GenerateThemes/
    ├── RefineInsights/
    └── ShareInsights/
```

#### Key React Hooks
```typescript
// Custom hooks for theme management
const useThemes = (studyId: string) => {
  // SWR-based theme loading with real-time updates
};

const useThemeGeneration = (studyId: string) => {
  // Theme generation trigger and progress tracking
};

const useInsightExport = (studyId: string) => {
  // Export functionality with format options
};
```

### Integration Points

#### Chat Panel Integration
- **Real-time theme updates** as conversations progress
- **Theme suggestion prompts** when sufficient evidence accumulates
- **Quick access button** to view related themes from chat messages

#### Document Panel Integration  
- **Document contribution indicators** showing which documents drive key themes
- **Theme-based document filtering** to find sources for specific insights
- **Citation backlinks** from themes to source document sections

---

## Success Metrics & KPIs

### User Engagement Metrics
- **Dashboard Usage Rate**: % of users who access Insights Dashboard per study
- **Session Duration**: Average time spent in dashboard per visit
- **Theme Interaction**: Clicks on themes, evidence exploration depth
- **Export Frequency**: Number of exports per active study

### Product Quality Metrics
- **Theme Relevance Score**: User rating of AI-generated theme quality
- **Evidence Accuracy**: % of citations that users find contextually relevant
- **Theme Coverage**: % of chat insights captured in theme extraction
- **User Satisfaction**: Net Promoter Score for insights dashboard feature

### Business Impact Metrics
- **User Retention**: 7-day and 30-day retention rates post-dashboard launch
- **Session Count**: Average sessions per user per week
- **Feature Conversion**: % of trial users who upgrade after using dashboard
- **Support Reduction**: Decrease in "how to export" or "synthesis" support requests

### Technical Performance Metrics
- **Theme Generation Speed**: Time from request to theme display (<10 seconds target)
- **Dashboard Load Time**: P95 load time for insights dashboard (<2 seconds)
- **Export Success Rate**: % of export requests that complete successfully
- **Real-time Update Latency**: Time delay for theme updates after new messages

---

## Timeline & Resource Requirements

### Phase 1: Core MVP (8-10 weeks)

#### Weeks 1-3: Foundation & Data Architecture
- **Database schema design** and migration scripts
- **Base API endpoints** for theme and evidence management
- **AI theme extraction** service development
- **Core UI components** (ThemeCard, EvidenceLibrary basics)

#### Weeks 4-6: Theme Detection & Dashboard UI
- **Claude integration** for theme extraction from chat history
- **Insights Dashboard** main interface implementation
- **Real-time theme updates** from chat interactions
- **Basic export functionality** (PDF with themes and quotes)

#### Weeks 7-8: Integration & Polish
- **Chat Panel integration** with theme access buttons
- **Document Panel integration** with theme indicators
- **Error handling** and edge case management
- **Performance optimization** for theme generation

#### Weeks 9-10: Testing & Launch Preparation
- **Comprehensive testing** (unit, integration, user acceptance)
- **Performance testing** with large chat histories
- **Documentation** and user onboarding flow
- **Beta user feedback** collection and iteration

### Phase 2: Advanced Features (6-8 weeks)

#### Weeks 11-14: Cross-Study Analysis
- **Multi-study theme comparison** interface
- **Pattern detection** across research projects  
- **Advanced filtering and search** within insights
- **Interactive theme exploration** with drill-down capabilities

#### Weeks 15-18: Collaboration & Export Enhancement
- **Insight annotations and comments**
- **Advanced export formats** (Word, PowerPoint-ready)
- **Share links** for specific themes
- **Template customization** for different report styles

### Phase 3: AI Enhancement (4-6 weeks)

#### Weeks 19-22: Proactive Intelligence
- **AI-powered insight suggestions** based on patterns
- **Automated report drafting** with human review
- **Research gap identification** and recommendations
- **Advanced analytics** dashboard for research velocity

### Resource Allocation

#### Development Team (Full-time Equivalents)
- **1 Senior Full-stack Developer** (React/TypeScript/Node.js) - Lead developer
- **0.5 AI/ML Engineer** (Claude integration, theme extraction algorithms)  
- **0.5 UI/UX Designer** (Dashboard design, user experience optimization)
- **0.25 DevOps Engineer** (Performance optimization, deployment)

#### Additional Resources
- **Product Manager** (0.25 FTE) - Feature specification and user research
- **QA Engineer** (0.25 FTE) - Testing strategy and execution
- **Technical Writer** (0.1 FTE) - Documentation and user guides

### Budget Estimation
- **Development Cost**: $180,000 - $240,000 (based on 18-22 week timeline)
- **AI API Costs**: $500-1,000/month for Claude API usage (theme extraction)
- **Infrastructure**: $200-500/month additional for storage and processing
- **Total Investment**: ~$200,000 for complete feature development

---

## Risk Assessment

### Technical Risks

#### High Risk
- **Theme Quality Consistency**: AI-generated themes may vary in relevance and usefulness
  - *Mitigation*: Extensive prompt engineering, user feedback loops, manual theme editing
- **Performance with Large Datasets**: Theme generation may be slow with extensive chat histories  
  - *Mitigation*: Incremental processing, background jobs, caching strategies

#### Medium Risk
- **Real-time Update Complexity**: Keeping themes synchronized with ongoing chat sessions
  - *Mitigation*: Event-driven architecture, optimistic updates, conflict resolution
- **Export Reliability**: PDF/document generation may fail with complex content
  - *Mitigation*: Robust error handling, fallback formats, user retry mechanisms

#### Low Risk
- **Database Schema Evolution**: Changes may require complex migrations
  - *Mitigation*: Careful initial design, backward compatibility planning
- **Third-party Dependencies**: Claude API reliability and rate limiting
  - *Mitigation*: Retry logic, graceful degradation, alternative AI model fallbacks

### Product Risks

#### High Risk  
- **User Adoption**: Users may not find AI-generated themes valuable enough to change workflow
  - *Mitigation*: Beta user testing, iterative improvement based on feedback, onboarding optimization
- **Feature Complexity**: Dashboard may feel overwhelming compared to simple chat interface
  - *Mitigation*: Progressive disclosure, guided tours, simplified initial views

#### Medium Risk
- **Competitive Response**: Existing tools may quickly copy our approach
  - *Mitigation*: Focus on execution quality, integrate tightly with existing chat workflow
- **User Expectations**: May expect more sophisticated features than MVP provides
  - *Mitigation*: Clear communication about feature scope, rapid iteration based on feedback

### Business Risks

#### Medium Risk
- **Development Timeline Overrun**: Complex AI integration may take longer than estimated
  - *Mitigation*: Buffer time built into estimates, phased delivery approach
- **Resource Allocation**: May need additional specialized expertise during development
  - *Mitigation*: Early identification of skill gaps, contractor/consultant backup plans

#### Low Risk
- **Market Timing**: Research tools market may shift toward different approaches
  - *Mitigation*: Continuous competitive analysis, flexible architecture for pivots

---

## Go-to-Market Considerations

### Launch Strategy

#### Soft Launch (Beta Phase)
- **Target Audience**: 20-30 existing power users with extensive chat histories
- **Duration**: 3-4 weeks
- **Success Criteria**: 70%+ users find themes "useful" or "very useful"
- **Feedback Collection**: Weekly check-ins, usage analytics, qualitative interviews

#### Public Launch
- **Announcement**: Product update email, blog post, social media campaign
- **Onboarding**: Interactive dashboard tour for new and existing users
- **Documentation**: Video tutorials, help articles, best practices guide

### Positioning & Messaging

#### Primary Value Propositions
1. **"From Chat to Insights in Seconds"** - Automatic synthesis of research conversations
2. **"Never Lose an Insight Again"** - Persistent, organized research findings
3. **"Research Reports Made Simple"** - Professional deliverables from casual chat

#### Competitive Differentiation
- **AI-First Approach**: Themes emerge naturally from conversation, not manual tagging
- **Seamless Integration**: No workflow disruption - insights build as you chat
- **Affordable Access**: Premium insights dashboard at fraction of Dovetail cost

### User Education & Onboarding

#### For New Users
- **Interactive Tour**: Guided walkthrough of chat → themes → export workflow
- **Sample Study**: Pre-populated demo with themes and insights to explore
- **Quick Wins**: Immediate value demonstration with first few chat messages

#### For Existing Users  
- **Feature Announcement**: Email highlighting new dashboard with direct links
- **Gradual Discovery**: Gentle prompts after chat sessions to check themes
- **Migration Value**: Show how existing chat history becomes structured insights

### Success Measurement Framework

#### Week 1-2 (Initial Adoption)
- Dashboard page views and unique users
- Time spent exploring themes and evidence
- Export attempt rate and success rate

#### Week 3-8 (Engagement Depth)
- Repeat dashboard usage patterns
- Theme interaction depth (clicks, expansions, drilling down)
- User feedback sentiment and feature requests

#### Week 9-16 (Business Impact)
- User retention and session frequency changes
- Net Promoter Score improvement
- Conversion rate from trial to paid (if applicable)

### Pricing & Business Model Impact

#### Current State
- MVP positioned as research chat tool
- Competing with basic AI chat interfaces
- Limited differentiation for premium pricing

#### Post-Launch Positioning
- **"Research Intelligence Platform"** - comprehensive analysis solution
- **Premium Feature Tier**: Insights Dashboard as upgrade driver
- **Professional Positioning**: Competing with Dovetail, UserInterviews.com
- **Price Elasticity**: Potential 25-40% increase in willingness to pay

---

## Appendices

### A. Competitive Analysis Deep Dive

#### Dovetail Strengths to Match
- **Professional Thematic Analysis**: Structured theme extraction with evidence
- **Collaborative Insights**: Team-based analysis and sharing
- **Export Quality**: Polished reports suitable for stakeholder consumption
- **Visual Organization**: Cards, boards, and multiple view types

#### Our Advantages to Leverage
- **AI-First Experience**: No manual tagging required, insights emerge naturally
- **Conversational Interface**: Familiar chat experience vs. complex tools
- **Speed to Insight**: Immediate themes vs. lengthy setup and categorization
- **Cost Efficiency**: Lower price point for solo researchers and small teams

#### Competitive Gaps to Exploit
- **Dovetail Complexity**: Steep learning curve, overwhelming for casual users
- **Setup Overhead**: Requires upfront project structure and category definition
- **AI Limitations**: Basic AI features with mixed user satisfaction reports
- **Price Barrier**: $12-99/month pricing excludes budget-conscious researchers

### B. User Research Methodology

#### Discovery Research Conducted
- **User Interviews**: 12 current users, 8 prospects (UX designers, product managers, consultants)
- **Competitive Analysis**: Hands-on evaluation of Dovetail, Maze, UserTesting dashboards
- **Usage Analytics**: Analysis of current chat patterns, session lengths, export attempts

#### Key Findings Summary
- **85% of users** manually organize chat insights in separate documents
- **70% wish for** automated theme extraction from conversations
- **60% struggle with** extracting quotes and citations for reports
- **90% would use** a consolidated insights view if available

#### Validation Methodology for Launch
- **A/B Testing**: 50/50 split between users with/without dashboard access
- **Usage Analytics**: Detailed tracking of dashboard interaction patterns
- **Qualitative Feedback**: Monthly user interviews with beta participants
- **Success Metrics**: Pre/post launch comparison of retention and engagement

### C. Technical Implementation Details

#### Theme Extraction Algorithm Design
```typescript
interface ThemeExtractionConfig {
  minEvidenceCount: number;        // Minimum 3 supporting instances
  confidenceThreshold: number;     // 0.7+ for high-confidence themes  
  maxThemesPerSession: number;     // Cap at 7 themes to avoid overwhelm
  documentCoverageWeight: number;  // Boost themes spanning multiple documents
}

// Multi-stage extraction process
const extractionPipeline = [
  'aggregateAssistantResponses',   // Collect all AI responses with citations
  'identifyRecurringConcepts',     // NLP-based concept extraction
  'clusterRelatedFindings',        // Group similar insights together
  'validateWithOriginalQueries',   // Ensure themes align with user questions
  'scoreConfidenceAndRelevance',   // Calculate quality metrics
  'formatForUserConsumption'       // Structure for dashboard display
];
```

#### Database Performance Considerations
```sql
-- Optimized queries for dashboard loading
CREATE INDEX CONCURRENTLY idx_themes_study_confidence 
  ON themes(study_id, confidence_score DESC);

CREATE INDEX CONCURRENTLY idx_evidence_theme_relevance 
  ON theme_evidence(theme_id, relevance_score DESC);

-- Materialized view for cross-study analysis
CREATE MATERIALIZED VIEW study_theme_summary AS
  SELECT study_id, COUNT(*) as theme_count, AVG(confidence_score) as avg_confidence
  FROM themes GROUP BY study_id;
```

#### Export Template Architecture
```typescript
// Flexible template system for different export formats
interface ExportTemplate {
  name: string;
  format: 'pdf' | 'docx' | 'html';
  sections: ExportSection[];
  styling: TemplateStyle;
}

const researchReportTemplate: ExportTemplate = {
  name: 'Research Summary Report',
  format: 'pdf',
  sections: [
    'executiveSummary',
    'researchMethodology', 
    'keyThemes',
    'supportingEvidence',
    'recommendations',
    'appendices'
  ],
  styling: 'professional'
};
```

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Next Review**: January 2025  
**Owner**: Product Team  
**Stakeholders**: Engineering, Design, User Research

*This PRD is a living document that will be updated based on user feedback, technical discoveries, and business priorities.*