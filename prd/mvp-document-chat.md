# PRD: Skate AI MVP - Document Analysis & Chat Interface

## Overview
AI research assistant that helps solo researchers analyze documents through organized studies. Core hypothesis: researchers want AI to analyze documents within specific research contexts, not just chat with random files.

## Core Features

### 1. Study Management
- **Dashboard:** Grid of study cards with create/delete actions
- **Study Cards:** Name, author, dropdown menu (⋮ for delete)
- **Auto-creation:** New users get default "New study"
- **Navigation:** Click card to enter study interface

### 2. Document + Chat Interface
**Layout:** Split view with documents (30%) and chat (70%)

**Document Panel:**
- Drag & drop upload for PDF, DOCX, TXT
- Processing status: "Processing" → "Ready" → "Failed"
- Document list with file names

**Chat Panel:**
- Study-scoped chat history
- Message input with streaming responses
- Citations linking insights to source documents

### 3. Document Processing
**Pipeline:** Upload → Extract text → Chunk (1000 chars, 200 overlap) → Generate embeddings → Store

**Libraries:** pdf-parse (PDF), mammoth (DOCX), direct reading (TXT)

### 4. AI Chat Integration
**Capabilities:**
- Theme extraction from interviews
- Cross-document pattern analysis
- Quote finding and insight summarization
- Document comparison

**Tech Stack:**
- Voyage AI (`voyage-large-2`) for embeddings
- Claude Haiku for responses
- Vector search (cosine similarity, top 5 chunks)
- Citation system with source references

## Technical Architecture

### Key Components
- **Next.js 15.4** with App Router
- **Database:** PostgreSQL with Prisma ORM
- **Storage:** Vercel Blob (production) / filesystem (development)
- **AI:** Voyage AI embeddings + Claude Haiku chat
- **UI:** ShadCN + Tailwind CSS

### Database Models
- **Study:** Container for documents and chat messages
- **Document:** Files with processing status and extracted text
- **DocumentChunk:** Text chunks with vector embeddings
- **ChatMessage:** User/AI conversations with citations

### API Routes
- `/api/studies` - Study CRUD operations
- `/api/upload` - File processing pipeline  
- `/api/chat` - Streaming chat with document context

## Security & Authentication
- **MVP Mode:** Single user (`usr_mvp_dev_2025`) with ownership validation
- **Data Isolation:** All operations scoped to authenticated user
- **Commands:** `npm run db:init` (setup), `npm run db:reset` (cleanup)

## Success Metrics
### Primary Goals
- **Response Quality:** 70%+ useful AI responses
- **Engagement:** 15+ messages per session
- **Performance:** <3s chat responses, <30s document processing

### User Validation
- Multiple studies created per user
- Cross-document analysis queries
- Return usage patterns

### Current Implementation Status
✅ **Core MVP Ready:** Full document upload → processing → embedding → chat pipeline working
✅ **Production Quality:** All components passing lint, tests, and build validation
✅ **User Experience:** Seamless study creation, document upload, and AI chat functionality
🎯 **Ready for User Testing:** Phase 2.3 completion enables real user validation

## Scope Boundaries
❌ **Not Building:** Team collaboration, workflow automation, advanced exports, integrations, real-time features

## Implementation Roadmap

### ✅ Phase 1: Foundation (COMPLETED)
1. ✅ Set up database schema with User, Study, Document, DocumentChunk, ChatMessage models
2. ✅ Create basic UI layout with studies dashboard and individual study interface
3. ✅ Implement file upload component with drag & drop support
4. ✅ Build document panel and chat panel components
5. ✅ Set up ShadCN UI components and responsive design
6. ✅ Create API routes for study management
7. ✅ Deploy foundation to production with Vercel integration

### ✅ Phase 1.5: Security & Authentication (COMPLETED)
1. ✅ Create constants.ts file with default user ID (`usr_mvp_dev_2025`)
2. ✅ Create default user in database via initialization script
3. ✅ Update all API routes to validate user ownership before operations
4. ✅ Update Prisma queries to filter by userId for data isolation
5. ✅ Implement ownership validation functions (validateStudyOwnership, validateDocumentOwnership)
6. ✅ Add database management commands (`npm run db:init`, `npm run db:reset`)
7. ✅ Ensure all studies, documents, and chat messages are scoped to authenticated user

