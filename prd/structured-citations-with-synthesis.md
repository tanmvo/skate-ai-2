# PRD: Structured Citations with LLM Synthesis

## 🎯 IMPLEMENTATION STATUS: **PHASE 1 COMPLETE** ✅

**Progress Summary:**
- **Phase 1**: ✅ **100% COMPLETE** (Foundation & Schema Design) 
- **Phase 2**: ✅ **100% COMPLETE** (UI Components & Chat Integration)
- **Phase 3**: ✅ **100% COMPLETE** (Tool Coexistence & Smart Routing)
- **Phase 4**: ⏸️ **Future Enhancement** (Performance & Polish)
- **Phase 5**: ⏸️ **Future Enhancement** (Advanced Features)

**🚀 What's Live Now:**
- Advanced synthesis tool with `generateObject()` integration
- Interactive inline citations with `{{cite:id}}` markers  
- Document-level citation system with expandable details
- Intelligent tool routing (Quick Search vs Deep Research)
- Full backward compatibility with existing functionality
- Zero breaking changes, graceful error handling

---

## Overview
Redesign the citation system to have the LLM actively synthesize search results into structured findings with explicit source attribution, enabling precise inline citations and better research insights.

## Current State Analysis

### Current Architecture Issues
- **Disconnected Streams**: Citations are byproducts of tool execution, separate from LLM response
- **No Source Attribution**: LLM doesn't track which search results inform specific insights
- **Generic Citations**: All search results become citations regardless of actual usage
- **Poor UX**: Citations grouped at end, disconnected from specific findings

### Current Flow
1. User asks question → LLM calls search tools
2. Search returns document chunks → We auto-generate citations
3. LLM writes response (unaware of citations) → Citations displayed separately
4. No connection between specific insights and their sources

## Proposed Solution: LLM-Driven Synthesis with Structured Citations

### Core Concept
The LLM should act as an active researcher that:
1. **Searches** for relevant information - (Tool Calls)
2. **Synthesizes** findings from search results (LLM synthesizes the information)
3. **Attributes** each insight to specific source material (LLM synthesizes)
4. **Structures** the response with embedded citation metadata (LLM provides a structured response)
5. **Render** client renders the correct component

### New Architecture

#### Structured Response Format with Inline Citations
```typescript
interface StructuredResponse {
  response: string;           // Flowing text with inline citation markers
  citations: Citation[];      // Array of all citations referenced in response
  metadata: {
    searchQueries: string[];
    documentsSearched: string[];
    totalChunksAnalyzed: number;
  };
}

interface Citation {
  id: string;                 // Unique citation ID for inline referencing (e.g. "doc1", "doc2")
  documentId: string;
  documentName: string;
  relevantText: string;       // Representative text snippet from document
  pageNumber?: number;        // Optional page reference if available
}
```

## Research and Implementation Strategy

### Current Architecture Analysis

**Existing Pattern Analysis (`ChatPanel.tsx`, `app/api/chat/route.ts`)**
- ✅ Uses `useChat` hook from AI SDK with data streaming
- ✅ Tool calls handled via `createSearchTools()` function  
- ✅ Citations extracted from stream data (`onFinish` callback)
- ✅ Progressive message rendering with `ProgressiveMessage` component

**Integration Points Identified:**
1. **Tool Layer**: `lib/llm-tools/search-tools.ts` - Add synthesis tool alongside search tools
2. **API Layer**: `app/api/chat/route.ts` - Already configured for tool calling with streaming
3. **Type System**: `lib/types/citations.ts` - Extend citation interface for structured responses  
4. **UI Layer**: `components/chat/ProgressiveMessage.tsx` - Add structured message component

### AI SDK Implementation Strategy

**Key Finding**: The codebase already uses AI SDK's streaming and tool calling features perfectly. We can implement structured synthesis by:

1. **Creating a synthesis tool** that returns structured objects via `generateObject()`
2. **Streaming structured data** through existing `dataStream.writeData()` pattern  
3. **Rendering structured responses** with new React components that detect synthesis data

**Implementation Pattern:**
```typescript
// Tool execution returns structured data
dataStream.writeData({
  type: 'synthesis-complete',
  synthesis: structuredResponse, // Our structured object
  timestamp: Date.now()
});

// Frontend detects and renders with appropriate component
const synthesisData = data?.find(item => item.type === 'synthesis-complete');
if (synthesisData) {
  return <StructuredMessage synthesis={synthesisData.synthesis} />;
}
```

This approach integrates seamlessly with the existing chat flow while adding powerful synthesis capabilities.

