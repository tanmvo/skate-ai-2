# PRD: Skate AI MVP - Document Analysis & Chat Interface

## Overview
Build a research platform that combines document upload with AI-powered chat, organized by research studies. Focus on validating the core researcher workflow: upload related documents to a study, then chat with AI to extract insights across those documents.

## Core Features

### 1. Study Management Interface
**Purpose:** Test if researchers naturally organize documents into research projects

**Landing Page (/) - Studies Overview:**
```
┌─────────────────────────────────────────┐
│  🔬 Skate AI                [+ Create]  │
├─────────────────────────────────────────┤
│  My Studies                             │
│                                         │
│  ┌─────────────────┐  ┌───────────────┐ │
│  │ User Onboarding │⋮ │ New study     │⋮│
│  │ by: tanmvo      │  │ by: tanmvo    │ │
│  └─────────────────┘  └───────────────┘ │
│                                         │
│  ┌─────────────────┐                    │
│  │ Competitor      │⋮                   │
│  │ Analysis        │                    │
│  │ by: tanmvo      │                    │
│  └─────────────────┘                    │
└─────────────────────────────────────────┘
```

**Study Cards Include:**
- Study name
- Author name
- Menu dropdown (⋮) with delete option
- Click anywhere on card to enter study

**Implementation:**
- Auto-create default "New study" for new users
- Create button in header creates new study with name "New study"
- No modal required - direct creation and navigation
- Menu dropdown contains: "Delete study" (with confirmation dialog)
- All documents and chat are scoped to the current study

**User Flow:**
1. **First Visit:** Land on studies overview, see auto-created "New study"
2. **Create Study:** Click "+ Create" button, auto-creates "New study" and navigates there
3. **Enter Study:** Click any study card to enter individual study interface
4. **Delete Study:** Click menu dropdown → "Delete study" → confirmation dialog
5. **Within Study:** Upload docs and chat as designed
6. **Navigation:** Breadcrumb back to studies overview

### 2. Combined Upload + Chat Interface

**Layout:**
```
┌─────────────────────────────────────────┐
│ 📚 Study: User Onboarding [▼]          │
├─────────────────────────────────────────┤
│  Documents (30%)    │  Chat (70%)       │
│ ┌─────────────────┐ │ ┌───────────────┐ │
│ │ + Upload Files  │ │ │ Chat History  │ │
│ │                 │ │ │ ...           │ │
│ │ 📄 interview1   │ │ │               │ │
│ │ 📄 interview2   │ │ │               │ │
│ │ 📄 notes.txt    │ │ │               │ │
│ └─────────────────┘ │ └───────────────┘ │
│                     │ ┌───────────────┐ │
│                     │ │ [Type message]│ │
│                     │ └───────────────┘ │
└─────────────────────────────────────────┘
```

**Document Panel (Left 30%):**
- Drag & drop file upload area
- List of uploaded documents with status indicators
- Support: PDF, DOCX, TXT files
- File processing status: "Processing..." → "Ready" → "Failed"

**Chat Panel (Right 70%):**
- Chat history for current study
- Message input with send button
- Streaming responses from Claude
- Citation system showing source document/section

### 3. Document Processing Pipeline

**File Upload Flow:**
1. User drops files or clicks upload
2. Files stored using Vercel Blob (production)
3. Text extraction based on file type:
   - PDF: `pdf-parse` library
   - DOCX: `mammoth` library  
   - TXT: Direct text reading
4. Text chunking (1000 chars, 200 char overlap)
5. Generate Voyage AI embeddings for each chunk
6. Store document metadata + chunks in database
7. Update UI when processing complete

**Supported File Types:**
- PDF documents
- Microsoft Word (.docx)
- Plain text (.txt)

### 4. AI-Powered Research Chat

**Research-Specific Capabilities:**
- "What are the main themes in these interviews?"
- "Find quotes about user frustrations"
- "Summarize key insights from these documents"
- "What patterns do you see across interviews?"
- "Compare themes between interview 1 and interview 3"

**Technical Implementation:**
- Voyage AI embeddings for document retrieval (`voyage-large-2`)
- Claude Haiku for chat responses
- Vector similarity search to find relevant document chunks
- Include top 5 relevant chunks as context in Claude prompt
- Stream responses for better UX

**Response Quality Focus:**
- Primary validation target: Are AI responses useful for research analysis?
- Test with real research documents and questions
- Measure response relevance, accuracy, and research value
- Citation quality must allow tracing insights back to sources

**Citation System:**
- Show which document and section insights come from
- Format: `"insight text" (Source: interview1.pdf, p.3)`
- Clickable citations to highlight relevant text

## Technical Architecture

### Frontend Structure
```
app/
├── page.tsx                    # Studies overview/dashboard
├── study/
│   └── [studyId]/page.tsx     # Individual study interface
├── components/
│   ├── ui/                    # ShadCN UI components
│   ├── StudyCard.tsx          # Study card with menu dropdown
│   ├── StudyLayout.tsx        # Layout for individual study pages
│   ├── DocumentPanel.tsx      # Left side: upload + doc list
│   ├── ChatPanel.tsx          # Right side: chat interface
│   ├── FileUpload.tsx         # Drag & drop component
│   └── MessageList.tsx        # Chat messages with citations
└── api/
    ├── studies/
    │   ├── route.ts           # GET all studies, POST new study
    │   └── [studyId]/route.ts # GET/PUT/DELETE individual study
    ├── upload/route.ts        # File upload + processing
    ├── chat/route.ts          # Chat with streaming
    └── documents/route.ts     # Document management
```

