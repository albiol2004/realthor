# Kairo - Real Estate CRM Development Guide

> **For AI Assistants & Developers**
> This document provides comprehensive context about the Kairo project architecture, design decisions, and development guidelines.

## Project Overview

**Kairo** is the operating system for real estate agents - a modern, AI-powered CRM suite designed to unify all aspects of real estate business management in one place.

**Vision:** Just as Notion became the OS for information management, Kairo aims to be the OS for real estate professionals.

### Core Principles

1. **Type Safety First** - TypeScript everywhere, from database to UI
2. **Modular Architecture** - Easy to swap implementations without breaking changes
3. **Developer Experience** - Fast iteration, clear patterns, excellent tooling
4. **Performance** - Sub-2s load times, < 200ms API responses
5. **User Experience** - Unified interfaces (e.g., all messaging channels in one view)

## Technology Stack

### Frontend
- **Framework:** Next.js 14+ (App Router, React Server Components)
- **Language:** TypeScript 5+
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** React hooks + tRPC for server state
- **Forms:** React Hook Form + Zod validation

### Backend
- **API:** tRPC (type-safe, no code generation)
- **Database:** Supabase (PostgreSQL + pgvector) → Swappable to self-hosted
- **ORM:** Drizzle ORM (lightweight, type-safe)
- **Auth:** Supabase Auth (JWT-based) → Swappable
- **Storage:** Supabase Storage (S3-compatible) → Swappable

### AI & Search
- **LLM:** OpenAI GPT-4 / Anthropic Claude
- **Embeddings:** OpenAI text-embedding-3-small
- **Vector Search:** pgvector (MVP) → Pinecone/Qdrant (production scale)

### Deployment
- **Frontend:** Vercel (optimized for Next.js)
- **Database:** Supabase (managed PostgreSQL)
- **Monitoring:** Vercel Analytics + Sentry

## Architecture Decisions

### 1. Adapter Pattern for External Services

**Problem:** Direct dependencies on Supabase, pgvector, etc. make migration painful later.

**Solution:** Abstract all external services behind adapter interfaces.

```typescript
// lib/providers/index.ts - SINGLE SOURCE OF TRUTH

export class ServiceProvider {
  static get database(): DatabaseAdapter {
    // 🔥 Swap implementation by changing ONE line
    return new SupabaseDatabaseAdapter(...)
    // return new PostgresDatabaseAdapter(process.env.DATABASE_URL)
  }

  static get vector(): VectorAdapter {
    return new PgVectorAdapter(this.database)
    // return new PineconeAdapter(process.env.PINECONE_API_KEY)
  }
}
```

**Benefits:**
- Migrate from Supabase → self-hosted PostgreSQL in hours, not weeks
- Swap pgvector → Pinecone when performance demands it
- Test with mock adapters (fast, isolated)
- Support multiple backends simultaneously (e.g., gradual migration)

**Adapter Locations:**
- `lib/adapters/database/` - Database operations
- `lib/adapters/auth/` - Authentication
- `lib/adapters/storage/` - File storage
- `lib/adapters/vector/` - Vector similarity search
- `lib/adapters/messaging/` - Email, WhatsApp, SMS providers

### 2. Unified Messaging Architecture

**Problem:** Users need to see all communications with a contact in one place, regardless of channel (email, WhatsApp, SMS, etc.).

**Solution:** Unified messaging interface with channel-specific implementations.

**Frontend:** Single `/messages` route
- Conversation view shows all channels combined
- Composer lets user select channel dynamically
- Timeline merges emails + WhatsApp + future channels

**Backend:** Orchestrator pattern
- `messaging.service.ts` coordinates channels
- `email.service.ts` handles email-specific logic
- `whatsapp.service.ts` handles WhatsApp-specific logic

**Database:** Separate tables + unified views
```sql
-- Channel-specific tables (optimized per channel)
emails (...)
whatsapp_messages (...)

-- Conversation container (groups all messages)
conversations (
  id, contact_id, last_message_at,
  unread_count, last_channel
)

-- Unified view for querying
CREATE VIEW unified_messages AS
  SELECT *, 'email' as channel FROM emails
  UNION ALL
  SELECT *, 'whatsapp' as channel FROM whatsapp_messages
  ORDER BY timestamp DESC;
```

**Type Safety:** Discriminated unions
```typescript
type Message = EmailMessage | WhatsAppMessage | SMSMessage

// TypeScript knows channel-specific fields!
if (message.channel === 'email') {
  // message.subject is available
  // message.mediaUrl is NOT (compile error)
}
```

