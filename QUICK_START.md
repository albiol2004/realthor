# Quick Start Guide - Development Workflow

> **TL;DR:** Essential commands for daily development

---

## 🚀 Start New Feature

```bash
# 1. Get latest code
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Start development
cd apps/web
pnpm dev
```

---

## 💾 Save Your Work

```bash
# 1. Check what changed
git status

# 2. Add all changes
git add .

# 3. Commit with message
git commit -m "feat: description of what you did"

# 4. Push to GitHub
git push -u origin feature/your-feature-name
```

---

## 🔄 Create Pull Request

1. Go to: https://github.com/albiol2004/kairo
2. Click **"Compare & pull request"**
3. Set **base: develop** ← **compare: feature/your-feature-name**
4. Add description
5. Click **"Create pull request"**
6. Click **"Merge pull request"** when ready

---

## 🎯 Deploy to Production

```bash
# Only when develop is tested and ready!

# 1. Switch to main
git checkout main
git pull origin main

# 2. Merge develop into main
git merge develop

# 3. Push (Vercel auto-deploys)
git push origin main
```

---

## 🧪 Before Pushing

Always run these:

```bash
cd apps/web

# Check types
pnpm type-check

# Build to ensure no errors
pnpm build
```

---

## 📋 Branch Names

```bash
feature/add-property-listings    # New feature
fix/signup-error                 # Bug fix
hotfix/critical-security-fix     # Emergency
docs/update-readme               # Documentation
```

---

## 🆘 Common Issues

### Merge Conflict

```bash
# 1. Open conflicted files
# 2. Look for <<<<<<, ======, >>>>>>
# 3. Fix conflicts manually
# 4. Save files

# 5. Mark as resolved
git add .
git commit -m "fix: resolve conflicts"
git push
```

### Need Latest Changes from develop

```bash
git checkout feature/your-branch
git merge develop
```

### Undo Last Commit (keep changes)

```bash
git reset --soft HEAD~1
```

---

## 📖 Full Documentation

- **Complete Guide:** See `DEVELOPMENT_WORKFLOW.md`
- **Security:** See `SECURITY_AUDIT.md`
- **Deployment:** See `DEPLOYMENT.md`
- **Project Info:** See `CLAUDE.md`

---

## 🎯 Daily Workflow

**Morning:**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/todays-work
```

**During Work:**
```bash
# Make changes, test locally
pnpm dev

# Commit frequently
git add .
git commit -m "feat: description"
```

**End of Day:**
```bash
# Push your work
git push -u origin feature/todays-work

# Create PR if ready
# Go to GitHub and create PR to develop
```

---

## ✅ Remember

- ✅ Always create feature branches from `develop`
- ✅ Test locally before pushing
- ✅ Merge to `develop` first (not `main`)
- ✅ Only merge `develop` → `main` for production
- ❌ Never commit directly to `main`
- ❌ Never commit `.env` files

---

**Need Help?** Check `DEVELOPMENT_WORKFLOW.md` for detailed instructions.
