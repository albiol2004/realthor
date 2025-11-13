# Development Workflow Guide - Kairo

> **Complete guide for development environment setup and Git workflow**

---

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Git Branching Strategy](#git-branching-strategy)
3. [Development Workflow](#development-workflow)
4. [Testing Before Deployment](#testing-before-deployment)
5. [Deployment Process](#deployment-process)
6. [Common Commands](#common-commands)
7. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites

- **Node.js:** v18+ (check with `node --version`)
- **pnpm:** v8+ (install with `npm install -g pnpm`)
- **Git:** Latest version
- **Supabase Account:** Free tier is fine

### Step 1: Clone the Repository

```bash
# Clone the repo
git clone https://github.com/albiol2004/kairo.git
cd kairo
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
pnpm install
```

### Step 3: Set Up Environment Variables

```bash
# Copy the example file
cp apps/web/.env.example apps/web/.env

# Edit the file with your local Supabase credentials
nano apps/web/.env
```

**Required Variables:**
```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Supabase (get these from https://app.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

**Where to find Supabase credentials:**
1. Go to https://app.supabase.com/project/your-project/settings/api
2. Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy service_role secret key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ NEVER commit this!)

### Step 4: Apply Database Migrations

```bash
# Go to Supabase SQL Editor
# https://app.supabase.com/project/your-project/sql/new

# Run these migrations in order:
# 1. supabase/migrations/20250112_rls_policies.sql
# 2. supabase/migrations/20250113_remove_unique_constraints.sql
```

### Step 5: Start Development Server

```bash
# Start the dev server
cd apps/web
pnpm dev

# Open http://localhost:3000
```

### Step 6: Verify Setup

✅ Visit http://localhost:3000
✅ Sign up with a test email
✅ Check email verification works
✅ Login successfully

---

## Git Branching Strategy

### Branch Structure

```
main (production)
  ↓
develop (staging/preview)
  ↓
feature/feature-name (your work)
```

### Branch Purposes

| Branch | Purpose | Protected | Deploy Target |
|--------|---------|-----------|---------------|
| `main` | Production-ready code | ✅ Yes | Vercel Production |
| `develop` | Integration branch | ✅ Yes | Vercel Preview |
| `feature/*` | New features | ❌ No | Local only |
| `fix/*` | Bug fixes | ❌ No | Local only |
| `hotfix/*` | Emergency fixes | ❌ No | Direct to main |

### Branch Naming Conventions

```bash
feature/auth-improvements      # New feature
feature/add-crm-contacts      # New feature
fix/signup-email-bug          # Bug fix
fix/trpc-production-error     # Bug fix
hotfix/critical-security      # Emergency fix
chore/update-dependencies     # Maintenance
docs/api-documentation        # Documentation
```

---

## Development Workflow

### Initial Setup (First Time Only)

```bash
# 1. Clone and setup (as shown above)
git clone https://github.com/albiol2004/kairo.git
cd kairo
pnpm install
cp apps/web/.env.example apps/web/.env
# Configure .env with your credentials

# 2. Create and switch to develop branch
git checkout -b develop
git push -u origin develop
```

### Daily Development Workflow

#### Step 1: Start with Latest Code

```bash
# Always start from develop branch
git checkout develop

# Pull latest changes
git pull origin develop
```

#### Step 2: Create Feature Branch

```bash
# Create a new branch for your feature
git checkout -b feature/add-property-listing

# Or for a bug fix
git checkout -b fix/dashboard-loading-error
```

#### Step 3: Make Your Changes

```bash
# Work on your feature
# Edit files, test locally

# Start dev server
cd apps/web
pnpm dev
```

#### Step 4: Test Locally

```bash
# Run type checking
pnpm type-check

# Run tests (when available)
pnpm test

# Build to ensure no build errors
pnpm build
```

#### Step 5: Commit Your Changes

```bash
# Check what changed
git status

# Add files
git add apps/web/src/components/property-list.tsx
git add apps/web/src/app/(dashboard)/properties/page.tsx

# Or add all changes
git add .

# Commit with descriptive message
git commit -m "feat: add property listing page with filters

- Created PropertyList component
- Added property detail view
- Implemented search and filters
- Added pagination

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Commit Message Format:**
```
type: short description

- Detail 1
- Detail 2
- Detail 3

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

#### Step 6: Push to Remote

```bash
# Push your feature branch
git push origin feature/add-property-listing

# If first time pushing this branch
git push -u origin feature/add-property-listing
```

#### Step 7: Create Pull Request to `develop`

```bash
# Go to GitHub
# https://github.com/albiol2004/kairo/compare

# 1. Set base: develop (NOT main!)
# 2. Set compare: feature/add-property-listing
# 3. Click "Create Pull Request"
# 4. Fill in description
# 5. Request review (if team members)
# 6. Merge when ready
```

#### Step 8: Merge to `develop`

```bash
# After PR is approved on GitHub, merge it

# Then locally, update develop branch
git checkout develop
git pull origin develop

# Delete feature branch (optional)
git branch -d feature/add-property-listing
git push origin --delete feature/add-property-listing
```

#### Step 9: Test on Preview Deployment

```bash
# Vercel automatically deploys `develop` branch to preview URL
# Test your changes at: https://kairo-git-develop-yourname.vercel.app
```

#### Step 10: Deploy to Production

**Only when ready for production:**

```bash
# 1. Ensure develop is stable and tested
git checkout develop
git pull origin develop

# 2. Merge develop into main
git checkout main
git pull origin main
git merge develop

# 3. Push to production
git push origin main

# 4. Vercel automatically deploys to production
```

---

## Testing Before Deployment

### Pre-Commit Checklist

Before committing, always check:

```bash
# 1. Type check
cd apps/web
pnpm type-check

# 2. Lint
pnpm lint

# 3. Build
pnpm build

# 4. Test locally
pnpm dev
# Manually test your changes
```

### Pre-Merge Checklist

Before merging to `develop`:

- [ ] Code builds without errors
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Feature works as expected
- [ ] No breaking changes
- [ ] Environment variables documented
- [ ] Database migrations included
- [ ] Documentation updated

### Pre-Production Checklist

Before merging `develop` → `main`:

- [ ] All features tested on preview deployment
- [ ] No bugs or errors
- [ ] Performance is acceptable
- [ ] Security audit passed
- [ ] Database migrations applied to production
- [ ] Environment variables set in Vercel
- [ ] Rollback plan ready

---

## Deployment Process

### Automatic Deployments (Vercel)

Vercel automatically deploys:
- **Production:** `main` branch → https://kairo.vercel.app
- **Preview:** `develop` branch → https://kairo-git-develop.vercel.app
- **Feature:** Any PR → unique preview URL

### Manual Deployment (if needed)

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Environment Variables on Vercel

1. Go to https://vercel.com/yourname/kairo/settings/environment-variables
2. Add variables for:
   - `Production` (main branch)
   - `Preview` (develop branch)
   - `Development` (feature branches)

**Required Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Common Commands

### Git Commands

```bash
# === Branch Management ===

# See all branches
git branch -a

# Create new branch
git checkout -b feature/new-feature

# Switch branches
git checkout develop
git checkout main

# Delete local branch
git branch -d feature/old-feature

# Delete remote branch
git push origin --delete feature/old-feature

# === Syncing ===

# Pull latest changes
git pull origin develop

# Pull and rebase
git pull --rebase origin develop

# Fetch all branches
git fetch --all

# === Committing ===

# Stage all changes
git add .

# Stage specific files
git add file1.ts file2.tsx

# Commit
git commit -m "feat: description"

# Amend last commit
git commit --amend

# === Pushing ===

# Push current branch
git push

# Push with upstream
git push -u origin feature/branch-name

# Force push (⚠️ dangerous)
git push --force

# === History ===

# View commit history
git log --oneline

# View file changes
git diff

# View changes in staging
git diff --staged

# === Undoing ===

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Discard local changes
git checkout -- file.ts
git restore file.ts

# Discard all local changes
git reset --hard
```

### Development Commands

```bash
# === Installation ===
pnpm install                    # Install dependencies
pnpm add package-name          # Add package
pnpm add -D package-name       # Add dev package

# === Development ===
pnpm dev                       # Start dev server
pnpm build                     # Build for production
pnpm start                     # Start production server
pnpm type-check                # Check TypeScript
pnpm lint                      # Lint code
pnpm format                    # Format with Prettier

# === Database ===
pnpm db:migrate                # Run migrations
pnpm db:generate               # Generate types

# === Testing (when setup) ===
pnpm test                      # Run unit tests
pnpm test:e2e                  # Run E2E tests
pnpm test:integration          # Run integration tests
```

---

## Troubleshooting

### Issue: Merge Conflicts

```bash
# When you see merge conflicts

# 1. Check conflicted files
git status

# 2. Open files and resolve conflicts
#    Look for <<<<<<, ======, >>>>>> markers

# 3. Mark as resolved
git add resolved-file.ts

# 4. Complete merge
git commit -m "fix: resolve merge conflicts"

# 5. Push
git push
```

### Issue: Accidentally Committed to `main`

```bash
# If you haven't pushed yet

# 1. Move commit to new branch
git branch feature/accidental-work
git reset --hard origin/main
git checkout feature/accidental-work

# If you already pushed (⚠️ dangerous)
# Contact team lead before force pushing to main
```

### Issue: Need to Undo Last Commit

```bash
# Keep changes in working directory
git reset --soft HEAD~1

# Discard changes completely
git reset --hard HEAD~1

# Undo and create new commit
git revert HEAD
```

### Issue: Out of Sync with Remote

```bash
# Fetch all changes
git fetch --all

# Reset to remote state (⚠️ discards local changes)
git reset --hard origin/develop
```

### Issue: Need to Update Feature Branch

```bash
# Your feature branch is behind develop

# Option 1: Merge (keeps history)
git checkout feature/your-branch
git merge develop

# Option 2: Rebase (cleaner history)
git checkout feature/your-branch
git rebase develop
```

---

## Quick Reference: Complete Workflow

```bash
# === START NEW FEATURE ===
git checkout develop
git pull origin develop
git checkout -b feature/awesome-feature

# === WORK ON FEATURE ===
# Make changes
pnpm dev              # Test locally
pnpm type-check       # Check types
pnpm build            # Ensure builds

# === COMMIT & PUSH ===
git add .
git commit -m "feat: awesome feature"
git push -u origin feature/awesome-feature

# === CREATE PR ===
# Go to GitHub, create PR: feature/awesome-feature → develop

# === AFTER MERGE ===
git checkout develop
git pull origin develop
git branch -d feature/awesome-feature

# === DEPLOY TO PRODUCTION (when ready) ===
git checkout main
git pull origin main
git merge develop
git push origin main  # Vercel auto-deploys
```

---

## Best Practices

### ✅ DO:

- Always work in feature branches
- Commit often with clear messages
- Pull latest `develop` before creating new branch
- Test locally before pushing
- Use descriptive branch names
- Keep commits focused and atomic
- Review your own code before pushing

### ❌ DON'T:

- Never commit directly to `main`
- Never commit `.env` files
- Never force push to `main` or `develop`
- Don't push broken code
- Don't commit large files
- Don't mix multiple features in one commit
- Don't skip testing

---

## Team Collaboration

### Code Review Process

1. Create PR with description
2. Assign reviewers (if applicable)
3. Address review comments
4. Get approval
5. Merge to `develop`

### Communication

- Use PR descriptions to explain changes
- Link to related issues/tickets
- Document breaking changes
- Update CHANGELOG.md
- Notify team of major changes

---

## Additional Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Vercel Deployment Docs](https://vercel.com/docs)

---

**Last Updated:** 2025-11-13
**Version:** 1.0.0