### 3. Repository Pattern for Data Access

**Problem:** Services shouldn't directly call database adapters - it mixes concerns.

**Solution:** Repository layer between services and database.

```
Router (tRPC)
  ↓
Service (business logic)
  ↓
Repository (data access - uses adapters)
  ↓
Adapter (database implementation)
```

**Example:**
```typescript
// ✅ GOOD
class ContactsService {
  private repo = new ContactsRepository()

  async createContact(data) {
    // Business logic
    if (await this.repo.findByEmail(data.email)) {
      throw new Error('Contact exists')
    }
    return this.repo.create(data)
  }
}

// ❌ BAD
class ContactsService {
  async createContact(data) {
    // Direct database calls - tightly coupled
    const existing = await supabase.from('contacts')...
  }
}
```

### 4. Monorepo Structure (Future-Ready)

**Current:** Single `apps/web` application
**Future:** Shared packages for mobile app

```
apps/
  ├── web/      # Next.js web app
  └── mobile/   # React Native (Phase 2)

packages/
  ├── ui/       # Shared UI components
  ├── types/    # Shared TypeScript types
  └── config/   # Shared configs (ESLint, TS, Tailwind)
```

**Why:** When we build the mobile app, we can share business logic, types, and UI components.

## Directory Structure Guide

### `/apps/web/src/app` - Next.js App Router

**Route Groups:**
- `(auth)/` - Unauthenticated routes (login, signup)
- `(dashboard)/` - Protected routes (requires auth)
- `api/` - API routes (tRPC, webhooks, uploads)

**Key Files:**
- `layout.tsx` - Root layout (providers, fonts, metadata)
- `page.tsx` - Landing page
- `middleware.ts` - Auth middleware, redirects

### `/apps/web/src/components`

**Organization:**
- `ui/` - shadcn/ui primitives (button, input, dialog, etc.)
- `layout/` - Layout components (header, sidebar, nav)
- `shared/` - Shared components (data-table, empty-state, etc.)
- `[feature]/` - Feature-specific components (added per phase)

**Phase 1:** Only `ui/`, `layout/`, `shared/`
**Phase 2+:** Add `crm/`, `documents/`, `messaging/`, etc.

### `/apps/web/src/lib` - Core Utilities

**Critical Subdirectories:**

#### `adapters/`
**Purpose:** Interface definitions for all external services
**Pattern:** Each adapter has `index.ts` (interface) + implementation files
**Example:**
```
adapters/database/
  ├── index.ts              # DatabaseAdapter interface
  ├── supabase.adapter.ts   # Supabase implementation
  └── postgres.adapter.ts   # Direct PostgreSQL (future)
```

#### `providers/`
**Purpose:** Dependency injection - SINGLE PLACE to swap implementations
**File:** `index.ts` exports `ServiceProvider` class
**Usage:**
```typescript
import { ServiceProvider } from '@/lib/providers'

const db = ServiceProvider.database  // Gets current DB adapter
const vector = ServiceProvider.vector  // Gets current vector adapter
```

#### `supabase/`
**Purpose:** Supabase-specific code ONLY (clients, middleware)
**Files:**
- `client.ts` - Browser client
- `server.ts` - Server client (for Server Components, API routes)
- `middleware.ts` - Auth middleware for Next.js

#### `trpc/`
**Purpose:** tRPC configuration (type-safe APIs)
**Files:**
- `client.ts` - React hooks (`trpc.contacts.list.useQuery()`)
- `server.ts` - tRPC server setup
- `context.ts` - Request context (user, db, etc.)

### `/apps/web/src/server` - Server-Side Code

#### `routers/`
**Purpose:** tRPC API endpoints
**Pattern:** One file per domain (contacts, properties, messaging, etc.)
**Example:**
```typescript
// routers/contacts.ts
export const contactsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return contactsService.list(ctx.user.id)
  }),
  create: protectedProcedure
    .input(createContactSchema)
    .mutation(async ({ ctx, input }) => {
      return contactsService.create(ctx.user.id, input)
    })
})
```

#### `services/`
**Purpose:** Business logic (adapter-agnostic)
**Pattern:** Coordinates repositories, applies business rules
**Example:**
```typescript
// services/contacts.service.ts
class ContactsService {
  private repo = new ContactsRepository()

  async create(userId: string, data: CreateContactInput) {
    // Business logic here
    const existing = await this.repo.findByEmail(data.email)
    if (existing) throw new Error('Duplicate')

    return this.repo.create({ ...data, userId })
  }
}
```

