# Automation Setup Guide

This document describes all automation infrastructure for the Contractors Mall project, including CI/CD, type generation, and deployment monitoring.

## Table of Contents

1. [GitHub Actions Workflows](#github-actions-workflows)
2. [Vercel Webhook Integration](#vercel-webhook-integration)
3. [Scripts](#scripts)
4. [Environment Variables](#environment-variables)
5. [Setup Instructions](#setup-instructions)

---

## GitHub Actions Workflows

### 1. TypeScript Type Check (`.github/workflows/type-check.yml`)

**Triggers:**
- Pull requests to `main` or `develop` branches
- Pushes to `main` branch
- Only runs when TypeScript files change

**What it does:**
- Runs TypeScript compilation check for both web and admin apps
- Uses matrix strategy to check both apps in parallel
- Caches pnpm dependencies for faster runs
- Automatically comments on PRs when type checks fail

**Status:** ✅ Automated on every PR

**Manual trigger:** Not available (runs automatically)

### 2. Generate Supabase Types (`.github/workflows/generate-types.yml`)

**Triggers:**
- Manual trigger (workflow_dispatch)
- Daily at 2 AM UTC (scheduled)
- When migrations change
- When the workflow file itself changes

**What it does:**
- Generates TypeScript types from Supabase database schema
- Creates types for both web and admin apps
- Detects changes and creates a PR automatically if types have changed
- PR includes both apps' updated types

**Status:** ✅ Automated daily + manual trigger available

**Manual trigger:**
```bash
# Via GitHub UI: Actions → Generate Supabase Types → Run workflow
# Or via GitHub CLI:
gh workflow run generate-types.yml
```

---

## Vercel Webhook Integration

### Webhook Endpoints

Both apps have webhook endpoints to receive deployment notifications from Vercel:

- **Web App:** `https://[your-web-domain]/api/webhooks/vercel`
- **Admin App:** `https://[your-admin-domain]/api/webhooks/vercel`

### Events Handled

- `deployment.created` - Deployment started
- `deployment.succeeded` - Deployment completed successfully
- `deployment.failed` - Deployment failed
- `deployment.error` - Deployment error occurred

### Setup Instructions

1. Go to Vercel project settings
2. Navigate to **Git** → **Deploy Hooks**
3. Add webhook URL for each app
4. Select events to subscribe to
5. (Optional) Add `VERCEL_WEBHOOK_SECRET` for signature verification

### Health Check

Test webhook endpoints:
```bash
curl https://[your-domain]/api/webhooks/vercel
```

Expected response:
```json
{
  "status": "healthy",
  "endpoint": "vercel-webhook",
  "timestamp": "2025-11-06T..."
}
```

---

## Scripts

### 1. Check Deployment (`scripts/check-deployment.sh`)

Verifies that both apps are deployed and healthy.

**Usage:**
```bash
./scripts/check-deployment.sh
```

**Environment Variables:**
- `WEB_URL` - Web app URL (default: `https://contractors-mall.vercel.app`)
- `ADMIN_URL` - Admin app URL (default: `https://contractors-mall-admin.vercel.app`)

**Checks Performed:**
- HTTP response status (200 OK)
- API health endpoint
- Webhook endpoint availability

**Example output:**
```
========================================
Contractors Mall Deployment Check
========================================

--- Web App (Contractor) ---
✅ Web App is deployed and serving content
✅ Web App API is healthy

--- Admin App (Supplier/Admin) ---
✅ Admin App is deployed and serving content
✅ Admin App API is healthy

========================================
✅ Deployment check complete!
========================================
```

### 2. Generate Types (`scripts/generate-types.sh`)

Regenerates Supabase TypeScript types for both apps.

**Prerequisites:**
- `SUPABASE_PROJECT_ID` environment variable must be set
- Supabase CLI installed (or will use npx)

**Usage:**
```bash
export SUPABASE_PROJECT_ID=zbscashhrdeofvgjnbsb
./scripts/generate-types.sh
```

**What it does:**
1. Generates types for web app → `apps/web/src/types/database.ts`
2. Generates types for admin app → `apps/admin/src/types/supabase.ts`
3. Runs type check for both apps to verify
4. Reports success/failure for each step

**Example output:**
```
========================================
Supabase Types Generation
========================================

Project root: /Users/.../Contractors Mall
Supabase project: zbscashhrdeofvgjnbsb

Generating types for web app...
✅ Web app types generated successfully
   File: apps/web/src/types/database.ts

Generating types for admin app...
✅ Admin app types generated successfully
   File: apps/admin/src/types/supabase.ts

========================================
✅ Type generation complete!
========================================

Running type checks...
✅ Web app type check passed
✅ Admin app type check passed
```

---

## Environment Variables

### Required for CI/CD

Add these secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `SUPABASE_PROJECT_ID` | Your Supabase project ID | Supabase Dashboard → Project Settings → General |
| `SUPABASE_ACCESS_TOKEN` | Personal access token for Supabase CLI | Supabase Dashboard → Account → Access Tokens |

### Required for Local Development

Add these to your `.env` or `.env.local` files:

```bash
# Public (required for both apps)
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Service role (for admin operations, server-side only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# For type generation
SUPABASE_PROJECT_ID=zbscashhrdeofvgjnbsb
SUPABASE_ACCESS_TOKEN=your-access-token
```

### Turbo Configuration

All environment variables are now tracked in `turbo.json`:

```json
{
  "globalEnv": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_PROJECT_ID",
    "SUPABASE_ACCESS_TOKEN"
  ]
}
```

This ensures proper caching and rebuilds when environment changes.

---

## Setup Instructions

### 1. GitHub Actions Setup

✅ **Already configured!** Workflows are in `.github/workflows/`

**Required:** Add GitHub Secrets (see [Environment Variables](#environment-variables))

### 2. Vercel Webhook Setup

**For Web App:**
1. Go to Vercel → contractors-mall-web → Settings → Git
2. Add Deploy Hook:
   - Name: "Deployment Notifications"
   - URL: `https://[your-web-domain]/api/webhooks/vercel`
   - Events: All deployment events

**For Admin App:**
1. Go to Vercel → contractors-mall-admin → Settings → Git
2. Add Deploy Hook:
   - Name: "Deployment Notifications"
   - URL: `https://[your-admin-domain]/api/webhooks/vercel`
   - Events: All deployment events

### 3. Local Development

1. **Copy environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in values:**
   - Get Supabase credentials from Dashboard
   - Get project ID from project URL

3. **Make scripts executable:**
   ```bash
   chmod +x scripts/*.sh
   ```

4. **Test type generation:**
   ```bash
   export SUPABASE_PROJECT_ID=zbscashhrdeofvgjnbsb
   ./scripts/generate-types.sh
   ```

5. **Test deployment check:**
   ```bash
   ./scripts/check-deployment.sh
   ```

---

## Workflows in Action

### When you push to a PR:

1. **GitHub Actions** automatically runs type checks for both apps
2. If types fail, a comment is posted on the PR with error details
3. PR cannot be merged until type checks pass (if required checks are enabled)

### When database schema changes:

**Option A - Automatic (Daily):**
1. GitHub Actions runs daily at 2 AM UTC
2. Generates fresh types from Supabase
3. If changes detected, creates a PR automatically
4. Review and merge the PR

**Option B - Manual:**
1. Run workflow from GitHub Actions UI
2. Or run locally: `./scripts/generate-types.sh`
3. Commit and push changes

### When deployment completes:

1. Vercel sends webhook to your app
2. Webhook endpoint logs deployment event
3. You can extend this to:
   - Send Slack/Discord notifications
   - Run smoke tests
   - Update status pages
   - Create GitHub issues on failure

---

## Troubleshooting

### Type check fails in CI but passes locally

**Cause:** Types are out of sync

**Fix:**
```bash
./scripts/generate-types.sh
git add apps/*/src/types/
git commit -m "chore: Update Supabase types"
git push
```

### Type generation workflow fails

**Check:**
1. GitHub Secrets are set correctly
2. Supabase project ID is valid
3. Access token has not expired

**Fix:**
1. Regenerate access token in Supabase Dashboard
2. Update `SUPABASE_ACCESS_TOKEN` secret in GitHub

### Webhook not receiving events

**Check:**
1. Webhook URL is correct
2. Deployment completed (check Vercel dashboard)
3. Webhook endpoint is deployed

**Test:**
```bash
curl https://[your-domain]/api/webhooks/vercel
```

Should return `{"status":"healthy",...}`

---

## Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Regenerate types after migrations** - Run `./scripts/generate-types.sh`
3. **Review auto-generated PRs** - Don't blindly merge type updates
4. **Test locally before pushing** - Run `pnpm type-check` before committing
5. **Keep secrets secure** - Only add to GitHub Secrets, never in code

---

## Next Steps

### Potential Enhancements

- [ ] Add Slack notifications for deployment events
- [ ] Set up automated smoke tests post-deployment
- [ ] Create dashboard for deployment metrics
- [ ] Add database schema validation
- [ ] Set up automated backups before migrations
- [ ] Add performance monitoring integration

---

## Related Documentation

- [Dual Authentication Implementation](./DUAL_AUTH_IMPLEMENTATION_SUMMARY.md)
- [Manual Testing Instructions](./MANUAL_TESTING_INSTRUCTIONS.md)
- [Project Setup](./README.md)

---

**Last Updated:** November 6, 2025
**Automation Status:** ✅ Fully Operational
