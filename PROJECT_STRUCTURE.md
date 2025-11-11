# Kairo - Real Estate CRM Suite (Modern Web Stack)

## Executive Summary

**Architecture**: Web-first progressive web app (PWA) with TypeScript
**Stack**: Next.js 14+ (App Router) + Supabase + tRPC
**Database**: PostgreSQL with pgvector for semantic search
**Deployment**: Vercel (frontend) + Supabase (backend/database)
**Timeline**: 5-6 months to full V1

## Directory Structure

```
kairo/
│
├── apps/
│   └── web/                                    # Main Next.js Application
│       ├── public/
│       │   ├── icons/                          # PWA icons
│       │   ├── fonts/
│       │   └── images/
│       ├── src/
│       │   ├── app/                            # Next.js 14 App Router
│       │   │   ├── (auth)/                     # Auth routes group
│       │   │   │   ├── login/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── signup/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── layout.tsx
│       │   │   ├── (dashboard)/                # Protected routes group
│       │   │   │   ├── dashboard/
│       │   │   │   │   └── page.tsx            # Main dashboard
│       │   │   │   ├── contacts/               # Contacts CRM
│       │   │   │   │   ├── page.tsx            # List view
│       │   │   │   │   ├── [id]/
│       │   │   │   │   │   ├── page.tsx        # Contact detail
│       │   │   │   │   │   └── edit/
│       │   │   │   │   │       └── page.tsx    # Edit contact
│       │   │   │   │   └── new/
│       │   │   │   │       └── page.tsx        # New contact
│       │   │   │   ├── properties/             # Property management
│       │   │   │   │   ├── page.tsx            # List view
│       │   │   │   │   ├── [id]/
│       │   │   │   │   │   ├── page.tsx        # Property detail
│       │   │   │   │   │   └── edit/
│       │   │   │   │   │       └── page.tsx
│       │   │   │   │   └── new/
│       │   │   │   │       └── page.tsx
│       │   │   │   ├── deals/                  # Deals pipeline
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   └── [id]/
│       │   │   │   │       └── page.tsx
│       │   │   │   ├── activities/             # Activity timeline
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── documents/              # Document hub
│       │   │   │   │   ├── page.tsx            # Document library
│       │   │   │   │   ├── [id]/
│       │   │   │   │   │   └── page.tsx        # Document viewer
│       │   │   │   │   └── upload/
│       │   │   │   │       └── page.tsx
│       │   │   │   ├── messages/               # 🆕 Unified messaging hub (Email + WhatsApp)
│       │   │   │   │   ├── page.tsx            # Unified inbox (all channels)
│       │   │   │   │   ├── [contactId]/
│       │   │   │   │   │   └── page.tsx        # Conversation view (email + WhatsApp combined)
│       │   │   │   │   ├── compose/
│       │   │   │   │   │   └── page.tsx        # Unified composer (select channel)
│       │   │   │   │   └── templates/
│       │   │   │   │       └── page.tsx        # Templates for all channels
│       │   │   │   ├── search/                 # Semantic search UI
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── ai-chat/                # AI Assistant
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── settings/               # User settings
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── profile/
│       │   │   │   │   ├── integrations/
│       │   │   │   │   └── billing/
│       │   │   │   └── layout.tsx              # Dashboard layout
│       │   │   ├── api/                        # API routes
│       │   │   │   ├── trpc/
│       │   │   │   │   └── [trpc]/
│       │   │   │   │       └── route.ts        # tRPC handler
│       │   │   │   ├── webhooks/               # External webhooks
│       │   │   │   │   ├── whatsapp/
│       │   │   │   │   │   └── route.ts
│       │   │   │   │   └── email/
│       │   │   │   │       └── route.ts
│       │   │   │   ├── cron/                   # Scheduled jobs
│       │   │   │   │   └── cleanup/
│       │   │   │   │       └── route.ts
│       │   │   │   └── upload/                 # File upload endpoint
│       │   │   │       └── route.ts
│       │   │   ├── layout.tsx                  # Root layout
│       │   │   ├── page.tsx                    # Landing page
│       │   │   ├── error.tsx                   # Error boundary
│       │   │   ├── loading.tsx                 # Loading UI
│       │   │   └── not-found.tsx
│       │   ├── components/                     # React components
│       │   │   ├── ui/                         # shadcn/ui components
│       │   │   │   ├── button.tsx
│       │   │   │   ├── input.tsx
│       │   │   │   ├── dialog.tsx
│       │   │   │   ├── dropdown-menu.tsx
│       │   │   │   ├── card.tsx
│       │   │   │   ├── table.tsx
│       │   │   │   ├── form.tsx
│       │   │   │   └── ...                     # Other shadcn components
│       │   │   ├── layout/                     # Layout components
│       │   │   │   ├── header.tsx
│       │   │   │   ├── sidebar.tsx
│       │   │   │   ├── command-palette.tsx     # Cmd+K interface
│       │   │   │   └── mobile-nav.tsx
│       │   │   ├── crm/                        # CRM components
│       │   │   │   ├── contact-card.tsx
│       │   │   │   ├── contact-list.tsx
│       │   │   │   ├── contact-form.tsx
│       │   │   │   ├── property-card.tsx
│       │   │   │   ├── property-list.tsx
│       │   │   │   ├── deal-pipeline.tsx
│       │   │   │   ├── deal-card.tsx
│       │   │   │   └── activity-timeline.tsx
│       │   │   ├── documents/                  # Document components
│       │   │   │   ├── document-viewer.tsx
│       │   │   │   ├── document-upload.tsx
│       │   │   │   ├── document-grid.tsx
│       │   │   │   └── pdf-viewer.tsx
│       │   │   ├── messaging/                  # 🆕 Unified messaging components
│       │   │   │   ├── conversation-view.tsx   # Contact's full message history (all channels)
│       │   │   │   ├── message-list.tsx        # Unified inbox with channel filters
│       │   │   │   ├── message-composer.tsx    # Compose with channel selector
│       │   │   │   ├── message-thread.tsx      # Thread messages together
│       │   │   │   ├── message-item.tsx        # Individual message (adapts to channel)
│       │   │   │   ├── channel-badge.tsx       # Email/WhatsApp/SMS indicator
│       │   │   │   ├── channel-selector.tsx    # Switch between channels
│       │   │   │   └── contact-sidebar.tsx     # Contact info in conversation
│       │   │   ├── messaging-channels/         # 🆕 Channel-specific UI components
│       │   │   │   ├── email/
│       │   │   │   │   ├── email-body.tsx      # Rich HTML email rendering
│       │   │   │   │   ├── email-composer-fields.tsx  # Subject, CC, BCC fields
│       │   │   │   │   ├── email-attachments.tsx      # Email attachment handling
│       │   │   │   │   └── email-thread-view.tsx      # Gmail-style threading
│       │   │   │   └── whatsapp/
│       │   │   │       ├── whatsapp-bubble.tsx        # WhatsApp message bubble
│       │   │   │       ├── whatsapp-media.tsx         # Image/video/document display
│       │   │   │       ├── whatsapp-status.tsx        # Sent/Delivered/Read indicators
│       │   │   │       └── whatsapp-quick-replies.tsx # Quick reply templates
│       │   │   ├── search/                     # Search components
│       │   │   │   ├── search-bar.tsx
│       │   │   │   ├── search-results.tsx
│       │   │   │   └── semantic-search.tsx
│       │   │   ├── ai/                         # AI components
│       │   │   │   ├── chat-interface.tsx
│       │   │   │   ├── ai-suggestions.tsx
│       │   │   │   └── prompt-templates.tsx
│       │   │   └── shared/                     # Shared components
│       │   │       ├── data-table.tsx
│       │   │       ├── empty-state.tsx
│       │   │       ├── loading-spinner.tsx
│       │   │       ├── error-message.tsx
│       │   │       └── file-upload-zone.tsx
│       │   ├── lib/                            # Core utilities
│       │   │   ├── adapters/                   # 🔄 SERVICE ADAPTERS (Swappable implementations)
│       │   │   │   ├── database/               # Database abstraction
│       │   │   │   │   ├── index.ts            # Database adapter interface
│       │   │   │   │   ├── supabase.adapter.ts # Supabase implementation (default)
│       │   │   │   │   └── postgres.adapter.ts # Direct PostgreSQL (future migration)
│       │   │   │   ├── auth/                   # Authentication abstraction
│       │   │   │   │   ├── index.ts            # Auth adapter interface
│       │   │   │   │   ├── supabase.adapter.ts # Supabase Auth (default)
│       │   │   │   │   └── custom.adapter.ts   # Custom JWT auth (future)
│       │   │   │   ├── storage/                # File storage abstraction
│       │   │   │   │   ├── index.ts            # Storage adapter interface
│       │   │   │   │   ├── supabase.adapter.ts # Supabase Storage (default)
│       │   │   │   │   └── s3.adapter.ts       # AWS S3 (future)
│       │   │   │   ├── vector/                 # Vector database abstraction
│       │   │   │   │   ├── index.ts            # Vector adapter interface
│       │   │   │   │   ├── pgvector.adapter.ts # pgvector (default)
│       │   │   │   │   ├── pinecone.adapter.ts # Pinecone (future - blazing fast)
│       │   │   │   │   └── qdrant.adapter.ts   # Qdrant (future option)
│       │   │   │   └── messaging/              # Messaging service abstraction
│       │   │   │       ├── email/
│       │   │   │       │   ├── index.ts        # Email adapter interface
│       │   │   │       │   ├── resend.adapter.ts   # Resend (default)
│       │   │   │       │   └── sendgrid.adapter.ts # SendGrid (future)
│       │   │   │       └── whatsapp/
│       │   │   │           ├── index.ts        # WhatsApp adapter interface
│       │   │   │           ├── official.adapter.ts  # WhatsApp Business API (default)
│       │   │   │           └── twilio.adapter.ts    # Twilio WhatsApp (alternative)
│       │   │   ├── providers/                  # 🎯 DEPENDENCY INJECTION
│       │   │   │   └── index.ts                # ServiceProvider (swap implementations here!)
│       │   │   ├── supabase/                   # Supabase-specific code only
│       │   │   │   ├── client.ts               # Browser client
│       │   │   │   ├── server.ts               # Server client
│       │   │   │   └── middleware.ts           # Auth middleware
│       │   │   ├── trpc/                       # tRPC setup
│       │   │   │   ├── client.ts               # tRPC React client
│       │   │   │   ├── server.ts               # tRPC server setup
│       │   │   │   └── context.ts              # Request context
│       │   │   ├── ai/                         # AI utilities
│       │   │   │   ├── openai.ts               # OpenAI client
│       │   │   │   ├── embeddings.ts           # Vector embeddings
│       │   │   │   └── prompts.ts              # Prompt templates
│       │   │   ├── email/                      # Email templates
│       │   │   │   └── templates.tsx           # React email templates
│       │   │   ├── whatsapp/                   # WhatsApp utilities
│       │   │   │   └── templates.ts            # Message templates
│       │   │   ├── utils.ts                    # General utilities
│       │   │   ├── constants.ts                # App constants
│       │   │   └── validations.ts              # Zod schemas
│       │   ├── server/                         # Server-side code
│       │   │   ├── routers/                    # tRPC routers
│       │   │   │   ├── _app.ts                 # Root router
│       │   │   │   ├── contacts.ts             # Contacts router
│       │   │   │   ├── properties.ts           # Properties router
│       │   │   │   ├── deals.ts                # Deals router
│       │   │   │   ├── activities.ts           # Activities router
│       │   │   │   ├── documents.ts            # Documents router
│       │   │   │   ├── messaging.ts            # 🆕 Unified messaging router (email + WhatsApp)
│       │   │   │   ├── search.ts               # Search router
│       │   │   │   ├── ai.ts                   # AI router
│       │   │   │   └── auth.ts                 # Auth router
│       │   │   ├── services/                   # Business logic (adapter-agnostic)
│       │   │   │   ├── contacts.service.ts
│       │   │   │   ├── properties.service.ts
│       │   │   │   ├── deals.service.ts
│       │   │   │   ├── documents.service.ts
│       │   │   │   ├── messaging.service.ts    # 🆕 Messaging orchestrator (coordinates channels)
│       │   │   │   ├── email.service.ts        # Email-specific operations
│       │   │   │   ├── whatsapp.service.ts     # WhatsApp-specific operations
│       │   │   │   ├── search.service.ts       # Semantic search logic
│       │   │   │   ├── ai.service.ts           # AI chat logic
│       │   │   │   └── analytics.service.ts
│       │   │   ├── repositories/               # 🆕 Data access layer (uses adapters)
│       │   │   │   ├── base.repository.ts      # Shared repository logic
│       │   │   │   ├── contacts.repository.ts  # Contact data access
│       │   │   │   ├── properties.repository.ts
│       │   │   │   ├── deals.repository.ts
│       │   │   │   └── messages.repository.ts  # Unified message data access
│       │   │   └── db/                         # Database layer
│       │   │       ├── schema.ts               # Drizzle schema
│       │   │       ├── index.ts                # DB client
│       │   │       ├── queries/                # Reusable queries
│       │   │       │   ├── contacts.ts
│       │   │       │   ├── properties.ts
│       │   │       │   └── search.ts
│       │   │       └── migrations/             # SQL migrations
│       │   │           ├── 0000_initial.sql
│       │   │           ├── 0001_add_contacts.sql
│       │   │           ├── 0002_add_properties.sql
│       │   │           ├── 0003_add_vectors.sql
│       │   │           └── meta/
│       │   ├── hooks/                          # Custom React hooks
│       │   │   ├── use-contacts.ts
│       │   │   ├── use-properties.ts
│       │   │   ├── use-documents.ts
│       │   │   ├── use-messaging.ts            # 🆕 Unified messaging hook
│       │   │   ├── use-conversation.ts         # 🆕 Single conversation hook
│       │   │   ├── use-search.ts
│       │   │   ├── use-ai-chat.ts
│       │   │   ├── use-toast.ts
│       │   │   ├── use-command-palette.ts
│       │   │   └── use-media-query.ts
│       │   ├── types/                          # TypeScript types
│       │   │   ├── index.ts                    # Re-exports
│       │   │   ├── crm.ts                      # CRM types
│       │   │   ├── documents.ts
│       │   │   ├── messaging.ts                # 🆕 Unified messaging types (discriminated unions)
│       │   │   ├── adapters.ts                 # 🆕 Adapter interface types
│       │   │   ├── search.ts
│       │   │   ├── ai.ts
│       │   │   └── database.ts                 # DB types
│       │   ├── styles/
│       │   │   └── globals.css                 # Tailwind imports
│       │   └── middleware.ts                   # Next.js middleware
│       ├── .env.example
│       ├── .env.local
│       ├── next.config.js
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── package.json
│       ├── drizzle.config.ts                   # Drizzle ORM config
│       └── postcss.config.js
│
├── packages/                                    # Shared packages (monorepo)
│   ├── ui/                                     # Shared UI components (future)
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── config/                                 # Shared configs
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── tailwind/
│   └── types/                                  # Shared types
│       ├── src/
│       └── package.json
│
├── supabase/                                    # Supabase configuration
│   ├── migrations/                             # Database migrations
│   │   ├── 20240101000000_initial_schema.sql
│   │   ├── 20240102000000_add_contacts.sql
│   │   ├── 20240103000000_add_properties.sql
│   │   ├── 20240104000000_add_deals.sql
│   │   ├── 20240105000000_add_documents.sql
│   │   ├── 20240106000000_enable_pgvector.sql
│   │   ├── 20240107000000_add_embeddings.sql
│   │   └── 20240108000000_add_rls_policies.sql
│   ├── functions/                              # Edge functions
│   │   ├── generate-embeddings/
│   │   │   └── index.ts                        # Vector embedding generation
│   │   ├── whatsapp-webhook/
│   │   │   └── index.ts                        # WhatsApp webhook handler
│   │   ├── email-webhook/
│   │   │   └── index.ts                        # Email webhook handler
│   │   └── sync-messages/
│   │       └── index.ts                        # Sync messages from external providers
│   ├── seed.sql                                # Seed data
│   └── config.toml                             # Supabase config
│
├── mobile/                                      # React Native (Phase 2)
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── navigation/
│   │   └── shared/                             # Shared with web
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                                        # Documentation
│   ├── api/
│   │   ├── trpc-routes.md                      # tRPC API documentation
│   │   └── webhooks.md                         # Webhook documentation
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── database-schema.md
│   │   ├── auth-flow.md
│   │   ├── vector-search.md
│   │   └── diagrams/
│   ├── development/
│   │   ├── setup.md                            # Local dev setup
│   │   ├── contributing.md
│   │   ├── testing.md
│   │   └── deployment.md
│   └── features/
│       ├── crm.md
│       ├── documents.md
│       ├── unified-messaging.md               # 🆕 Unified messaging documentation
│       ├── ai-chat.md
│       └── semantic-search.md
│
├── scripts/                                     # Utility scripts
│   ├── setup-local.sh                          # Local environment setup
│   ├── generate-types.sh                       # Generate DB types
│   ├── seed-dev-data.ts                        # Seed development data
│   └── migrate-db.sh                           # Run migrations
│
├── tests/                                       # Tests
│   ├── unit/                                   # Unit tests
│   │   ├── services/
│   │   ├── utils/
│   │   └── components/
│   ├── integration/                            # Integration tests
│   │   ├── api/
│   │   └── db/
│   └── e2e/                                    # E2E tests
│       ├── playwright/
│       │   ├── tests/
│       │   │   ├── auth.spec.ts
│       │   │   ├── contacts.spec.ts
│       │   │   ├── properties.spec.ts
│       │   │   ├── documents.spec.ts
│       │   │   └── search.spec.ts
│       │   └── playwright.config.ts
│       └── fixtures/
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                              # Run tests on PR
│   │   ├── deploy-preview.yml                  # Deploy preview on PR
│   │   ├── deploy-production.yml               # Deploy to production
│   │   └── type-check.yml                      # TypeScript checking
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .vscode/
│   ├── settings.json                           # VS Code settings
│   ├── extensions.json                         # Recommended extensions
│   └── launch.json                             # Debug configurations
│
├── .env.example                                # Environment variables template
├── .eslintrc.js                                # ESLint config
├── .prettierrc                                 # Prettier config
├── .gitignore
├── turbo.json                                  # Turborepo config (if using monorepo)
├── package.json                                # Root package.json
├── pnpm-workspace.yaml                         # pnpm workspace config
├── README.md
├── LICENSE
└── CHANGELOG.md
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router, React Server Components)
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: React hooks + tRPC for server state
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Charts**: Recharts or Tremor
- **PDF Viewer**: react-pdf
- **Rich Text**: Tiptap or Lexical

### Backend
- **API**: tRPC (type-safe APIs, no code generation)
- **Database**: Supabase (PostgreSQL + pgvector)
- **ORM**: Drizzle ORM (lightweight, type-safe)
- **Auth**: Supabase Auth (built-in)
- **Storage**: Supabase Storage (S3-compatible)
- **Validation**: Zod schemas (shared between frontend/backend)

### AI & Search
- **LLM**: Deepseek
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector Search**: pgvector extension in PostgreSQL
- **Full-text**: PostgreSQL full-text search

### Integrations
- **Email**: Resend (sending) + Gmail/Outlook API (receiving)
- **WhatsApp**: WhatsApp Business API (official)
- **File Processing**: Sharp (image optimization)
- **OCR**: Google Cloud Vision API or Tesseract.js

### Development
- **Package Manager**: pnpm
- **Linting**: ESLint + Prettier
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Git Hooks**: Husky + lint-staged
- **Monorepo**: Turborepo (optional, for future scaling)

### Deployment
- **Frontend**: Vercel (optimized for Next.js)
- **Backend**: Vercel Edge Functions + Supabase
- **Database**: Supabase (managed PostgreSQL)
- **CDN**: Vercel Edge Network
- **Monitoring**: Vercel Analytics + Sentry

## Database Schema (PostgreSQL)

### Core Tables

```sql
-- Users (managed by Supabase Auth)
users (
  id uuid primary key,
  email text unique,
  created_at timestamptz,
  -- Supabase handles this table
)