#### `repositories/`
**Purpose:** Data access layer (uses adapters)
**Pattern:** Abstracts database operations
**Example:**
```typescript
// repositories/contacts.repository.ts
class ContactsRepository {
  private db = ServiceProvider.database

  async findByEmail(email: string) {
    return this.db.query('contacts', [
      { field: 'email', operator: 'eq', value: email }
    ])
  }
}
```

#### `db/`
**Purpose:** Database schema, migrations, queries
**Files:**
- `schema.ts` - Drizzle ORM schema
- `index.ts` - Database client
- `queries/` - Reusable raw SQL queries
- `migrations/` - SQL migration files

### `/apps/web/src/types`

**Organization:**
- `index.ts` - Re-exports all types
- `adapters.ts` - Adapter interface types
- `database.ts` - Database table types
- `[feature].ts` - Feature-specific types (crm, messaging, etc.)

**Pattern:** Use discriminated unions for polymorphic data
```typescript
// types/messaging.ts
interface BaseMessage {
  id: string
  timestamp: Date
}

interface EmailMessage extends BaseMessage {
  channel: 'email'  // Discriminator
  subject: string
}

interface WhatsAppMessage extends BaseMessage {
  channel: 'whatsapp'  // Discriminator
  mediaUrl?: string
}

type Message = EmailMessage | WhatsAppMessage
```

## Development Phases

### Phase 1: Foundation (Weeks 1-4) ← **CURRENT**
**Goal:** Set up architecture, auth, basic dashboard

**Tasks:**
- [x] Directory structure
- [ ] Next.js + TypeScript + Tailwind setup
- [ ] Supabase project + client setup
- [ ] tRPC configuration
- [ ] Adapter interfaces (empty implementations OK)
- [ ] shadcn/ui components
- [ ] Authentication pages (login/signup)
- [ ] Protected route middleware
- [ ] Basic dashboard layout

**Deliverable:** User can sign up, log in, see empty dashboard

### Phase 2: Core CRM (Weeks 5-10)
**Features:** Contacts, Properties, Deals, Activities
**Focus:** CRUD operations, list views, detail pages

### Phase 3: Documents (Weeks 11-13)
**Features:** File upload, document viewer, OCR, organization

### Phase 4: Unified Messaging (Weeks 14-17)
**Features:** Email + WhatsApp in one interface, templates, sync

### Phase 5: Intelligence (Weeks 18-22)
**Features:** Semantic search, AI chat, embeddings generation

### Phase 6: Polish & Launch (Weeks 23-26)
**Focus:** Mobile responsive, PWA, performance, testing, docs

## Key Patterns & Best Practices

### 1. File Naming Conventions
- **Pages:** `page.tsx` (Next.js convention)
- **Components:** `kebab-case.tsx` (e.g., `contact-card.tsx`)
- **Services:** `*.service.ts` (e.g., `contacts.service.ts`)
- **Repositories:** `*.repository.ts`
- **Adapters:** `*.adapter.ts`
- **Types:** `*.ts` (e.g., `crm.ts`, `messaging.ts`)

### 2. Import Aliases
```typescript
// Use @ alias for src/
import { Button } from '@/components/ui/button'
import { ServiceProvider } from '@/lib/providers'
import { contactsService } from '@/server/services/contacts.service'

// NOT relative paths like:
import { Button } from '../../../components/ui/button'  // ❌
```

### 3. Error Handling
```typescript
// Services throw domain-specific errors
throw new ContactNotFoundError(id)
throw new DuplicateContactError(email)

// tRPC catches and formats errors
// Frontend gets typed error responses
```

### 4. Validation
```typescript
// Define Zod schemas in lib/validations.ts
export const createContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
})

// Use in tRPC routers
.input(createContactSchema)

// Reuse in frontend forms (React Hook Form + Zod)
```

### 5. Database Queries
```typescript
// ✅ GOOD - Use repositories
const contacts = await contactsRepository.findByUserId(userId)

// ⚠️ ACCEPTABLE - Use adapter for complex queries
const results = await ServiceProvider.database.query(sql`
  SELECT ... complex query
`)

// ❌ BAD - Direct Supabase calls in services
const { data } = await supabase.from('contacts')...
```

## Migration Strategy

### Current State (Phase 1)
- Supabase for everything (database, auth, storage)
- pgvector for semantic search
- Adapter interfaces defined but point to Supabase

### Future Migration Path

**When to migrate:**
- Supabase costs > $200/month
- Vector search latency > 500ms consistently
- Need on-premise deployment
- Performance bottlenecks in Supabase

**How to migrate (example: Supabase → self-hosted PostgreSQL):**

