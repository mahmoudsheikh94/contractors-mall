# 🤖 Automation Guide - Contractors Mall

## Overview

Your platform is now configured for **fully automated deployments**. Every time you push code to GitHub, the following happens automatically:

```
Git Push → GitHub Actions → Deploy to Vercel → Update Supabase → Live! 🎉
```

---

## ⚡ Quick Start (One-Time Setup)

### Option A: Fully Automated (Recommended)

Run this single command to deploy everything:

```bash
./scripts/full-deployment.sh
```

This will:
1. ✅ Push your code to GitHub
2. ✅ Deploy database migrations to Supabase
3. ✅ Deploy both apps to Vercel
4. ✅ Configure automatic deployments

### Option B: Step-by-Step

If you prefer to run each step manually:

#### Step 1: Deploy to Supabase
```bash
./scripts/deploy-supabase.sh
```

#### Step 2: Create Storage Buckets
Visit https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/storage/buckets

Create:
- `delivery-proofs` (Private, 10MB, images only)
- `product-images` (Public, 5MB, images only)
- `dispute-media` (Private, 10MB, images + PDFs)

#### Step 3: Deploy to Vercel
```bash
./scripts/deploy-vercel.sh
```

---

## 🔄 Continuous Deployment (Automatic)

Once initial setup is complete, every push to `main` branch triggers:

### GitHub Actions Workflow

**File**: `.github/workflows/deploy.yml`

**What it does**:
1. 🧪 Runs tests and type checking
2. 🏗️ Builds both apps
3. 📤 Deploys Admin Portal to Vercel
4. 📤 Deploys Web App to Vercel
5. 🗄️ Runs new Supabase migrations
6. ✅ Runs smoke tests
7. 📧 Sends deployment notification

**How to use**:
```bash
# Make changes to your code
git add .
git commit -m "Add new feature"
git push origin main

# GitHub Actions automatically deploys everything!
```

### View Deployment Status

- **GitHub Actions**: https://github.com/mahmoudsheikh94/contractors-mall/actions
- **Vercel Deployments**: https://vercel.com/dashboard
- **Supabase Logs**: https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/logs

---

## 🛠️ Available Scripts

### Deployment Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `full-deployment.sh` | Complete deployment (all-in-one) | `./scripts/full-deployment.sh` |
| `deploy-supabase.sh` | Deploy database only | `./scripts/deploy-supabase.sh` |
| `deploy-vercel.sh` | Deploy apps only | `./scripts/deploy-vercel.sh` |
| `setup-deployment.sh` | Configure GitHub secrets | `./scripts/setup-deployment.sh` |

### Development Scripts

```bash
# Start local development
pnpm dev

# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Run tests
pnpm test

# Build for production
pnpm build:production
```

---

## 🔐 Environment Variables

### Local Development (`.env.local`)
Already configured with your Supabase credentials.

### Vercel Production
Automatically set by `deploy-vercel.sh` script:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### GitHub Secrets
Configure using:
```bash
./scripts/setup-deployment.sh
```

Required secrets:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`
- `VERCEL_TOKEN` (optional for CI/CD)

---

## 📦 Deployment Targets

### Production URLs (After Deployment)

**Admin Portal**: `https://contractors-mall-admin.vercel.app`
- Supplier dashboard
- Product management
- Order fulfillment
- Delivery confirmation

**Web App**: `https://contractors-mall-web.vercel.app`
- Browse products
- Place orders
- Track deliveries
- Manage profile

### Staging/Preview

Vercel automatically creates preview deployments for:
- Pull requests
- Non-main branches

Each preview gets a unique URL like:
`https://contractors-mall-admin-abc123.vercel.app`

---

## 🔍 Monitoring & Debugging

### Check Deployment Status

```bash
# View recent deployments
vercel ls

# View deployment logs
vercel logs <deployment-url>

# Check GitHub Actions
gh run list

# View latest action run
gh run view
```

### Common Issues

#### ❌ Deployment Failed