-- User profiles
profiles (
  id uuid primary key references users(id),
  full_name text,
  avatar_url text,
  company_name text,
  phone text,
  timezone text,
  settings jsonb,
  created_at timestamptz,
  updated_at timestamptz
)

-- Contacts
contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  company text,
  job_title text,
  tags text[],
  status text, -- lead, client, past_client
  source text, -- referral, website, cold_call
  notes text,
  custom_fields jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Properties
properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  title text not null,
  description text,
  address text not null,
  city text,
  state text,
  zip_code text,
  country text default 'US',
  price numeric(12,2),
  bedrooms integer,
  bathrooms numeric(3,1),
  square_feet integer,
  lot_size numeric(10,2),
  property_type text, -- residential, commercial, land
  status text, -- available, pending, sold, rented
  listing_date date,
  images text[], -- URLs to images
  virtual_tour_url text,
  tags text[],
  custom_fields jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Deals (opportunities)
deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  contact_id uuid references contacts(id),
  property_id uuid references properties(id),
  title text not null,
  value numeric(12,2),
  stage text, -- lead, qualified, proposal, negotiation, closed_won, closed_lost
  probability integer, -- 0-100
  expected_close_date date,
  actual_close_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Activities
activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  contact_id uuid references contacts(id),
  property_id uuid references properties(id),
  deal_id uuid references deals(id),
  type text not null, -- call, email, meeting, showing, note
  subject text,
  description text,
  completed boolean default false,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
)

