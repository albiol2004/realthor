# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-11-13

### Added - MVP Dashboard Implementation
- **Dashboard Page:** Complete MVP dashboard with all core features (`app/(dashboard)/dashboard/page.tsx`)
  - Clean, minimalist black/white design matching auth pages
  - Fully responsive layout with mobile support
  - Dark mode compatible styling throughout
- **Action Center:** AI-prioritized task list
  - Interactive task list with priority indicators (high/medium/low)
  - Color-coded tasks with visual priority badges
  - Task completion toggle functionality
  - Due time display for time-sensitive tasks
  - Empty state when no tasks exist
  - "Add Task" button (placeholder for future implementation)
  - Task counter in quick stats
- **Talk to Kairo Command Bar:** Natural language interface
  - Search-style input with icon
  - Placeholder for AI command processing
  - Submit functionality with alerts for future implementation
  - Purple accent color for AI features
  - Example prompts in placeholder text
- **Agent Notepad:** Note-taking with AI task extraction
  - Large textarea for freeform notes
  - Character counter
  - "Extract Tasks" button (placeholder for AI processing)
  - Placeholder text with examples
  - Visual indicator for AI capabilities
- **Real-time Sync Indicator:** Status display in header
  - Green checkmark when synced
  - Spinning icon when syncing
  - Last sync timestamp display
  - Positioned in top-right of dashboard
- **Quick Stats Cards:** Overview metrics
  - Tasks Completed Today (dynamic count)
  - High Priority tasks count
  - Contacts count (placeholder for Phase 2)
  - Active Deals count (placeholder for Phase 2)
- **UI Components:**
  - Added `Textarea` component (`components/ui/textarea.tsx`)
  - Consistent with shadcn/ui design system
  - Full accessibility and focus states

### Changed
- Dashboard page completely redesigned from basic placeholder
- Improved layout structure with responsive grid system
- Enhanced visual hierarchy with cards and sections

### Technical Details
- State management with React hooks for tasks, notepad, and command input
- TypeScript interfaces for type-safe task objects
- Priority-based styling system with helper functions
- Lucide React icons throughout (CheckCircle2, Circle, Search, Sparkles, RefreshCw, Plus, Clock, AlertCircle)
- Tailwind CSS for responsive design and dark mode

### Phase Status
**Phase 1: Foundation** - ✅ Complete (Dashboard MVP)
- ✅ Authentication fully implemented
- ✅ Protected routes configured
- ✅ **MVP Dashboard with all core features**
- ✅ **Action Center with task management**
- ✅ **Talk to Kairo command interface**
- ✅ **Agent Notepad with AI extraction placeholder**
- ✅ **Real-time sync status indicator**

**Ready for Phase 2: Core CRM** (Contacts, Properties, Deals)

## [0.2.0] - 2025-11-12

### Added - Authentication Implementation
- **Supabase Authentication:** Complete Supabase Auth integration with JWT-based sessions
  - Browser client (`lib/supabase/client.ts`) for client-side operations
  - Server client (`lib/supabase/server.ts`) for Server Components and API routes
  - Middleware helper (`lib/supabase/middleware.ts`) for session management
- **Auth Service:** Business logic layer for authentication (`server/services/auth.service.ts`)
  - `signUpAgent()` - Agent signup with profile creation
  - `signUpCompany()` - Company signup with profile creation
  - `signIn()` - Email/password authentication
  - `signOut()` - Session termination
  - `getSession()` - Current user session retrieval
- **tRPC Auth Router:** Type-safe API endpoints (`server/routers/auth.ts`)
  - `auth.signUpAgent` - Agent registration endpoint
  - `auth.signUpCompany` - Company registration endpoint
  - `auth.signIn` - Login endpoint
  - `auth.signOut` - Logout endpoint
  - `auth.getSession` - Session retrieval endpoint
- **RLS Policies:** Row-Level Security for agent and company tables
  - Agents can view/update their own profile
  - Agents can view their company info
  - Agents can view other agents in their company
  - Companies can view/update their profile
  - Companies can view and manage their agents
  - Migration file: `supabase/migrations/20250112_rls_policies.sql`
- **Authentication UI:** Minimalist black/white design
  - Login page with email/password form (`app/(auth)/login/page.tsx`)
  - Signup page with agent/company selection (`app/(auth)/signup/page.tsx`)
  - Form validation with React Hook Form + Zod
  - Error handling and loading states
  - Dark mode support
- **Protected Routes:** Proxy middleware integration
  - Automatic session refresh
  - Redirect to /login for unauthenticated users
  - Redirect to /dashboard for authenticated users on auth pages
- **tRPC Context:** User session in tRPC context (`lib/trpc/context.ts`)
  - Includes authenticated user from Supabase
  - Available in all tRPC procedures
- **tRPC Provider:** React Query integration (`lib/trpc/Provider.tsx`)
  - Wraps app with tRPC and React Query providers
  - Configured in root layout

### Changed
- Updated `proxy.ts` to use Supabase authentication middleware
- Enhanced tRPC server with protected procedure middleware
- Updated tRPC context to include user session
- Auth pages migrated from placeholders to full implementations

### Fixed
- tRPC client configuration (was missing proper setup)
- TypeScript errors in auth pages (implicit any types)
- Build errors from missing tRPC provider

