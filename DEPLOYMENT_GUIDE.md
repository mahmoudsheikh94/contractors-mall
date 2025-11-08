# Deployment Guide - Contractors Mall

## 🏗️ Architecture Overview

This is a **monorepo** with two separate Next.js applications:

```
contractors-mall/
├── apps/
│   ├── web/          → Contractor-facing marketplace (Port 3000)
│   └── admin/        → Super admin back office (Port 3001)
└── packages/
    ├── ui/           → Shared components
    └── config/       → Shared configs
```

---

## 🚀 Deployment Strategy: 2 Separate Vercel Projects

### Why 2 Projects?

✅ **Security**: Admin portal isolated from public app
✅ **Independent Deployments**: Deploy each app separately
✅ **Different Domains**: `app.example.com` vs `admin.example.com`
✅ **Access Control**: Restrict admin portal to specific IPs (optional)
✅ **Performance**: Independent optimization and caching

---

## 📦 Project 1: Web App (Contractor Marketplace)

### Quick Deploy

```bash
cd apps/web
npx vercel --prod
```

### Configuration

**Project Settings:**
- **Project Name**: `contractors-mall-web`
- **Framework**: Next.js
- **Root Directory**: `apps/web`
- **Build Command**: `cd ../.. && pnpm build --filter=@contractors-mall/web`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`
- **Node Version**: 20.x

**Environment Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN=your-mapbox-token
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn (optional)
SENTRY_AUTH_TOKEN=your-sentry-token (optional)
SENTRY_ORG=your-org (optional)
SENTRY_PROJECT=contractors-mall-web (optional)
```

**Custom Domain (Recommended):**
- Primary: `contractorsmall.com`
- Alternative: `app.contractorsmall.com`

---

## 🔐 Project 2: Admin Portal

### Quick Deploy

```bash
cd apps/admin
npx vercel --prod
```

### Configuration

**Project Settings:**
- **Project Name**: `contractors-mall-admin`
- **Framework**: Next.js
- **Root Directory**: `apps/admin`
- **Build Command**: `cd ../.. && pnpm build --filter=@contractors-mall/admin`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`
- **Node Version**: 20.x

**Environment Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn (optional)
SENTRY_AUTH_TOKEN=your-sentry-token (optional)
SENTRY_ORG=your-org (optional)
SENTRY_PROJECT=contractors-mall-admin (optional)
```

**Custom Domain (Recommended):**
- Primary: `admin.contractorsmall.com`

**Security Settings (Recommended):**
- Enable **Password Protection** in Vercel settings
- Or configure **IP Allowlist** for your office/home IPs
- Enable **2FA** for admin accounts

---

## 📝 Step-by-Step Deployment

### Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **Vercel CLI**: `npm i -g vercel`
3. **Supabase Project**: Running and configured
4. **Environment Variables**: Ready from `.env.local`

### Step 1: Login to Vercel

```bash
vercel login
```

### Step 2: Deploy Admin Portal

```bash
# Navigate to project root
cd "/Users/mahmoud/Desktop/Apps/Contractors Mall"

# Deploy admin
cd apps/admin
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name? contractors-mall-admin
# - Directory? ./ (current)
# - Override settings? No
```

### Step 3: Configure Admin Project

1. Go to **Vercel Dashboard** → `contractors-mall-admin` → **Settings**

2. **Build & Development Settings**:
   - Framework: Next.js (auto-detected)
   - Root Directory: Leave empty (we use vercel.json)
   - Build Command: Will use vercel.json config
   - Install Command: Will use vercel.json config

3. **Environment Variables**:
   - Click "Add" for each variable
   - Paste from your `.env.local`
   - Make sure to set for **Production** environment

4. **Domains**:
   - Click "Add Domain"
   - Enter: `admin.contractorsmall.com`
   - Follow DNS configuration steps

5. **Git** (Optional but Recommended):
   - Connect to GitHub repository
   - Enable auto-deployments on push to `main`

### Step 4: Deploy Web App

```bash
# From project root
cd apps/web
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name? contractors-mall-web
# - Directory? ./ (current)
# - Override settings? No
```

### Step 5: Configure Web Project

Same steps as admin, but:
- Project name: `contractors-mall-web`
- Domain: `contractorsmall.com` or `app.contractorsmall.com`
- Environment variables: Same as admin + `NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN`

### Step 6: Verify Deployments

**Admin Portal:**
```
https://contractors-mall-admin.vercel.app
# or
https://admin.contractorsmall.com
```

**Web App:**
```
https://contractors-mall-web.vercel.app
# or
https://contractorsmall.com
```

---

## 🔧 Troubleshooting

### Build Fails: "Cannot find module"

**Issue**: Monorepo workspace dependencies not found

**Solution**: Verify `vercel.json` has correct build command:
```json
{
  "buildCommand": "cd ../.. && pnpm build --filter=@contractors-mall/admin"
}
```

### Build Fails: "pnpm not found"

**Issue**: Vercel doesn't detect pnpm

**Solution**: Add to project settings:
```
Install Command: pnpm install
```

Or enable pnpm in Vercel:
```bash
# In your package.json root
{
  "packageManager": "pnpm@9.0.0"
}
```

### Environment Variables Not Working

**Issue**: Variables not loading in production

**Solution**:
1. Verify they're added in Vercel Dashboard
2. Redeploy after adding variables
3. Check they're set for "Production" environment
4. Restart deployment: `vercel --prod --force`

