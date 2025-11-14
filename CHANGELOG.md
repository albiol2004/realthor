# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2025-11-14

### Added - Stripe Payment Integration (Phase D)

#### Payment Infrastructure
- **Stripe SDK Integration:** Installed stripe and @stripe/stripe-js packages
  - Server-side Stripe SDK for backend operations
  - Client-side Stripe.js for secure checkout
  - Type-safe payment processing throughout

- **Pricing Configuration:** Centralized pricing plans (`lib/config/pricing.ts`)
  - Two tiers: Standard and Professional
  - Three billing cycles: Monthly, Quarterly (3-month), Yearly
  - Standard: $99/mo, $270/3mo (9% savings), $999.98/yr (16% savings)
  - Professional: $199/mo, $540/3mo (10% savings), $1,999/yr (17% savings)
  - Helper functions: `getPlansByTier()`, `getPlanByPriceId()`, `formatBillingCycle()`

- **Payment Adapter Pattern:** Swappable payment provider (`lib/adapters/payment/`)
  - Interface definition with checkout, portal, webhook methods
  - Stripe implementation: `StripePaymentAdapter`
  - Service provider integration: `ServiceProvider.payment`
  - Ready to swap Stripe for other providers (PayPal, Square, etc.)

- **Payment Service Layer:** Business logic (`server/services/payment.service.ts`)
  - `createCheckoutSession()` - Generate Stripe Checkout URL
  - `createCustomerPortal()` - Access Stripe Customer Portal
  - `handleWebhookEvent()` - Process Stripe webhooks
  - Automatic subscription activation on successful payment
  - Webhook handlers for all subscription lifecycle events:
    - checkout.session.completed
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.payment_succeeded
    - invoice.payment_failed

- **API Endpoints:** tRPC payment router (`server/routers/payment.ts`)
  - `payment.createCheckoutSession` - Start payment flow
  - `payment.createCustomerPortal` - Manage subscription
  - Integrated into main app router

- **Stripe Webhook Handler:** Next.js API route (`app/api/webhooks/stripe/route.ts`)
  - Secure webhook signature verification
  - Raw body parsing for Stripe verification
  - Automatic subscription status updates

#### User Interface

- **Enhanced Subscribe Page:** Two-tier pricing display (`app/(auth)/subscribe/page.tsx`)
  - Side-by-side Standard and Professional plan cards
  - Billing cycle toggle: Monthly, 3 Months, Yearly
  - Real-time price updates based on selection
  - Savings badges (12-17% off)
  - Feature lists for each tier
  - "Get Started" buttons redirect to Stripe Checkout
  - Loading states during checkout session creation
  - Dark mode compatible, fully responsive

- **Success Page:** Post-payment confirmation (`app/(auth)/subscribe/success/page.tsx`)
  - Checkout session verification
  - Success message with next steps
  - Auto-redirect to dashboard (5 second countdown)
  - Quick access to subscription management
  - Welcome message for new subscribers

- **Cancel Page:** Checkout cancellation (`app/(auth)/subscribe/cancel/page.tsx`)
  - Friendly cancellation message
  - "Try Again" button to restart checkout
  - Return to dashboard option
  - Help contact information

- **Subscription Management:** Full-featured settings page (`app/(dashboard)/settings/subscription/page.tsx`)
  - Current plan display with tier, price, billing cycle
  - Subscription status badges (Trial, Active, Expired, Cancelled)
  - Trial countdown (days remaining)
  - Subscription dates (start, renewal/end)
  - "Manage Subscription" button → Opens Stripe Customer Portal
  - Portal allows: Update payment method, change plan, cancel subscription
  - "Upgrade to Pro" button for trial/expired users
  - Billing info section with trust badges
  - Loading states for portal access

- **Badge Component:** New UI component (`components/ui/badge.tsx`)
  - Supports outline, default, secondary, destructive variants
  - Used for subscription status indicators
  - Consistent with shadcn/ui design system

#### API Protection & Security

- **tRPC Subscription Procedure:** New middleware (`lib/trpc/server.ts`)
  - `subscribedProcedure` - Requires auth AND active subscription
  - Checks subscription status on every API call
  - Prevents cached API access after subscription expiry
  - Throws FORBIDDEN error if subscription expired
  - Ready for use in feature routers (CRM, properties, etc.)
  - Payment/subscription routers use `protectedProcedure` (auth only)