### Database Schema
```prisma
model Study {
  id          String      @id @default(cuid())
  name        String
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  documents   Document[]
  messages    ChatMessage[]
}

model Document {
  id            String       @id @default(cuid())
  fileName      String
  fileType      String
  fileSize      Int
  status        ProcessingStatus @default(PROCESSING)
  extractedText String?      @db.Text
  uploadedAt    DateTime     @default(now())
  studyId       String
  study         Study        @relation(fields: [studyId], references: [id])
  chunks        DocumentChunk[]
}

model DocumentChunk {
  id           String    @id @default(cuid())
  content      String    @db.Text
  chunkIndex   Int
  embedding    Bytes?    
  documentId   String
  document     Document  @relation(fields: [documentId], references: [id])
}

model ChatMessage {
  id            String      @id @default(cuid())
  role          MessageRole
  content       String      @db.Text
  citations     Json?       
  timestamp     DateTime    @default(now())
  studyId       String
  study         Study       @relation(fields: [studyId], references: [id])
}

enum ProcessingStatus {
  PROCESSING
  READY
  FAILED
}

enum MessageRole {
  USER
  ASSISTANT
}
```

### Storage Strategy
**Development:** File system storage in `/uploads` directory
**Production:** Vercel Blob (5GB free tier sufficient for MVP)

**Migration Path:**
```typescript
// Development
await writeFile(path.join('./uploads', fileName), buffer);

// Production  
await put(fileName, buffer, { access: 'private' });
```

### AI Integration
**Voyage AI Embeddings:**
- Model: `voyage-large-2` (optimized for retrieval tasks)
- Generate embeddings for each document chunk
- Store as binary in database for simple vector search
- Cost-effective alternative with high quality for research documents

**Claude Integration:**
- Model: `claude-3-haiku-20240307` 
- Include relevant document chunks as context
- Stream responses for better UX
- Extract citations from responses

**Vector Search:**
- Cosine similarity between query embedding and chunk embeddings
- Return top 5 most relevant chunks as context
- Simple in-memory implementation for MVP

## Testing & Infrastructure

### Unit Testing (Vitest)
```typescript
// Core functions to test:
- extractTextFromPDF()
- chunkText()
- generateEmbedding()
- findRelevantChunks()
- cosineSimilarity()
```

### Integration Testing
```typescript
// API routes to test:
- POST /api/upload (file processing)
- POST /api/chat (chat with context)
- GET /api/studies (study management)
```

### Logging Infrastructure
```typescript
// Structured logging for:
- File upload events
- Document processing status
- Chat interactions
- Error tracking
- Performance metrics (response times)
```

### Error Tracking
- Console logging for development
- Structured JSON logs for production
- Error boundary components for frontend crashes
- API error handling with proper status codes

## Success Metrics

### User Behavior Validation
- **Studies Usage:** Do users create multiple studies or stick to one?
- **Document Organization:** Average documents per study
- **Chat Engagement:** Average messages per session (target: 15+)
- **Return Usage:** Do researchers come back multiple times?

### Technical Performance
- **Response Times:** <3 seconds for chat responses
- **Processing Speed:** <30 seconds for document processing
- **Error Rates:** <5% document processing failures
- **Uptime:** 95%+ availability

### User Value Signals (Primary Focus)
- **Response Quality:** 70%+ of responses rated useful by researchers
- **Response Relevance:** AI answers address the actual research question asked
- **Response Accuracy:** Insights are supported by the uploaded documents
- **Citation Quality:** Researchers can trace insights back to specific sources
- **Follow-up Questions:** Users ask multiple questions per session
- **Cross-Document Queries:** Users ask about patterns across documents
- **Time Savings:** Faster insight generation vs manual analysis
- **Research Value:** Responses provide actionable insights for research work

## What We're NOT Building

- ❌ Automated insight generation on upload
- ❌ Advanced export formats (CSV, presentations)
- ❌ Team collaboration features
- ❌ Workflow automation
- ❌ Integrations with other tools
- ❌ Complex study management (tags, sharing, etc.)
- ❌ Advanced document annotation
- ❌ Real-time collaboration

## Implementation Priority

### Week 1: Foundation
1. Set up database schema
2. Create basic UI layout with study selector
3. Implement file upload with text extraction
4. Build document list component

### Week 2: AI Integration  
1. Voyage AI embeddings integration
2. Claude chat integration
3. Vector search implementation
4. Citation system
5. Response quality testing with real research documents

### Week 3: Polish & Testing
1. Streaming chat responses
2. Error handling and loading states
3. Unit and integration tests
4. Performance optimization

### Week 4: User Testing
1. Deploy to production
2. Researcher testing sessions
3. Usage analytics implementation
4. Feedback collection and analysis

This PRD focuses on validating the core hypothesis: **researchers want AI to help them analyze documents within the context of specific research studies, not just chat with random documents**.