-- Documents
documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  contact_id uuid references contacts(id),
  property_id uuid references properties(id),
  deal_id uuid references deals(id),
  filename text not null,
  file_url text not null,
  file_type text,
  file_size integer,
  mime_type text,
  description text,
  tags text[],
  ocr_text text, -- Extracted text for search
  metadata jsonb,
  created_at timestamptz default now()
)

-- 🆕 Conversations (unified messaging container)
conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  contact_id uuid references contacts(id),
  last_message_at timestamptz,
  last_message_preview text,
  last_channel text, -- email, whatsapp, sms
  unread_count integer default 0,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- Email messages (channel-specific table)
emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  contact_id uuid references contacts(id),
  conversation_id uuid references conversations(id),
  subject text,
  body text,
  from_email text,
  to_email text[],
  cc_email text[],
  bcc_email text[],
  direction text, -- inbound, outbound
  status text, -- draft, sent, delivered, failed
  external_id text, -- Gmail/Outlook message ID
  thread_id text,
  attachments jsonb,
  sent_at timestamptz,
  created_at timestamptz default now()
)

-- WhatsApp messages (channel-specific table)
whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  contact_id uuid references contacts(id),
  conversation_id uuid references conversations(id),
  phone_number text not null,
  message_text text,
  media_url text,
  media_type text, -- image, video, document, audio
  direction text, -- inbound, outbound
  status text, -- sent, delivered, read, failed
  external_id text, -- WhatsApp message ID
  created_at timestamptz default now()
)