- **Server tRPC Exports:** Convenient import path (`server/trpc.ts`)
  - Re-exports all tRPC utilities for server-side code
  - Shorter import: `@/server/trpc` instead of `@/lib/trpc/server`

#### Configuration & Documentation

- **Environment Variables:** Updated `.env.example`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Client-side Stripe key
  - `STRIPE_SECRET_KEY` - Server-side Stripe key
  - `STRIPE_WEBHOOK_SECRET` - Webhook signature verification

- **Pricing Plans:** All 6 plans configured in Stripe
  - Standard Monthly, Quarterly, Yearly
  - Professional Monthly, Quarterly, Yearly
  - Price IDs mapped in `pricing.ts`

### Changed
- Subscribe page: Single plan → Two-tier pricing with 3 billing cycles
- Settings subscription page: Placeholder → Full management UI
- tRPC procedures: Added `subscribedProcedure` for API-level subscription checks
- Middleware: Now complemented by API-level subscription validation

### Fixed
- **Subscription Bypass Issue:** Users could access dashboard via API calls even after trial expiration
  - Root cause: Middleware only checked on page navigation
  - Solution: Added `subscribedProcedure` to validate subscription on every tRPC call
  - Impact: Complete subscription enforcement at both middleware and API layers

### Technical Details
- **Architecture:** Adapter pattern allows swapping Stripe for other payment providers
- **Type Safety:** End-to-end TypeScript from Stripe events to UI
- **Security:** Webhook signature verification, secure API routes
- **Performance:** Efficient database queries for subscription checks
- **Error Handling:** Fail-open strategy for middleware, explicit errors for API
- **Testing:** Ready for test mode transactions with Stripe test keys

### Deployment Notes

