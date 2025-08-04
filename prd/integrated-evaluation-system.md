# PRD: Integrated Manual Evaluation System for Skate AI

## Problem
Current AI response quality in Skate AI does not meet launch standards. Initial high-level observations suggest:
- **Generic themes** - Broad categories without specific definition
- **Unsupported insights** - Claims potentially not grounded in document evidence
- **Vague details** - Missing nuanced information for actionability
- **Missed context** - Important user details that could enhance insights

**However, we need systematic evaluation to identify specific, measurable quality patterns before making targeted improvements.** We need baseline data on actual quality issues, their frequency, and impact on user research workflows.

## Solution: Simple Built-In LLM Evaluator

### Philosophy
Following the **Prompting System for Agentic Research Analysis** approach:
- **Benchmark first** - Measure current quality before targeted improvements
- Start simple and iterate - basic manual evaluation only
- Let data drive improvement priorities
- "Would a user researcher find this response useful?"

### What We're Building (4 weeks)

#### Week 1: Admin Route + Benchmark Setup
**Protected admin interface at `/admin/evaluation`**
- Simple authentication check (env var or user.isAdmin flag)
- Chat message list with user query + AI response pairs
- Basic 1-5 star rating form with open comment box for detailed feedback

#### Week 2: Comprehensive Benchmark Evaluation
**Evaluate 30-50 diverse responses to establish baseline:**
- Generate responses across key use cases:
  - Theme extraction ("What are the main themes?")
  - Quote retrieval ("Find quotes about X")
  - Cross-document analysis ("Compare findings between docs")
  - Synthesis ("What should we do next?")
  - Tool usage validation
- Focus on identifying specific quality patterns through detailed comments
- Document failure modes and their frequency

#### Week 3: Data-Driven Evaluation Criteria
**Refine evaluation framework based on benchmark findings:**
- Convert observed quality issues into measurable criteria checklist
- Create golden dataset from benchmark (best/worst examples)
- Design targeted evaluation rubric for identified weak areas

#### Week 4: Optimized Evaluation Process
**Streamlined evaluation based on learnings:**
- Implement refined checklist focused on actual quality issues
- Build analytics dashboard showing priority improvement areas
- Export system for systematic prompt testing

## Technical Implementation

### Database Schema Addition
```prisma
model Evaluation {
  id            String      @id @default(cuid())
  messageId     String      @unique
  rating        Int         // 1-5 stars
  checklist     Json        // Evaluation criteria results
  comments      String?     @db.Text
  evaluator     String      // Admin who evaluated
  isGolden      Boolean     @default(false) // Golden dataset flag
  createdAt     DateTime    @default(now())
  message       ChatMessage @relation(fields: [messageId], references: [id])
}

// Add to ChatMessage model
model ChatMessage {
  // ... existing fields
  evaluation    Evaluation?
}
```

### Route Structure
```
/admin/evaluation              - Dashboard (list of chat pairs)
/admin/evaluation/[messageId]  - Individual evaluation form
/admin/evaluation/analytics    - Simple metrics view
/admin/evaluation/export       - CSV export of evaluations
```

### Access Control
**Option 1: Environment Variable**
```typescript
// lib/admin-auth.ts
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || []

export function isAdmin(userEmail: string): boolean {
  return ADMIN_EMAILS.includes(userEmail)
}
```

**Option 2: Database Flag**
```prisma
model User {
  // ... existing fields
  isAdmin Boolean @default(false)
}
```

### UI Components (Reuse Existing)
- **EvaluationCard** - Display query/response pair
- **RatingInput** - 5-star rating component  
- **ChecklistForm** - Evaluation criteria checkboxes
- **EvaluationTable** - Dashboard list view
- **AdminLayout** - Wrapper with admin navigation

## Evaluation Criteria

### Primary Rating (1-5 stars)
**"Would a user researcher find this response useful?"**

### Evaluation Criteria (To Be Refined After Benchmark)

#### Initial Benchmark Phase
**Simple rating + detailed comments** to identify patterns:
- 1-5 star rating: "Would a user researcher find this useful?"
- Open comment field for specific quality observations