-- Vector embeddings for semantic search
embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  content_type text not null, -- contact, property, document, email
  content_id uuid not null,
  content_text text not null,
  embedding vector(1536), -- OpenAI embedding dimension
  metadata jsonb,
  created_at timestamptz default now()
)

-- AI chat history
ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  title text,
  messages jsonb not null, -- Array of {role, content}
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- 🆕 Unified messages view (for querying all channels together)
CREATE VIEW unified_messages AS
  SELECT
    id,
    'email' as channel,
    user_id,
    contact_id,
    conversation_id,
    subject as title,
    body as content,
    from_email as sender_identifier,
    sent_at as timestamp,
    direction,
    status,
    null as media_url,
    null as media_type
  FROM emails
  UNION ALL
  SELECT
    id,
    'whatsapp' as channel,
    user_id,
    contact_id,
    conversation_id,
    null as title,
    message_text as content,
    phone_number as sender_identifier,
    created_at as timestamp,
    direction,
    status,
    media_url,
    media_type
  FROM whatsapp_messages
  ORDER BY timestamp DESC;
```

### Indexes for Performance

```sql
-- Full-text search
CREATE INDEX contacts_search_idx ON contacts USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || coalesce(email, '') || ' ' || coalesce(company, '')));
CREATE INDEX properties_search_idx ON properties USING gin(to_tsvector('english', title || ' ' || address || ' ' || coalesce(description, '')));

