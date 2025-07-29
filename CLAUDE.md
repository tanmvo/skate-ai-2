# Claude Code Configuration

## Project Overview
This is a Next.js application for **Skate AI** - a research platform that helps solo researchers analyze documents through AI-powered chat. The focus is on amplifying researcher expertise rather than replacing it.

## Development Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run db:init` - Create default user in database
- `npm run db:reset` - Reset database and recreate user
- `npm run dev:clean-files` - Remove orphaned development files
- `npm run dev:clean-db` - Remove orphaned database records
- `npm run dev:clean-all` - Complete cleanup (files + database)

## Environment Setup
Required environment variables:
```bash
# Database
POSTGRES_PRISMA_URL="postgresql://..."
POSTGRES_URL_NON_POOLING="postgresql://..."

# AI Services
VOYAGE_API_KEY="your_voyage_ai_api_key"
ANTHROPIC_API_KEY="your_claude_api_key" # (Phase 2.3)

# File Storage (Production)
BLOB_READ_WRITE_TOKEN="your_vercel_blob_token" # Optional
```

## Key Technologies
- Next.js 15.4.4
- React 19.1.0
- TypeScript 5
- Prisma 6.12.0
- Tailwind CSS 4
- ShadCN UI components
- SWR for client-side data fetching
- ESLint 9
- Voyage AI for document embeddings (`voyage-large-2`)
- Additional UI libraries: class-variance-authority, clsx, lucide-react, tailwind-merge

## Database
- Uses Prisma ORM with PostgreSQL 
- Schema located at `prisma/schema.prisma`
- Client configuration in `lib/prisma.ts`
- User authentication via `lib/auth.ts` (single-user MVP mode)
- Default user ID: `usr_mvp_dev_2025` (stored in `lib/constants.ts`)

## Project Structure

- `app/` - Next.js App Router pages and API routes
  - `page.tsx` - Studies dashboard
  - `study/[studyId]/page.tsx` - Individual study interface  
  - `api/` - Studies, upload, chat, documents endpoints
- `components/` - UI components (organize by feature: study, document, chat)
- `lib/` - Utilities (AI/embeddings, document processing, database helpers)
  - `constants.ts` - App constants including default user ID
  - `auth.ts` - User authentication and ownership validation
  - `data.ts` - Database helper functions with user scoping
  - `document-processing.ts` - Text extraction (PDF, DOCX, TXT)
  - `document-chunking.ts` - Text chunking with overlap
  - `voyage-embeddings.ts` - Voyage AI integration and embedding serialization
  - `vector-search.ts` - Cosine similarity and semantic search
  - `hooks/` - Custom React hooks (useStudies, useDocuments, useChat)
  - `contexts/` - React contexts (StudyContext, ChatContext, DocumentContext)
- `prisma/` - Database schema and models
- `prd/` - Product requirements for current features
- `dev-uploads/` - Development file storage (gitignored)
- `scripts/` - Database initialization and cleanup utilities

**Organization Rule:** Group files by feature within directories. Use descriptive names like `voyage-embeddings.ts` or `document-text-extractor.ts` for easy discovery. Use SWR for all client-side database fetching operations.

**Performance Patterns:** Use Next.js streaming patterns for better performance when fetching data. Implement loading.tsx files and Suspense boundaries to progressively load UI components. Reference: https://nextjs.org/learn/dashboard-app/streaming

**Data Fetching Patterns:**
- **Server Components:** Use Prisma directly in async components for initial page loads (`lib/data.ts` functions)
- **Client Components:** Use SWR for real-time updates, user interactions, and frequently changing data
- **Hybrid:** Server-side initial data + SWR fallbackData for optimal performance
- **Security:** All database operations automatically scoped to current user via `lib/auth.ts`

**File Storage & Cleanup:**
- **Development:** Files stored in `dev-uploads/` (gitignored) with database path tracking
- **Production:** Vercel Blob storage for uploaded documents  
- **Storage Override:** Use `X-Storage-Type: filesystem|vercel-blob` header to override default
- **Safety:** User-scoped cleanup commands protect shared production database
- **Cleanup Options:** `--dry-run` for preview, `--yes` to skip confirmations

**React Development Patterns:**
- **Hooks First:** Custom hooks for stateful logic (useStudies, useDocuments, useChat)
- **Context for Global State:** React Context for app-wide state (current study, user session, UI themes)
- **Component Composition:** Break down complex components into smaller, reusable pieces
- **Custom Hooks:** Data fetching, form state, file upload progress, real-time updates, local storage
- **Context Providers:** Study context, user auth state, theme preferences, global loading states
- **Avoid:** Class components, direct DOM manipulation, complex prop drilling

---

## Product Strategy

### Core Value Proposition
**"AI research assistant that helps you generate better insights faster"** - not replacing researcher analysis, but amplifying it.

### MVP Features

#### Document Management
- File upload (PDF, DOCX, TXT) with text extraction
- Multiple documents per research study/project
- Basic study organization and grouping

#### AI-Powered Chat Interface
- Research-focused chat capabilities:
  - "What are the main themes in this interview?"
  - "Find quotes about user frustrations"
  - "Summarize key insights from these documents"
  - "What patterns do you see across interviews?"
  - "Compare themes between interview 1 and interview 3"
- Citation system showing source document/section for insights
- Document-aware context and cross-document analysis

#### Technical Infrastructure
- Voyage AI embeddings for document retrieval (`voyage-large-2`)
- Claude integration for chat responses (next phase)
- Vector embeddings with document chunking
- Unit testing setup (Vitest with 90+ tests)
- Logging infrastructure & error tracking
- Performance monitoring and observability

#### Export & Organization
- Copy insights and save chat history
- Simple export functionality
- Basic study organization

### Success Metrics
- 70% of chat responses rated useful by researchers
- Average 15+ chat messages per session
- <3 second average response times
- Users return multiple times (engagement signal)

### What We're NOT Building (This Iteration)
- ❌ Automated insight generation on upload
- ❌ Workflow/automation setup  
- ❌ Team collaboration features
- ❌ Advanced export formats
- ❌ Integrations with other tools