### Database
- Agent and company tables now protected by RLS policies
- Indexes added for performance optimization
- Foreign key relationships properly configured

### Security
- Row-Level Security enforced on all tables
- JWT-based authentication with Supabase
- Secure session management with HTTP-only cookies
- Password validation (minimum 8 characters)
- Email validation on signup

### Documentation
- `supabase/README.md` - Guide for applying RLS policies and migrations
- Updated project documentation with authentication flow

### Phase Status
**Phase 1: Foundation** - ✅ Complete
- ✅ Directory structure established
- ✅ Next.js + TypeScript + Tailwind configured
- ✅ tRPC type-safe API framework ready
- ✅ Adapter interfaces defined
- ✅ Basic UI components from shadcn/ui
- ✅ **Authentication fully implemented (login/signup/session management)**
- ✅ **Protected route middleware with Supabase**
- ✅ **RLS policies configured**
- ✅ **Agent and company profile creation**
- ✅ CI/CD pipeline operational
- ✅ Production deployment successful

**Ready for Phase 2: Core CRM**

## [0.1.0] - 2025-11-11

### Added
- Initial project structure with monorepo architecture
- Next.js 16 with App Router and React Server Components
- TypeScript 5+ configuration with strict mode
- Tailwind CSS + shadcn/ui component library
- tRPC setup for type-safe APIs with context and routers
- Supabase integration placeholders (database, auth, storage)
- Adapter pattern for swappable external services
- Basic authentication pages (login, signup) - UI only
- Dashboard layout with protected routes
- Proxy-based authentication middleware (Next.js 16 convention)
- Complete CI/CD pipeline with GitHub Actions
- Vercel deployment configuration for monorepo
- Turborepo for monorepo build orchestration
- Comprehensive documentation:
  - `CLAUDE.md` - Development guide for AI assistants
  - `PROJECT_STRUCTURE.md` - Full architecture documentation
  - `DEPLOYMENT.md` - Deployment and CI/CD guide
- Environment variable configuration with examples
- Root `.gitignore` for monorepo
- pnpm workspace configuration
- tRPC routers:
  - Auth router with session, signIn, signUp, signOut endpoints (placeholders)
  - Main app router combining all feature routers
- API routes:
  - `/api/trpc/[trpc]` - tRPC handler
  - `/api/upload` - File upload placeholder
  - `/api/webhooks` - Webhooks placeholder

### Changed
- Migrated from `middleware.ts` to `proxy.ts` (Next.js 16 convention)
- Updated `next.config.js` to use `images.remotePatterns` instead of deprecated `images.domains`
- Removed deprecated `swcMinify` option from Next.js config
- Configured Turbopack root directory for monorepo detection

### Fixed
- Next.js 16 configuration warnings (deprecated options)
- Workspace root detection issues with Vercel
- pnpm version mismatch between CI and local environment
- Empty configuration files causing build failures:
  - `turbo.json` - Added proper Turborepo configuration
  - `pnpm-workspace.yaml` - Added workspace package definitions
  - API route files - Added implementations for tRPC, upload, and webhooks
  - tRPC setup files - Added context, server, routers, and app router
- TypeScript compilation errors from missing exports
- Monorepo dependency installation in CI/CD pipeline

### Deployment
- Successfully deployed to Vercel with monorepo support
- CI pipeline running on GitHub Actions
- Automatic preview deployments for pull requests
- Production deployments on main branch merge

### Phase Status
**Phase 1: Foundation** -  Complete (Infrastructure & Architecture)
-  Directory structure established
-  Next.js + TypeScript + Tailwind configured
-  tRPC type-safe API framework ready
-  Adapter interfaces defined (implementations pending)
-  Basic UI components from shadcn/ui
-  Authentication pages created (backend pending)
-  Protected route structure in place
-  CI/CD pipeline operational
-  Production deployment successful

**Next Steps (Phase 1 Continuation):**
- [ ] Implement Supabase project setup
- [ ] Add Supabase authentication logic
- [ ] Connect database with Drizzle ORM
- [ ] Implement auth router endpoints
- [ ] Add session management to proxy middleware
- [ ] Create user profile management

## [Unreleased]

### Planned Features

#### Phase 2: Core CRM (Weeks 5-10)
- Contacts CRUD operations
- Properties management
- Deals pipeline
- Activities timeline
- Search and filters
- Dashboard with statistics

#### Phase 3: Documents (Weeks 11-13)
- File upload to Supabase Storage
- Document viewer (PDF, images)
- Link documents to contacts/properties
- Search by filename
- Organize by folders/tags

#### Phase 4: Unified Messaging (Weeks 14-17)
- Email integration (Gmail/Outlook sync)
- WhatsApp Business API integration
- Unified conversation view (all channels per contact)
- Message composer with channel selector
- Message templates for all channels
- Real-time message status updates

#### Phase 5: Intelligence (Weeks 18-22)
- OpenAI integration
- Generate embeddings for all content
- Semantic search across CRM
- AI chat assistant
- AI-powered suggestions
- Email draft generation

#### Phase 6: Polish & Launch (Weeks 23-26)
- Mobile responsive design
- PWA setup (installable)
- Performance optimization
- Error handling & logging
- E2E tests
- Documentation
- Beta launch

---

**Repository:** https://github.com/albiol2004/kairo
**Deployment:** https://vercel.com/albiol2004/kairo
