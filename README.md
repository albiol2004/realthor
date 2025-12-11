# Realthor - Real Estate CRM

> The operating system for real estate professionals

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![GitHub Issues](https://img.shields.io/github/issues/albiol2004/kairo.svg)](https://github.com/albiol2004/realthor/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/albiol2004/kairo.svg)](https://github.com/albiol2004/realthor/pulls)
[![License](https://img.shields.io/badge/license-proprietary-blue.svg)](/LICENSE)

---

## Quick Start

### For Developers

```bash
# Clone the repository
git clone https://github.com/albiol2004/realthor.git
cd realthor

# Install dependencies
pnpm install

# Set up environment
cp apps/web/.env.example apps/web/.env
# Edit .env with your Supabase credentials

# Start development server
cd apps/web
pnpm dev
```

** Full Setup Guide:** See [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)

---

## Documentation

| Document | Description |
|----------|-------------|
| [QUICK_START.md](./QUICK_START.md) |  Essential commands for daily development |
| [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) | Complete development guide and Git workflow |
| [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) | Security audit and best practices |
| [CLAUDE.md](./CLAUDE.md) | AI assistant guide and architecture |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | Detailed project structure |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment and CI/CD guide |
| [CHANGELOG.md](./CHANGELOG.md) | Version history and changes |
| [MVP_FEATURES.md](./MVP_FEATURES.md) | MVP feature scope |

---

## Tech Stack

- **Frontend:** Next.js 16, React, TypeScript, Tailwind CSS
- **Backend:** tRPC, Supabase (PostgreSQL + Auth + Storage)
- **AI:** DeepSeek
- **Deployment:** VPS, nginx + Node
- **Testing:** Playwright, Vitest

---

## Git Workflow

```
main (production)    → Deployed to alejandrogarcia.blog/realthor/
  ↓
develop (staging)    → Deployed to VPS Develop
  ↓
feature/* (work)     → Local development
```

**Daily Workflow:**
1. Create feature branch from `develop`
2. Make changes and test locally
3. Push and create PR to `develop`
4. Merge to `develop` for preview
5. Merge `develop` to `main` for production

** See:** [QUICK_START.md](./QUICK_START.md) for commands

---

##  Project Structure

```
realthor/
├── apps/
│   └── web/                 # Next.js application
│       ├── src/
│       │   ├── app/         # Next.js App Router
│       │   ├── components/  # React components
│       │   ├── lib/         # Utilities and adapters
│       │   └── server/      # Server-side code (tRPC, services)
│       └── public/          # Static assets
├── packages/                # Shared packages (future)
├── supabase/               # Database migrations and email templates
├── scripts/                # Utility scripts
└── docs/                   # Additional documentation
```

---

## Security

**Status:** SECURE

- No secrets in git history
- Proper environment variable handling
- Client/server separation enforced
- Row Level Security (RLS) enabled
- Email verification required

**Full Audit:** [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)

---

## Current Status

**Version:** 0.2.0
**Phase:** 1 - Foundation Complete

**Recent Updates:**
- Authentication flow with email verification
- Production deployment on Vercel
- Security audit completed
- Development workflow established
- Realthor-branded email templates

**Next Phase:** Core CRM (Contacts, Properties, Deals)

---

## MVP Features

1. **Home Page** - AI-prioritized task list and command bar
2. **CRM** - Contact list, unified messages, timeline, deals
3. **Property Workspace** - Property management and buyer matching
4. **Compliance** - Document tracking and reminders
5. **Social** - Lead capture from Instagram/Facebook
6. **Client Portal** - Deal progress and document upload

**Full Scope:** [MVP_FEATURES.md](./MVP_FEATURES.md)

---

## Contributing

### Development Process

1. **Fork & Clone** (for external contributors)
2. **Create Feature Branch** from `develop`
3. **Make Changes** with tests
4. **Test Locally** (`pnpm type-check && pnpm build`)
5. **Create PR** to `develop` branch
6. **Code Review** and approval
7. **Merge** to `develop`

---

## Support

- **Issues:** [GitHub Issues](https://github.com/albiol2004/realthor/issues)
- **Discussions:** [GitHub Discussions](https://github.com/albiol2004/realthor/discussions)
- **Email:** support@realthor.app (coming soon)

---

## License

To be determined.

---

## Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend platform
- [tRPC](https://trpc.io/) - Type-safe APIs
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Vercel](https://vercel.com/) - Deployment platform
- [Claude Code](https://claude.com/claude-code) - AI development assistant

---

**Built with ❤️ for real estate professionals**

**Repository:** https://github.com/albiol2004/realthor/
**Production:** https://alejandrogarcia.blog/realthor/