-- Vector similarity search (pgvector)
CREATE INDEX embeddings_vector_idx ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Foreign key lookups
CREATE INDEX contacts_user_id_idx ON contacts(user_id);
CREATE INDEX properties_user_id_idx ON properties(user_id);
CREATE INDEX deals_contact_id_idx ON deals(contact_id);
CREATE INDEX activities_contact_id_idx ON activities(contact_id);
CREATE INDEX documents_contact_id_idx ON documents(contact_id);

-- Common queries
CREATE INDEX deals_stage_idx ON deals(stage, user_id);
CREATE INDEX activities_due_date_idx ON activities(due_date, completed);

-- 🆕 Messaging indexes
CREATE INDEX conversations_user_id_idx ON conversations(user_id, last_message_at DESC);
CREATE INDEX conversations_contact_id_idx ON conversations(contact_id);
CREATE INDEX emails_conversation_id_idx ON emails(conversation_id, sent_at DESC);
CREATE INDEX whatsapp_conversation_id_idx ON whatsapp_messages(conversation_id, created_at DESC);
CREATE INDEX emails_thread_id_idx ON emails(thread_id);
```

## Architecture Highlights

### Modular Adapter Pattern

Kairo uses the **Adapter Pattern** for all external services, making it easy to swap implementations without changing business logic:

```typescript
// lib/providers/index.ts - SINGLE PLACE to swap implementations