1. Implement `PostgresDatabaseAdapter`
2. Deploy PostgreSQL instance
3. Run migrations to create schema
4. Change ONE line in `lib/providers/index.ts`:
   ```typescript
   static get database() {
     // return new SupabaseDatabaseAdapter(...)
     return new PostgresDatabaseAdapter(process.env.DATABASE_URL)
   }
   ```
5. Update auth adapter (Supabase Auth → custom JWT)
6. Update storage adapter (Supabase Storage → S3)
7. Test thoroughly in staging
8. Deploy to production

**Estimated effort:** 3-5 days (thanks to adapter pattern!)

**Without adapters:** 3-4 weeks of refactoring across entire codebase

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| First Load | < 2s | TBD |
| Time to Interactive | < 3s | TBD |
| Lighthouse Score | 90+ | TBD |
| Database Query | < 100ms | TBD |
| Vector Search | < 200ms | TBD |
| API Response (tRPC) | < 200ms | TBD |

**Monitoring:** Vercel Analytics + Sentry (setup in Phase 6)

## Environment Variables

### Required for Phase 1

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Added in Later Phases

```bash
# OpenAI (Phase 5)
OPENAI_API_KEY=sk-xxx

# Resend (Phase 4)
RESEND_API_KEY=re_xxx

# WhatsApp Business API (Phase 4)
WHATSAPP_API_KEY=xxx
WHATSAPP_PHONE_NUMBER_ID=xxx
```

## Testing Strategy

### Unit Tests
- **Tools:** Vitest
- **Focus:** Services, utilities, pure functions
- **Mocking:** Use mock adapters
- **Location:** `tests/unit/`

### Integration Tests
- **Tools:** Vitest + test database
- **Focus:** API routes, database operations
- **Location:** `tests/integration/`

### E2E Tests
- **Tools:** Playwright
- **Focus:** Critical user flows (auth, CRUD operations)
- **Location:** `tests/e2e/playwright/tests/`

### Test Coverage Goals
- Services: 80%+
- Repositories: 70%+
- Components: 50%+

## Security Considerations

### Authentication
- JWT-based (Supabase Auth)
- Refresh token rotation
- Secure httpOnly cookies

### Authorization
- Row Level Security (RLS) in PostgreSQL
- All queries filtered by `user_id`
- tRPC `protectedProcedure` ensures auth

### Data Protection
- Encryption at rest (Supabase)
- Encryption in transit (HTTPS)
- API keys in environment variables (never in code)

### Input Validation
- All inputs validated with Zod
- SQL injection protected (Drizzle ORM)
- XSS protected (React escapes by default)

## Useful Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format

# Database migrations
pnpm db:migrate

# Generate DB types
pnpm db:generate

# Tests
pnpm test              # Unit tests
pnpm test:integration  # Integration tests
pnpm test:e2e          # E2E tests

# Build for production
pnpm build

# Start production server
pnpm start
```

## Common Tasks for AI Assistants

### Adding a New Feature
1. Create types in `src/types/[feature].ts`
2. Create database schema in `src/server/db/schema.ts`
3. Create repository in `src/server/repositories/[feature].repository.ts`
4. Create service in `src/server/services/[feature].service.ts`
5. Create tRPC router in `src/server/routers/[feature].ts`
6. Create React hook in `src/hooks/use-[feature].ts`
7. Create UI components in `src/components/[feature]/`
8. Create pages in `src/app/(dashboard)/[feature]/`

### Adding a New Adapter
1. Define interface in `src/lib/adapters/[service]/index.ts`
2. Create implementation in `src/lib/adapters/[service]/[provider].adapter.ts`
3. Update `ServiceProvider` in `src/lib/providers/index.ts`
4. Update types in `src/types/adapters.ts`

### Debugging Issues
1. Check console for errors
2. Verify environment variables (`.env.local`)
3. Check tRPC network tab (DevTools)
4. Verify database schema matches types
5. Check Supabase dashboard for RLS policies

## Additional Resources

- **Full Architecture:** See `PROJECT_STRUCTURE.md`
- **Database Schema:** See `docs/architecture/database-schema.md`
- **API Documentation:** See `docs/api/trpc-routes.md`
- **Contributing:** See `docs/development/contributing.md`

## Questions?

**For AI Assistants:** This document should provide sufficient context to help with code generation, refactoring, and debugging. Always follow the patterns established here.

**For Human Developers:** If anything is unclear, update this document! It's a living guide.

---

**Last Updated:** 2025-11-11
**Phase:** Foundation (Phase 1)
**Status:** Directory structure created, ready for implementation