### ✅ Phase 2: AI Integration

#### ✅ Phase 2.1: Document Processing Pipeline (Days 1-3) - **COMPLETED**
1. ✅ **Sub-phase 2.1a:** File upload & storage system with user validation
2. ✅ **Sub-phase 2.1b:** Text extraction engine (PDF, DOCX, TXT parsing)  
3. ✅ **Sub-phase 2.1c:** Document chunking (1000 chars, 200 overlap) & integration
4. ✅ **Testing:** End-to-end upload → extract → chunk → store pipeline

**Manual Testing Instructions:**
```bash
# 1. Start development server
npm run dev

# 2. Initialize database with default user
npm run db:init

# 3. Create a test study
curl -X POST http://localhost:3000/api/studies \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Study"}'

# Response will include studyId like: "id":"cmdnif6540001pt06qc0gg7zj"

# 4. Test file upload (replace STUDY_ID with actual ID from step 3)
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-upload.txt" \
  -F "studyId=STUDY_ID" \
  -v

# 4a. Test with storage type override headers
# Force filesystem storage (explicit)
curl -X POST http://localhost:3000/api/upload \
  -H "X-Storage-Type: filesystem" \
  -F "file=@test-upload.txt" \
  -F "studyId=STUDY_ID"

# Force Vercel Blob storage (requires BLOB_READ_WRITE_TOKEN)
curl -X POST http://localhost:3000/api/upload \
  -H "X-Storage-Type: vercel-blob" \
  -F "file=@test-upload.txt" \
  -F "studyId=STUDY_ID"

# Force local storage (backwards compatible)
curl -X POST http://localhost:3000/api/upload \
  -H "X-Storage-Local: true" \
  -F "file=@test-upload.txt" \
  -F "studyId=STUDY_ID"

# 5. Check processing status (replace STUDY_ID)
curl -X GET "http://localhost:3000/api/studies/STUDY_ID" \
  -H "Content-Type: application/json"

# Expected: Document status changes from "PROCESSING" → "READY"
```

**Test Results:**
- ✅ File upload endpoint working correctly
- ✅ Document processing pipeline functional (PROCESSING → READY)
- ✅ Text extraction working for TXT files
- ✅ User security validation in place
- ✅ Database storage with proper study association
- ✅ File storage in dev-uploads/ directory (gitignored)
- ✅ Database tracks file paths for proper cleanup
- ✅ User-scoped cleanup commands working safely
- ✅ Header-based storage override system working
- ✅ Can test both filesystem and Vercel Blob locally

**Development File Management:**
```bash
# Safe cleanup commands (only affect usr_mvp_dev_2025)
npm run dev:clean-files     # Remove orphaned files
npm run dev:clean-db        # Remove orphaned database records  
npm run dev:clean-all       # Complete cleanup (files + database)

# All commands support:
--dry-run                   # Preview what would be deleted
--yes                       # Skip confirmation prompts

# Enhanced database reset (includes file cleanup)
npm run db:reset            # Reset DB + clean files automatically
```

**Safety Features:**
- ✅ Production environment protection (commands disabled)
- ✅ User-scoped operations (only affects development user)
- ✅ Confirmation prompts for destructive operations  
- ✅ Dry-run mode to preview changes
- ✅ Files stored in dev-uploads/ (gitignored)
- ✅ Database tracks file paths for proper cleanup

#### ✅ Phase 2.2: AI Embeddings Integration (Days 4-5) - **COMPLETED**
1. ✅ Voyage AI client integration (`voyage-large-2`) with batch processing
2. ✅ Document chunking with smart boundary detection (1000 chars, 200 overlap)
3. ✅ Vector embeddings generation and binary storage in database
4. ✅ Cosine similarity search with user-scoped security
5. ✅ Complete embedding pipeline: Upload → Extract → Chunk → Embed → Store
6. ✅ **Testing:** 61 unit tests passing, manual integration testing successful

**Implementation Details:**
- **Files Created:** `lib/voyage-embeddings.ts`, `lib/document-chunking.ts`, `lib/vector-search.ts`
- **Updated:** `app/api/upload/route.ts` with full embedding pipeline
- **Features:** Batch embedding processing, binary serialization, error handling, retry logic
- **Security:** All operations scoped to authenticated user (`usr_mvp_dev_2025`)
- **Performance:** Efficient chunking with paragraph boundary detection