**Check**:
1. GitHub Actions logs: https://github.com/mahmoudsheikh94/contractors-mall/actions
2. Vercel deployment logs: `vercel logs`
3. Supabase database logs: Dashboard → Logs → Postgres Logs

**Fix**:
```bash
# Redeploy
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

#### ❌ Supabase Migration Failed

**Check**:
- Supabase Dashboard → Logs → Postgres Logs
- Look for SQL errors or constraint violations

**Fix**:
```bash
# Manually run migrations
npx supabase db push

# Or reset and reapply (⚠️ DESTRUCTIVE)
npx supabase db reset
npx supabase db push
```

#### ❌ Environment Variables Missing

**Vercel**:
```bash
# Add missing variable
vercel env add VARIABLE_NAME production

# Trigger redeploy
vercel --prod
```

**GitHub**:
```bash
# Update secret
gh secret set VARIABLE_NAME -b"value"
```

---

## 🚦 Rollback Strategy

### Option 1: Revert via Vercel Dashboard
1. Go to Vercel Dashboard
2. Select the deployment
3. Click "Promote to Production" on a previous deployment

### Option 2: Git Revert
```bash
# Find the commit to revert to
git log --oneline

# Revert to specific commit
git revert <commit-hash>
git push origin main

# Automatic deployment triggered!
```

### Option 3: Instant Rollback
```bash
# Revert last commit
git revert HEAD
git push origin main
```

---

## 📈 Scaling & Performance

### Current Setup (Free Tier)

**Supabase**:
- 500MB database
- 1GB storage
- 2GB bandwidth/month
- Good for: 100-500 Alpha users

**Vercel**:
- Unlimited deployments
- 100GB bandwidth/month
- Serverless functions
- Good for: 1000+ daily visitors

### Upgrade When Needed

**Supabase Pro** ($25/month):
- 8GB database
- 100GB storage
- Point-in-time recovery

**Vercel Pro** ($20/month):
- Increased limits
- Team collaboration
- Advanced analytics

---

## 🎯 Best Practices

### 1. Always Test Locally First
```bash
pnpm dev
# Test your changes
# Then push to GitHub
```

### 2. Use Feature Branches
```bash
git checkout -b feature/new-feature
# Make changes
git push origin feature/new-feature
# Create PR → Auto-preview deployment
```

### 3. Monitor After Deployment
```bash
# Check deployment status
gh run view

# Check app health
curl https://contractors-mall-admin.vercel.app/api/health
```

### 4. Keep Dependencies Updated
```bash
# Update dependencies
pnpm update

# Check for security issues
pnpm audit

# Push updates
git add pnpm-lock.yaml
git commit -m "Update dependencies"
git push
```

---

## 🆘 Getting Help

### Quick Commands

```bash
# View all deployments
./scripts/full-deployment.sh --help

# Check system status
npx supabase status
vercel whoami

# View logs
vercel logs --follow
npx supabase logs
```

### Resources

- **Documentation**: See `DEPLOYMENT.md` and `SUPABASE_SETUP.md`
- **GitHub Issues**: https://github.com/mahmoudsheikh94/contractors-mall/issues
- **Vercel Support**: https://vercel.com/support
- **Supabase Docs**: https://supabase.com/docs

---

## ✅ Deployment Checklist

Use this before going live:

### Pre-Deployment
- [ ] All tests passing (`pnpm test`)
- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Environment variables configured
- [ ] Database migrations tested locally

### Post-Deployment
- [ ] Admin portal accessible
- [ ] Web app accessible
- [ ] Can register new account
- [ ] Can login
- [ ] Can create products
- [ ] Can place orders
- [ ] Email verification works
- [ ] Storage buckets working
- [ ] Auth redirect URLs configured

### Monitoring (First 24 Hours)
- [ ] Check error logs hourly
- [ ] Monitor Vercel analytics
- [ ] Monitor Supabase usage
- [ ] Test all critical flows
- [ ] Verify email deliverability

---

**🎉 Your platform is now fully automated and ready for Alpha testing!**

Any push to `main` branch will automatically deploy to production.