#### Post-Benchmark Checklist (Week 3)
**Data-driven criteria based on benchmark findings:**
```typescript
interface EvaluationChecklist {
  // TO BE DETERMINED after benchmark evaluation
  // Will be populated with specific, measurable criteria
  // based on observed quality patterns
  criterion_1: boolean  // TBD based on most frequent issues
  criterion_2: boolean  // TBD based on impact analysis
  criterion_3: boolean  // TBD based on user research needs
  // ... additional criteria as identified
}
```

### Comments Field
**Benchmark Phase:** Open-ended feedback to identify quality patterns:
- What specific issues make this response less useful?
- What would improve this response for a user researcher?
- Are there missing details, weak evidence, or unclear insights?

**Post-Benchmark:** Targeted feedback based on identified criteria

## Data Flow

### 1. Admin Evaluation Workflow
```
1. Admin visits /admin/evaluation
2. Sees list of recent chat message pairs
3. Clicks "Evaluate" on unevaluated messages
4. Fills out rating + checklist + comments
5. Marks as golden dataset if exemplary/problematic
6. System saves evaluation to database
```

### 2. Analytics View
```typescript
interface EvaluationMetrics {
  totalEvaluations: number
  averageRating: number
  checklistPassRates: {
    specific_themes: number       // % avoiding generic themes
    grounded_evidence: number     // % with proper evidence
    actionable_details: number    // % including actionable nuances
    contextual_nuance: number     // % capturing user context
    correct_tools: number         // % using tools correctly
    human_readable: number        // % well-structured
  }
  goldenDatasetSize: number
  failurePatterns: string[]
}
```

### 3. Export Format
```csv
id,query,response,rating,specific_themes,grounded_evidence,actionable_details,contextual_nuance,correct_tools,human_readable,comments,study_name,timestamp
msg1,What are the main themes?,Based on analysis...,4,true,true,false,false,false,true,Themes too generic; missing user context,User Study 1,2025-01-15
```

## Implementation Details

### Week 1: Core Infrastructure
**Files to create:**
- `app/admin/evaluation/page.tsx` - Dashboard
- `app/admin/evaluation/[messageId]/page.tsx` - Evaluation form
- `lib/admin-auth.ts` - Access control
- `components/admin/EvaluationCard.tsx` - Chat pair display
- `components/admin/RatingForm.tsx` - Rating interface

**Database migration:**
```sql
-- Add Evaluation table
-- Add ChatMessage.evaluation relation
```

### Week 2: Enhanced UI
**Add components:**
- `components/admin/ChecklistForm.tsx` - Criteria checkboxes
- `components/admin/FilterBar.tsx` - Study/date filtering  
- `app/admin/evaluation/export/route.ts` - CSV export API

### Week 3: Golden Dataset
**Features:**
- Checkbox to mark messages as golden dataset
- Filter view for golden dataset messages
- Target 50 cases across 5 categories (10 each)

### Week 4: Analytics
**Simple metrics page:**
- Cards showing key numbers (avg rating, total evals)
- Charts for checklist pass rates
- List of common failure patterns

## Success Metrics

### Benchmark Outcomes (Week 2)
- **30-50 evaluated responses** across key use cases
- **Baseline quality score** established
- **Top 3-5 quality issues** identified with frequency data
- **Golden dataset** of 20+ examples (best and worst cases)

### Process Targets
- **Evaluation efficiency:** <3 minutes per response during benchmark
- **Quality insights:** Specific, actionable improvement areas identified
- **Launch readiness:** Clear criteria for acceptable response quality

## Advantages Over Separate App

1. **No data sync** - Direct database access to messages
2. **Context preservation** - See full study, documents, user journey
3. **Reuse infrastructure** - Auth, UI components, deployment
4. **Real-time evaluation** - Evaluate responses as they come in
5. **Simpler deployment** - One app, one database, one domain

## Resources Required

- **1 Engineer (40% FTE for 4 weeks)** - Lighter than separate app
- **Product input (2 hours)** - Define evaluation criteria  
- **Admin time (1 hour/week)** - Run evaluations

## Timeline

- **Week 1:** Admin route + basic evaluation form
- **Week 2:** Dashboard + checklist + export
- **Week 3:** Golden dataset curation (50 cases)
- **Week 4:** Analytics + baseline quality measurement

**Total: 4 weeks to actionable insights, built into existing app**