export class ServiceProvider {
  static get database(): DatabaseAdapter {
    // 🔥 Change ONE line to swap from Supabase to PostgreSQL
    return new SupabaseDatabaseAdapter(...)
    // return new PostgresDatabaseAdapter(process.env.DATABASE_URL)
  }

  static get vector(): VectorAdapter {
    // 🔥 Change ONE line to swap from pgvector to Pinecone
    return new PgVectorAdapter(this.database)
    // return new PineconeAdapter(process.env.PINECONE_API_KEY)
  }

  static get auth(): AuthAdapter {
    return new SupabaseAuthAdapter()
  }

  static get storage(): StorageAdapter {
    return new SupabaseStorageAdapter()
  }
}
```

**Benefits:**
- Swap Supabase → Self-hosted PostgreSQL in minutes
- Migrate pgvector → Pinecone for faster vector search
- Test with mock adapters (fast, isolated tests)
- Support multiple backends simultaneously

### Unified Messaging Architecture

Instead of separate Email and WhatsApp features, Kairo provides a **unified messaging interface**:

**Frontend:** Single `/messages` route showing all channels
**Backend:** Separate channel services orchestrated by `MessagingService`
**Database:** Channel-specific tables + unified views for querying

```typescript
// types/messaging.ts - Discriminated union for type safety

