# Claude Code Configuration

## Project Overview
This is a Next.js application for **Skate AI** - a research platform that helps solo researchers analyze documents through AI-powered chat. The focus is on amplifying researcher expertise rather than replacing it.

## Development Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Key Technologies
- Next.js 15.4.4
- React 19.1.0
- TypeScript 5
- Prisma 6.12.0
- Tailwind CSS 4
- ShadCN UI components
- SWR for client-side data fetching
- ESLint 9
- Additional UI libraries: class-variance-authority, clsx, lucide-react, tailwind-merge

## Database
- Uses Prisma ORM
- Schema located at `prisma/schema.prisma`
- Client configuration in `lib/prisma.ts`

## Project Structure

- `app/` - Next.js App Router pages and API routes
  - `page.tsx` - Studies dashboard
  - `study/[studyId]/page.tsx` - Individual study interface  
  - `api/` - Studies, upload, chat, documents endpoints
- `components/` - UI components (organize by feature: study, document, chat)
- `lib/` - Utilities (AI/embeddings, document processing, database helpers)
  - `hooks/` - Custom React hooks (useStudies, useDocuments, useChat)
  - `contexts/` - React contexts (StudyContext, ChatContext, DocumentContext)
- `prisma/` - Database schema and models
- `prd/` - Product requirements for current features

**Organization Rule:** Group files by feature within directories. Use descriptive names like `voyage-embeddings.ts` or `document-text-extractor.ts` for easy discovery. Use SWR for all client-side database fetching operations.

**Performance Patterns:** Use Next.js streaming patterns for better performance when fetching data. Implement loading.tsx files and Suspense boundaries to progressively load UI components. Reference: https://nextjs.org/learn/dashboard-app/streaming

**Data Fetching Patterns:**
- **Server Components:** Use Prisma directly in async components for initial page loads (`lib/data.ts` functions)
- **Client Components:** Use SWR for real-time updates, user interactions, and frequently changing data
- **Hybrid:** Server-side initial data + SWR fallbackData for optimal performance

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
- OpenAI embeddings for document retrieval
- Claude integration for chat responses
- Vector embeddings with document chunking
- Unit testing setup (Jest/Vitest)
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