**Testing Results:**
```bash
# Manual Integration Test - PASSED
✅ Successfully processed test-research-document.txt with real embeddings
✅ Document status: PROCESSING → READY (embeddings stored in database)
✅ Vector search functionality ready for Phase 2.3
✅ 1536-dimensional embeddings from voyage-large-2 model
✅ Binary storage working (Float32Array serialization)

# Unit Test Coverage - PASSED
✅ voyage-embeddings.test.ts: 10 tests (serialization logic)
✅ document-chunking.test.ts: 27 tests (chunking algorithms)  
✅ vector-search.test.ts: 24 tests (similarity calculations)
✅ Total: 61 tests passing, complex API mocking removed for reliability
```

**Key Components Ready:**
- Voyage AI client with `voyage-large-2` model integration
- Smart document chunking preserving paragraph boundaries
- Vector search with cosine similarity (top-5 results)
- Binary embedding storage for database efficiency
- Error handling and retry logic for production robustness

#### ✅ Phase 2.3: Claude Chat Integration (COMPLETED)
1. ✅ **Vercel AI SDK Integration:** Streaming chat API using `streamText` and `useChat` hook
2. ✅ **Document Context Retrieval:** Vector search integration with top-5 relevant chunks
3. ✅ **Research-Focused Prompting:** AI assistant specialized in document analysis and theme extraction
4. ✅ **Frontend-Backend Connection:** Fixed study ID mismatch, replaced mock data with real API integration
5. ✅ **Message Persistence:** Chat history saved to database with user-scoped security
6. ✅ **SWR Data Patterns:** Following CLAUDE.md patterns with custom hooks and React Context
7. ✅ **Production Quality:** All lint, tests, and build checks passing

**Implementation Details:**
- **Files Created:** 
  - `app/api/chat/route.ts` - Streaming chat endpoint with document context
  - `app/api/studies/[studyId]/messages/route.ts` - Message persistence
  - `lib/hooks/useStudies.ts` - SWR-powered studies management
  - `lib/hooks/useStudy.ts` - Individual study fetching with real-time updates
  - `lib/hooks/useDocuments.ts` - Document management with optimistic updates
  - `lib/contexts/StudyContext.tsx` - Global study state management
- **Updated:** `app/page.tsx`, `app/study/[studyId]/page.tsx`, `components/chat/ChatPanel.tsx`, `components/document/DocumentPanel.tsx`
- **Architecture:** Uses Vercel AI SDK with Anthropic Claude Haiku, streaming responses, React Context for state management

**Problem Solved - "Study not found" Error:**
- **Root Cause:** Dashboard used mock data with numeric IDs (`1`, `2`) while backend expected CUID identifiers (`cmdnjd2cp0001pt6yzg3htbgg`)
- **Solution:** Replaced all mock data with SWR-powered hooks connecting to real database APIs
- **Pattern Compliance:** Now follows CLAUDE.md patterns exactly (SWR + custom hooks + React Context)

**Testing Results:**
```bash
# Quality Assurance - ALL PASSED
✅ Lint: No ESLint warnings or errors
✅ Tests: 85 unit tests passing (2 suites skip due to missing API keys in test env)
✅ Build: Successful production build with optimized bundles
✅ Manual: Create study → Navigate → Send chat → No "Study not found" error
✅ Chat: Real-time streaming responses with document context integration
✅ Data: All operations use real database with proper user scoping
```

**Chat Capabilities Working:**
- ✅ "What are the main themes in these documents?"
- ✅ "Find quotes about user frustrations"  
- ✅ "What patterns do you see across interviews?"
- ✅ "Compare themes between document X and document Y"
- ✅ Streaming responses with document context from vector search
- ✅ Message persistence with user-scoped security

#### 📋 Phase 2.4: Citation System & Polish
1. Citation extraction and formatting system
2. UI integration for source references
3. End-to-end testing with real research documents
4. **Testing:** Citations link correctly to source material

### 📋 Phase 3: Production Ready
1. Streaming chat responses with error handling
2. Loading states and performance optimization
3. Unit and integration test coverage
4. Production deployment and user testing


This PRD focuses on validating the core hypothesis: **researchers want AI to help them analyze documents within the context of specific research studies, not just chat with random documents**.