interface BaseMessage {
  id: string
  contactId: string
  direction: 'inbound' | 'outbound'
  timestamp: Date
  status: MessageStatus
}

interface EmailMessage extends BaseMessage {
  channel: 'email'
  subject: string
  body: string
  attachments?: Attachment[]
}

interface WhatsAppMessage extends BaseMessage {
  channel: 'whatsapp'
  messageText: string
  mediaUrl?: string
}

type Message = EmailMessage | WhatsAppMessage  // Type-safe!
```

**Conversation View:**
- See all emails + WhatsApp messages with a contact in one timeline
- Compose new message and choose channel dynamically
- Future channels (SMS, Slack) plug in seamlessly

## Key Features

### 1. Type-Safe API with tRPC

**Zero code generation, full type safety from DB to UI:**

```typescript
// Backend: apps/web/src/server/routers/contacts.ts
export const contactsRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.contacts.findMany({
        where: eq(contacts.user_id, ctx.user.id),
        limit: input.limit,
      });
    }),

  create: protectedProcedure
    .input(createContactSchema)
    .mutation(async ({ ctx, input }) => {
      const contact = await ctx.db.insert(contacts).values({
        ...input,
        user_id: ctx.user.id,
      }).returning();
      return contact[0];
    }),
});

// Frontend: Automatically typed!
const { data: contacts } = trpc.contacts.list.useQuery({ search: 'John' });
//    ^? Contact[] - TypeScript knows the exact type!
```

### 2. Semantic Search with pgvector

**Natural language search across all data:**

```typescript
// User searches: "3 bedroom houses under $500k in Austin"
// 1. Generate embedding for query
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: query,
});

// 2. Vector similarity search
const results = await db.execute(sql`
  SELECT e.content_id, e.content_type,
         1 - (e.embedding <=> ${embedding}::vector) as similarity
  FROM embeddings e
  WHERE e.user_id = ${userId}
    AND 1 - (e.embedding <=> ${embedding}::vector) > 0.7
  ORDER BY similarity DESC
  LIMIT 10
`);

// Returns: Relevant properties, contacts, documents across your entire CRM
```

### 3. AI Chat Assistant

**Chat with your CRM data:**

```typescript
// User: "Show me all high-value deals closing this month"
// AI queries the database and responds with structured data
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are a real estate CRM assistant...' },
    { role: 'user', content: userMessage },
  ],
  functions: [
    // Function calling to query CRM data
    { name: 'searchDeals', parameters: {...} },
    { name: 'searchContacts', parameters: {...} },
  ],
});
```

### 4. Command Palette (Cmd+K)

**Navigate anywhere instantly:**

```typescript
// Cmd+K opens:
// - "New Contact" → Opens create dialog
// - "Search properties in Austin" → Semantic search
// - "Show deals" → Navigate to deals page
// - "Email John Smith" → Compose email
// - "Ask AI about..." → Opens AI chat
```

### 5. Real-time Collaboration (Future)

**Supabase Realtime for team features:**

```typescript
// Listen to changes in deals
supabase
  .channel('deals')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'deals',
  }, (payload) => {
    // Update UI in real-time
  })
  .subscribe();
```

## Development Workflow

### Local Development

```bash
# 1. Clone and install
git clone <repo>
cd kairo
pnpm install

# 2. Set up Supabase
cp .env.example .env.local
# Add Supabase credentials to .env.local

# 3. Run database migrations
pnpm db:migrate

# 4. Start dev server
pnpm dev

# App runs at http://localhost:3000
```

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-key

# Resend (Email)
RESEND_API_KEY=your-resend-key

# WhatsApp Business API
WHATSAPP_API_KEY=your-whatsapp-key
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deployment

### Vercel (Recommended)

```bash
# 1. Connect GitHub repo to Vercel
# 2. Add environment variables
# 3. Deploy
vercel --prod

# Automatic deployments on git push
# Preview deployments for PRs
# Edge functions for tRPC routes
```

### Supabase

```bash
# 1. Create project at supabase.com
# 2. Link local project
supabase link --project-ref your-project-ref

# 3. Push migrations
supabase db push