### Admin Login Redirects to /auth/login Loop

**Issue**: Auth not working in production

**Solution**:
1. Check Supabase URL in environment variables
2. Add production URL to Supabase redirect URLs:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add: `https://admin.contractorsmall.com/**`
3. Verify admin account exists with `role = 'admin'`

### Different Behavior in Production vs Local

**Issue**: Works locally but fails in production

**Solution**:
1. Check all environment variables are set
2. Verify Supabase RLS policies allow access
3. Check browser console for errors
4. Review Vercel deployment logs
5. Enable Sentry to track production errors

---

## 🔐 Security Checklist

### Admin Portal Security

- [ ] Custom domain configured (`admin.contractorsmall.com`)
- [ ] Password protection enabled in Vercel (optional)
- [ ] IP allowlist configured (optional)
- [ ] 2FA enabled for admin users in Supabase
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] Supabase RLS policies restrict admin access
- [ ] Sentry error tracking enabled
- [ ] Rate limiting on login endpoint (TODO)

### Environment Variables

- [ ] Never commit `.env.local` to Git
- [ ] All sensitive keys stored in Vercel only
- [ ] Different Supabase keys for staging/production
- [ ] Rotate API keys regularly
- [ ] Monitor Vercel deployment logs for leaks

---

## 🎯 Post-Deployment Tasks

### 1. Create Admin Account

```sql
-- In Supabase SQL Editor
UPDATE profiles
SET role = 'admin',
    full_name = 'Your Name',
    email_verified = true
WHERE email = 'your-email@example.com';
```

### 2. Test Critical Flows

- [ ] Admin can login
- [ ] Orders page loads
- [ ] Can edit an order
- [ ] Can view user details
- [ ] Health monitoring works
- [ ] Sentry captures errors

### 3. Configure DNS (for custom domains)

**For admin.contractorsmall.com:**
```
Type: CNAME
Name: admin
Value: cname.vercel-dns.com
```

**For contractorsmall.com:**
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 4. Set Up Monitoring

- [ ] Configure Sentry alerts
- [ ] Set up Vercel deployment notifications
- [ ] Add Uptime monitoring (UptimeRobot, etc.)
- [ ] Configure analytics (Vercel Analytics)

---

## 🔄 CI/CD: Auto-Deploy from GitHub

### Option 1: GitHub Integration (Recommended)

1. **Connect Repository**:
   - Vercel Dashboard → Project → Settings → Git
   - Click "Connect Git Repository"
   - Authorize Vercel for GitHub
   - Select your repository

2. **Configure Branch**:
   - Production Branch: `main`
   - Preview Branches: All branches

3. **Auto-Deploy**:
   - Push to `main` → Production deployment
   - Push to any branch → Preview deployment

### Option 2: GitHub Actions

Create `.github/workflows/deploy-admin.yml`:

```yaml
name: Deploy Admin to Vercel

on:
  push:
    branches: [main]
    paths:
      - 'apps/admin/**'
      - 'packages/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_ADMIN_PROJECT_ID }}
          working-directory: ./apps/admin
          vercel-args: '--prod'
```

---

## 📊 Monitoring Production

### Vercel Analytics

Enable in Dashboard → Project → Analytics
- Page views
- Unique visitors
- Top pages
- Web vitals (LCP, FID, CLS)

### Sentry Error Tracking

Already configured! Check:
```
https://sentry.io/organizations/YOUR_ORG/issues/
```

### Health Monitoring

Access at:
```
https://admin.contractorsmall.com/admin/health
```

Monitor:
- Database response time
- RLS policy health
- System errors
- Performance metrics

---

## 💰 Cost Estimation

### Vercel (Hobby - Free Tier)

- **Web App**: Free
- **Admin Portal**: Free
- **Limits**: 100GB bandwidth/month, 6000 build minutes/month
- **Upgrade to Pro**: $20/month if needed

### Vercel Pro ($20/month per project)

- Recommended for production
- Unlimited bandwidth
- Advanced analytics
- Password protection
- IP allowlist
- 99.99% SLA

### Total Estimated Monthly Cost

- **Free Tier**: $0 (sufficient for MVP/testing)
- **Pro (both apps)**: $40/month (recommended for production)

---

## 🆘 Support

### Issues During Deployment?

1. Check Vercel deployment logs
2. Review this guide's troubleshooting section
3. Check Supabase connection
4. Verify environment variables
5. Check Sentry for production errors

### Vercel Resources

- Docs: https://vercel.com/docs
- Monorepo Guide: https://vercel.com/docs/monorepos
- Support: https://vercel.com/support

---

## ✅ Deployment Checklist

### Pre-Deployment

- [ ] Code tested locally
- [ ] Environment variables documented
- [ ] Supabase migrations applied
- [ ] Admin account created
- [ ] Build succeeds locally: `pnpm build`
- [ ] Type check passes: `pnpm type-check`

### Deployment

- [ ] Admin portal deployed to Vercel
- [ ] Web app deployed to Vercel
- [ ] Environment variables added to both
- [ ] Custom domains configured
- [ ] DNS records updated
- [ ] SSL certificates active (automatic)

### Post-Deployment

- [ ] Admin can login
- [ ] Critical flows tested
- [ ] Sentry capturing errors
- [ ] Health monitoring accessible
- [ ] Uptime monitoring configured
- [ ] Team members have access

---

**Last Updated**: November 8, 2025
**Version**: 1.0
**Author**: Contractors Mall Team