This approach leverages our existing Next.js infrastructure while providing the systematic evaluation capabilities we need. No separate deployments, no data export/import, just a clean admin interface for quality measurement.

---

## Phase 2: LLM-as-Judge Acceleration (Optional Extension)

### Overview
After establishing manual evaluation baseline, add LLM-powered evaluation to accelerate the process while maintaining human oversight.

### Implementation (1-2 weeks after Phase 1)

#### Week 5: LLM Evaluation Integration
**Add Claude-powered auto-evaluation:**
- Evaluation prompt template based on identified quality criteria
- Simple API route for LLM evaluation calls
- "Auto-Evaluate" button in admin interface
- Auto-populate rating + comments with human review option

#### Week 6: Bulk Evaluation & Refinement
**Scale evaluation process:**
- Bulk evaluation of historical responses
- Compare LLM vs human evaluation accuracy
- Tune evaluation prompts based on disagreements
- Dashboard showing manual vs auto evaluation metrics

### Technical Implementation

#### Evaluation Prompt Template
```typescript
const EVALUATION_PROMPT = `
You are evaluating an AI response for user research analysis quality.

USER QUERY: {query}
AI RESPONSE: {response}
SOURCE DOCUMENTS: {documentContext}

Rate this response 1-5 stars based on our quality criteria:
{evaluationCriteria} // Populated from Phase 1 findings

Provide your rating and 2-3 sentences explaining the score.
Focus on: specificity of insights, evidence grounding, actionability for researchers.
`
```

#### Simple API Integration
```typescript
// app/api/admin/llm-evaluate/route.ts
export async function POST(request: Request) {
  const { messageId } = await request.json()
  
  // Get message + context from database
  const message = await getMessageWithContext(messageId)
  
  // Call Claude for evaluation using established criteria
  const evaluation = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307', // Fast + cheap for evaluation
    messages: [{ role: 'user', content: buildEvaluationPrompt(message) }]
  })
  
  return { 
    rating: extractRating(evaluation.content),
    explanation: evaluation.content 
  }
}
```

#### Database Schema Addition
```prisma
model Evaluation {
  // ... existing fields from Phase 1
  autoRating     Int?     // LLM-generated rating
  autoComments   String?  // LLM explanation  
  isManual       Boolean  @default(true) // Manual vs auto evaluation
  reviewedBy     String?  // Human who reviewed auto-eval
}
```

#### UI Enhancement
```typescript
// Add to evaluation form
const handleAutoEvaluate = async () => {
  setLoading(true)
  const { rating, explanation } = await fetch('/api/admin/llm-evaluate', {
    method: 'POST',
    body: JSON.stringify({ messageId })
  }).then(r => r.json())
  
  // Auto-populate but allow human editing
  setRating(rating)
  setComments(explanation)
  setIsAutoGenerated(true)
  setLoading(false)
}
```

### Benefits of Phase 2

#### Speed & Scale
- **10x faster evaluation** - Instant ratings for bulk assessment
- **Consistent criteria** - Same standards applied across all responses
- **Historical analysis** - Evaluate past responses quickly

#### Quality Assurance  
- **Human oversight** - All auto-evaluations reviewable/editable
- **Disagreement analysis** - Identify where LLM vs human judgments differ
- **Prompt refinement** - Improve evaluation accuracy over time

#### Cost Efficiency
- **Cheap model** - Claude Haiku costs ~$0.0001 per evaluation
- **Bulk processing** - Evaluate 100+ responses for <$1
- **Focus human time** - Only review edge cases and disagreements

### Implementation Effort
- **1-2 days** - Core LLM evaluation API + UI integration
- **Few hours** - Evaluation prompt tuning based on Phase 1 criteria
- **Minimal ongoing cost** - Haiku evaluations very inexpensive

### Success Metrics for Phase 2
- **Evaluation throughput:** 50+ evaluations per hour (vs 10+ manual)
- **Human-LLM agreement:** 80%+ on ratings within 1 star
- **Review efficiency:** <30 seconds to review/adjust auto-evaluations
- **Quality maintenance:** Auto-evaluation accuracy improves with prompt tuning

This phase transforms the evaluation system from manual bottleneck to scalable quality assurance, while keeping human judgment in the loop for final decisions.