# 4. Deploy edge functions
supabase functions deploy
```

## MVP Roadmap (5-6 months)

### Phase 1: Foundation (Weeks 1-4)
- ✅ Project setup (Next.js + TypeScript + Tailwind)
- ✅ Supabase setup (database + auth)
- ✅ tRPC setup (type-safe APIs)
- ✅ UI components (shadcn/ui)
- ✅ Authentication (login/signup)
- ✅ Basic dashboard layout

### Phase 2: Core CRM (Weeks 5-10)
- ✅ Contacts CRUD
- ✅ Properties CRUD
- ✅ Deals pipeline
- ✅ Activities timeline
- ✅ Search & filters
- ✅ Dashboard with stats

### Phase 3: Documents (Weeks 11-13)
- ✅ File upload to Supabase Storage
- ✅ Document viewer (PDF, images)
- ✅ Link documents to contacts/properties
- ✅ Basic search by filename
- ✅ Organize by folders/tags

### Phase 4: Unified Messaging (Weeks 14-17)
- ✅ Unified messaging architecture (email + WhatsApp combined)
- ✅ Email integration (Gmail/Outlook sync)
- ✅ WhatsApp Business API integration
- ✅ Conversation view (all channels per contact)
- ✅ Unified composer with channel selector
- ✅ Message templates for both channels
- ✅ Real-time message status updates

### Phase 5: Intelligence (Weeks 18-22)
- ✅ OpenAI integration
- ✅ Generate embeddings for all content
- ✅ Semantic search across CRM
- ✅ AI chat assistant
- ✅ AI-powered suggestions
- ✅ Email draft generation

### Phase 6: Polish & Launch (Weeks 23-26)
- ✅ Mobile responsive design
- ✅ PWA setup (installable)
- ✅ Performance optimization
- ✅ Error handling & logging
- ✅ E2E tests
- ✅ Documentation
- ✅ Beta launch

## Future Enhancements (Post V1)

### Mobile App (3-4 months)
- React Native app
- Share types with web
- Native camera for property photos
- Push notifications

### Advanced Features
- Team collaboration & permissions
- Custom fields & workflows
- Advanced reporting & analytics
- Zapier/Make.com integrations
- Calendar sync (Google Cal, Outlook)
- SMS channel (add to unified messaging)
- Slack channel (add to unified messaging)
- E-signature integration (DocuSign)
- Transaction management
- Commission tracking
- Voice call logging (add to unified messaging)

### Enterprise Features
- Multi-user accounts
- Role-based access control (RBAC)
- Audit logs
- SSO (SAML)
- White-label options
- On-premise deployment option

## Performance Targets

- **First load**: < 2s
- **Time to Interactive**: < 3s
- **Lighthouse score**: 90+
- **Database queries**: < 100ms (with indexes)
- **Vector search**: < 200ms (with proper indexes)
- **API response**: < 200ms (tRPC on Edge)

## Security

- **Authentication**: Supabase Auth (JWT-based)
- **Authorization**: Row Level Security (RLS) in PostgreSQL
- **Data encryption**: At rest (Supabase) and in transit (HTTPS)
- **API keys**: Stored in environment variables
- **File uploads**: Validated & scanned
- **Rate limiting**: Vercel + Supabase built-in
- **SQL injection**: Protected by Drizzle ORM
- **XSS**: React escapes by default

## Cost Estimates (Monthly)

### Starting Out (< 100 users)
- Vercel: $0 (Hobby) or $20 (Pro)
- Supabase: $0 (Free tier)
- OpenAI: ~$50-100 (embeddings + chat)
- Resend: $0 (Free tier 3k emails)
- WhatsApp Business: ~$50-100
- **Total: ~$100-200/month**

### Growing (100-1000 users)
- Vercel: $20 (Pro)
- Supabase: $25 (Pro)
- OpenAI: ~$200-500
- Resend: $20 (10k emails)
- WhatsApp Business: ~$100-200
- **Total: ~$365-765/month**

## Why This Stack?

1. **TypeScript everywhere**: Type safety from database to UI
2. **Fast development**: Next.js + tRPC = rapid iteration
3. **Scalable**: Handles 1 user or 10,000 users
4. **Great DX**: Hot reload, error messages, autocomplete
5. **Modern**: Uses latest React patterns (Server Components)
6. **Maintainable**: Clear structure, well-documented
7. **Cost-effective**: Free tier to start, scales with revenue
8. **Mobile-ready**: Responsive + PWA + future React Native

## Next Steps

1. ✅ Initialize Next.js project with TypeScript
2. ✅ Set up Supabase project
3. ✅ Configure tRPC
4. ✅ Install shadcn/ui
5. ✅ Create database schema
6. ✅ Build authentication
7. ✅ Create first feature (Contacts)

Ready to build the "OS for Real Estate"? Let's start coding.