**Required Environment Variables:**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... # Get this after deploying webhook endpoint
```

**Webhook Setup (After Deployment):**
1. Deploy application to production
2. In Stripe Dashboard → Developers → Webhooks
3. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
5. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

**Stripe Product Setup:**
- Products created in Stripe Dashboard (Test mode)
- Price IDs configured in `pricing.ts`
- Prebuilt Checkout Page selected for fast, secure payments

### Phase Status
**Phase 1: Foundation** - ✅ Complete
- ✅ Authentication with 7-day free trials
- ✅ Subscription system with database backend
- ✅ Subscription enforcement at middleware level
- ✅ **Stripe payment integration (Phase D)**
- ✅ **Two-tier pricing (Standard & Professional)**
- ✅ **Stripe Checkout flow**
- ✅ **Webhook handling for automatic subscription updates**
- ✅ **Stripe Customer Portal for subscription management**
- ✅ **API-level subscription validation**

**Next: Phase 2** - Core CRM Features
- Contacts CRUD with subscribed procedure protection
- Properties management
- Deals pipeline
- All feature endpoints will use `subscribedProcedure`

## [0.5.0] - 2025-11-13

### Added - Subscription Enforcement Middleware (Phase C)

#### Subscription Access Control
- **Middleware Enhancement:** Updated proxy middleware to enforce subscription status (`lib/supabase/middleware.ts`)
  - Checks subscription status for all protected routes
  - Redirects to /subscribe if trial expired or no active subscription
  - Public paths: /login, /signup, /subscribe, /verify-email, /auth/callback, /
  - API paths bypassed: /api/*, /_next/*, /favicon.ico
  - Fail-open strategy: On error, allow access to prevent lockout

- **Subscribe Page:** Beautiful pricing page (`app/(auth)/subscribe/page.tsx`)
  - Monthly ($29/mo) and Yearly ($290/yr, 17% savings) plans
  - Billing cycle toggle with visual feedback
  - Feature list: Unlimited contacts, AI prioritization, unified messaging, etc.
  - "Subscribe Now" button (Phase D: Stripe integration)
  - Purple accent for subscription UI
  - Trust badges and security messaging
  - Responsive design with dark mode support

- **Settings Hub:** Improved settings page (`app/(dashboard)/settings/page.tsx`)
  - Card-based layout for different settings sections
  - Profile, Subscription, Notifications, Integrations, Security
  - "Manage" button for Subscription (available)
  - "Coming Soon" badges for other sections
  - Consistent black/white styling

#### Access Control Flow
1. User authenticated → Check subscription status
2. Trial active (< 7 days) → Allow access
3. Paid subscription active → Allow access
4. Trial expired or no subscription → Redirect to /subscribe
5. User can only access /subscribe, /login, /signup when expired

### Changed
- Middleware now enforces subscription-based access control
- All dashboard routes require active subscription or trial
- Settings page redesigned with card layout

### Technical Details
- Type-safe subscription checking in middleware
- Database query optimization for subscription lookups
- Error handling with fail-open strategy
- Build: ✅ Type check passed (7.3s), ✅ Build successful (24s)
- 20 routes compiled (added /subscribe)

### Phase Status
**Phase 1: Foundation** - ✅ Complete
- ✅ Subscription system with 7-day trials
- ✅ Subscription enforcement via middleware
- ✅ Pricing page ready for Stripe
- ✅ Access control fully functional

**Next: Phase D** - Stripe Payment Integration
- Stripe checkout flow
- Webhook handling for payment events
- Customer portal for subscription management
- Payment success/failure pages

## [0.4.0] - 2025-11-13

### Added - Subscription System & Navigation Sidebars (Phase A + B)

#### Phase A: Subscription Backend - 7-Day Free Trial System
- **Database:** New `subscriptions` table with full subscription lifecycle management
  - Auto-created 7-day trial on user signup
  - Tracks trial/active/expired/cancelled states
  - Stripe integration fields (customer_id, subscription_id, plan details)
  - RLS policies for secure user-only access
  - Migration: `supabase/migrations/20250113_subscriptions.sql`

- **Type System:** Complete TypeScript definitions (`types/subscription.ts`)
  - `SubscriptionStatus`, `PlanType`, `Subscription` interface
  - Helper functions: `hasActiveAccess()`, `getDaysRemaining()`, `isTrialExpired()`
  - Full type safety from database to UI

- **Repository Layer:** Data access for subscriptions (`server/repositories/subscription.repository.ts`)
  - CRUD operations with admin client for RLS bypass
  - Lookup by user ID or Stripe customer ID

- **Service Layer:** Business logic (`server/services/subscription.service.ts`)
  - Trial creation, status checking, activation, cancellation, renewal

- **API Layer:** tRPC subscription router (`server/routers/subscription.ts`)
  - Type-safe endpoints: getSubscription, checkStatus, createTrial, etc.
  - Integrated into main app router

- **Auth Integration:** Trial auto-creation on signup
  - Both agent and company signups now create 7-day trial automatically
  - Non-blocking: signup succeeds even if subscription fails

#### Phase B: Navigation Sidebars - Complete UI Navigation
- **Left Sidebar:** Main navigation (`components/layout/left-sidebar.tsx`)
  - Dashboard, CRM, Properties, Compliance, Social, Client Portal
  - Active state highlighting, hover descriptions
  - Sticky positioning, dark mode compatible

- **Right Sidebar:** User profile & subscription (`components/layout/right-sidebar.tsx`)
  - User avatar with initials
  - Real-time subscription status (trial days remaining/active plan/expired)
  - Navigation: Settings, Subscription, Contact Us
  - Sign out functionality

- **Layout Update:** Three-column layout (`app/(dashboard)/layout.tsx`)
  - Left sidebar (256px) + Main content (flex) + Right sidebar (256px)
  - Responsive scrolling

- **Placeholder Pages:** All MVP sections created
  - `/crm`, `/properties`, `/compliance`, `/social`, `/client-portal`
  - `/contact`, `/settings/subscription`
  - Consistent "Coming Soon" styling

### Changed
- Dashboard layout: Single column → Three-column with sidebars
- User navigation: No nav → Full MVP section navigation
- Types index: Now exports subscription types

### Technical Details
- Backend: Service-Repository pattern, admin clients for RLS bypass
- Frontend: React hooks + tRPC for real-time subscription status
- Styling: Black/white minimalist design throughout
- Build: ✅ Type check passed, ✅ Build successful (18.6s)
- 19 routes compiled successfully

### Phase Status
**Phase 1: Foundation** - ✅ Complete
- ✅ Authentication + 7-day trial subscription system
- ✅ Left & right sidebars with full navigation
- ✅ All MVP placeholder pages
- ✅ Subscription backend ready for Stripe (Phase C+D)

**Next: Phase C+D** - Subscription Enforcement & Stripe Integration

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