### AI SDK UI Reference Implementation
For reference, here's the standard AI SDK Generative UI pattern we'll follow:

1. **Tool Creation** → `lib/llm-tools/synthesis-tools.ts` (like [get-weather.ts](https://github.com/vercel/ai-chatbot/blob/main/lib/ai/tools/get-weather.ts))
2. **API Integration** → `app/api/chat/route.ts` (like [chat/route.ts](https://github.com/vercel/ai-chatbot/blob/main/app/(chat)/api/chat/route.ts))
3. **UI Component** → `components/chat/StructuredMessage.tsx` (like [weather.tsx](https://github.com/vercel/ai-chatbot/blob/main/components/weather.tsx))
4. **Message Routing** → `components/chat/ProgressiveMessage.tsx` (like [message.tsx](https://github.com/vercel/ai-chatbot/blob/main/components/message.tsx))

The flow: Model calls synthesis tool → Tool returns structured data → Frontend detects data type → Renders appropriate component.

### Simplified Citation Strategy

**Decision: Document-Level Citations Only**

Instead of complex chunk-to-citation mapping, we use a simpler approach:
- Citations reference entire documents, not specific chunks
- Citation IDs are simple document references (e.g., `{{cite:doc1}}`, `{{cite:interview_sarah}}`)
- LLM includes representative text snippets in `relevantText` field
- No need for chunk indexing, validation, or complex mapping logic

**Benefits:**
- ✅ Much simpler implementation and maintenance
- ✅ Eliminates citation mapping edge cases and errors
- ✅ Still provides core value: users know which document supports each finding
- ✅ Cleaner, more reliable user experience

**Example Citation Flow:**
1. Search returns chunks from "Interview with Sarah.pdf" and "User Survey.docx"
2. LLM generates: `"Users struggled with navigation {{cite:sarah_interview}} and requested simpler menus {{cite:user_survey}}"`
3. Citations array contains document-level references with representative quotes
4. UI shows document badges that expand to show relevant snippets

## Detailed Implementation Plan

### Phase 1: Foundation & Schema Design (Week 1)

**1.1 Enhanced Type System**
- [x] Replace `lib/types/citations.ts` with new structured citation interface (✅ **COMPLETED** - Maintained backward compatibility instead)
- [x] Create `lib/schemas/synthesis-schema.ts` with Zod schemas for validation (✅ **COMPLETED**)
- [x] Add inline citation marker support (`{{cite:id}}` format) (✅ **COMPLETED**)
- [x] Remove legacy citation compatibility (✅ **IMPROVED** - Kept backward compatibility with union types)

**1.2 Core Synthesis Tool**
- [x] Create `lib/llm-tools/synthesis-tools.ts` (✅ **COMPLETED**)
- [x] Implement `synthesize_research_findings` tool with `generateObject()` (✅ **COMPLETED**)
- [x] Add document-level citation logic (group search results by document) (✅ **COMPLETED**)
- [x] Integrate with existing search functions (`searchAllDocuments`, `searchSpecificDocuments`) (✅ **COMPLETED**)

**Key Code Additions:**
```typescript
// lib/llm-tools/synthesis-tools.ts - New synthesis tool
export function createSynthesisTools(studyId: string, dataStream: any) {
  return {
    synthesize_research_findings: {
      description: 'Search documents and synthesize findings with precise inline source attribution',
      parameters: z.object({
        researchQuestion: z.string().describe('The main research question to address'),
        searchQueries: z.array(z.string()).min(1).describe('Multiple search queries to gather comprehensive information'),
        documentIds: z.array(z.string()).optional().describe('Specific document IDs to search, if any'),
      }),
      execute: async ({ researchQuestion, searchQueries, documentIds }) => {
        // Step 1: Execute searches and collect results from all queries
        // Step 2: Group results by document for document-level citations
        // Step 3: Use generateObject() to create structured synthesis with document references
        // Step 4: Stream structured response
        
        const allSearchResults = [];
        const searchFunction = documentIds 
          ? (query: string) => searchSpecificDocuments(query, studyId, documentIds, { limit: 8 })
          : (query: string) => searchAllDocuments(query, studyId, { limit: 8 });

        // Collect search results
        for (const query of searchQueries) {
          const result = await searchFunction(query);
          allSearchResults.push(...result.results);
        }

        // Group by document for simpler citations
        const documentGroups = groupResultsByDocument(allSearchResults);
        
        const synthesis = await generateObject({
          model: anthropic('claude-3-5-sonnet-20241022'),
          schema: structuredResponseSchema,
          prompt: buildSynthesisPrompt(researchQuestion, documentGroups),
          temperature: 0.1,
        });

        dataStream.writeData({
          type: 'synthesis-complete',
          synthesis: synthesis.object,
          timestamp: Date.now()
        });

        return `Research synthesis complete with ${synthesis.object.citations.length} document citations.`;
      },
    },
  };
}
```

**Deliverables:**
- [x] Working synthesis tool that generates structured responses (✅ **COMPLETED**)
- [x] Proper citation attribution from search results to structured output (✅ **COMPLETED**)
- [x] Data streaming integration with existing chat API (✅ **COMPLETED**)

### Phase 2: UI Components & Chat Integration (Week 2)

**2.1 Structured Message Components**
- [x] Create `components/chat/StructuredMessage.tsx` for synthesis responses (✅ **COMPLETED**)
- [x] Enhance `CitationBadge` with inline citation support (`{{cite:id}}` parsing) (✅ **COMPLETED**)
- [x] Build `CitationDetail` component for expandable citation info (✅ **COMPLETED**)
- [x] Add citation toggle interactions and smooth animations (✅ **COMPLETED**)

**2.2 Chat Panel Integration**
- [x] Update `ChatPanel.tsx` to handle synthesis data stream events (✅ **COMPLETED**)
- [x] Add `messageSynthesis` state to store structured responses alongside `messageCitations` (✅ **COMPLETED**)
- [x] Implement message type detection (synthesis vs. search citations) (✅ **COMPLETED**)
- [x] Replace existing citation rendering with hybrid approach (structured + legacy) (✅ **COMPLETED**)

**Key Code Additions:**
```typescript
// components/chat/StructuredMessage.tsx - New component
const StructuredMessage = ({ response, citations, metadata }: StructuredResponse) => {
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set());
  
  const renderTextWithCitations = (text: string) => {
    // Parse citation markers {{cite:doc1}} and replace with interactive badges
    return text.split(/(\{\{cite:\w+\}\})/).map((part, index) => {
      const citationMatch = part.match(/\{\{cite:(\w+)\}\}/);
      if (citationMatch) {
        const citationId = citationMatch[1];
        const citation = citations.find(c => c.id === citationId);
        return citation ? (
          <CitationBadge 
            key={index}
            citation={citation} 
            onClick={() => toggleCitation(citationId)}
            expanded={expandedCitations.has(citationId)}
          />
        ) : (
          // Show document name even if citation details missing
          <span key={index} className="text-muted-foreground">[{citationId}]</span>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-4">
      <div className="prose prose-sm max-w-none">
        {renderTextWithCitations(response)}
      </div>
      {/* Expanded citation details and metadata */}
    </div>
  );
};
```

**Deliverables:**
- [x] Chat UI that renders both legacy and structured messages seamlessly (✅ **COMPLETED**)
- [x] Interactive inline citations with expand/collapse functionality (✅ **COMPLETED**)
- [x] Synthesis metadata display (search queries, documents analyzed) (✅ **COMPLETED**)

### Phase 3: Tool Coexistence & Smart Routing (Week 3)

**3.1 Intelligent Tool Selection**
- [x] Update system prompt in `app/api/chat/route.ts` for tool selection guidance (✅ **COMPLETED**)
- [x] Implement query analysis for synthesis vs. search routing (✅ **COMPLETED**)
- [x] Create fallback mechanisms for synthesis failures (✅ **COMPLETED**)

**3.2 Error Handling & Robustness**
- [x] Synthesis failure → Automatic fallback to legacy search tools (✅ **COMPLETED**)
- [x] Simple document-level citation validation (ensure cited documents exist) (✅ **COMPLETED**)
- [x] Graceful handling of missing or invalid document references (✅ **COMPLETED**)
- [x] Stream error handling with graceful degradation (never break UI) (✅ **COMPLETED**)

**Smart Tool Routing Logic:**
```typescript
const systemPrompt = `You are a research assistant with two analysis modes:

**MODE 1: Quick Search & Response**
Use search tools (search_all_documents, search_specific_documents) for:
- Direct information retrieval: "What does document X say about Y?"
- Simple factual queries: "Find quotes about Z"
- Quick lookups: "Show me information on topic A"

**MODE 2: Deep Research Synthesis**  
Use synthesize_research_findings for:
- Complex analysis: "What are the main themes in these interviews?"
- Pattern identification: "What patterns emerge across documents?"
- Comparative analysis: "Compare user feedback between versions"
- Insight generation: questions asking for themes, trends, insights

Choose the appropriate mode based on query complexity. Default to Mode 1 for speed unless synthesis is clearly needed.`;
```

**Deliverables:**
- [x] LLM automatically chooses appropriate tool based on query complexity (✅ **COMPLETED**)
- [x] Robust error handling with graceful degradation to search tools (✅ **COMPLETED**)

### Phase 4: Performance & Polish (Week 4)

**4.1 Performance Optimization**
- [ ] Optimize citation parsing and rendering performance
- [ ] Implement synthesis result caching for similar queries
- [ ] Add loading states and progressive disclosure for large synthesis responses
- [ ] Bundle size optimization for new components

**4.2 UX Enhancements**
- [ ] Smooth animations for citation interactions
- [ ] Document context viewing integration
- [ ] Citation highlighting in source documents
- [ ] Export functionality for structured responses

**Deliverables:**
- Optimized performance with smooth user interactions
- Complete UX polish matching existing chat experience
- Integration with document viewing system

### Phase 5: Advanced Features & Analytics (Week 5+)

**5.1 Advanced Synthesis Capabilities**
- [ ] Multi-document theme identification
- [ ] Contradiction detection across sources
- [ ] Evidence strength scoring for citations
- [ ] Smart citation grouping by relevance

**5.2 Research Workflow Integration**
- [ ] Structured export formats (with proper citations)
- [ ] Citation analytics and usage tracking
- [ ] Integration with study organization features
- [ ] User feedback collection on synthesis quality

**Deliverables:**
- Advanced research analysis capabilities
- Integration with broader research workflow
- Data collection for synthesis improvement

## Integration Strategy with Existing System ✅ **COMPLETED**

### Tool Coexistence Architecture ✅ **IMPLEMENTED**
The new synthesis tool integrates seamlessly with existing search tools in the same chat session:

```typescript
// app/api/chat/route.ts - Updated integration
const result = streamText({
  model: anthropic('claude-3-haiku-20240307'),  // Fast routing model
  system: systemPrompt,
  messages,
  tools: {
    // Existing tools (unchanged)
    ...createSearchTools(studyId, dataStream),
    // New synthesis tool (uses Sonnet internally for quality)
    ...createSynthesisTools(studyId, dataStream),
  },
  maxSteps: 5,
  temperature: 0.1,
  maxTokens: 2000,
});
```

### Frontend Message Handling ✅ **IMPLEMENTED**
Enhanced ChatPanel supports both message types transparently:

```typescript
// components/chat/ChatPanel.tsx - Updated message handling
// Add new state for synthesis responses
const [messageSynthesis, setMessageSynthesis] = useState<Record<string, StructuredResponse>>({});

onFinish: async (message) => {
  const streamData = data || [];
  
  // Check for synthesis data first
  const synthesisData = streamData.find(item => item.type === 'synthesis-complete')?.synthesis;
  
  if (synthesisData) {
    // Store synthesis response for structured rendering
    setMessageSynthesis(prev => ({
      ...prev,
      [message.id]: synthesisData
    }));
    await saveMessageWithRetry('ASSISTANT', message.content, synthesisData.citations);
  } else {
    // Fallback to legacy citation handling  
    const legacyCitations = streamData.find(item => item.type === 'citations')?.citations || [];
    if (legacyCitations.length > 0) {
      setMessageCitations(prev => ({
        ...prev,
        [message.id]: legacyCitations
      }));
    }
    await saveMessageWithRetry('ASSISTANT', message.content, legacyCitations);
  }
}
```

## Success Metrics

### Primary Metrics
- **Citation Accuracy**: 90%+ of citations directly support their findings
- **Research Quality**: Users rate synthesized insights as more valuable than current responses
- **Source Transparency**: Users can trace every insight back to source material

### Secondary Metrics
- **Engagement**: Increased time spent reviewing findings and citations
- **Discovery**: More document exploration through citation links
- **Trust**: Higher user confidence in AI-generated insights

## Technical Considerations

### Performance
- **Streaming**: Progressive display prevents UI blocking during synthesis
- **Caching**: Cache synthesis results for similar queries
- **Smart Routing**: Use synthesis only when analysis adds value

### Security
- **User Scoping**: All synthesis scoped to user's documents
- **Content Filtering**: Prevent synthesis of sensitive information
- **Rate Limiting**: Prevent abuse of synthesis capabilities

### Backward Compatibility Guarantees
- **No database changes** required to existing schema
- **Existing messages** remain unchanged and fully functional
- **API contracts** unchanged - new events are additive
- **Zero breaking changes** to current functionality

This implementation strategy provides **zero downtime**, **zero breaking changes**, and **graceful degradation** while adding powerful new synthesis capabilities that transform the AI from a passive responder to an active research synthesizer.