# 🚀 Contractors Mall - Deployment Guide

## Overview

This guide covers the deployment process for Contractors Mall to **Vercel** (frontend) and **Supabase Cloud** (backend) for Alpha testing.

---

## Prerequisites

Before deploying, ensure you have:

- [ ] GitHub account with repository access
- [ ] Vercel account (free tier is sufficient for Alpha)
- [ ] Supabase account (free tier for Alpha testing)
- [ ] Node.js 20+ and pnpm installed locally
- [ ] Access to domain registrar (optional for custom domain)

---

## 🗄️ Part 1: Database Setup (Supabase Cloud)

### 1.1 Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Create new project:
   - **Project Name**: `contractors-mall-alpha`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Frankfurt (eu-central-1) - best for MENA
   - **Pricing Plan**: Free tier

3. Wait for project provisioning (~2 minutes)

### 1.2 Get Connection Details

From your Supabase dashboard, collect:
- **Project URL**: `https://[PROJECT_ID].supabase.co`
- **Anon Key**: Found in Settings → API
- **Service Role Key**: Found in Settings → API (keep secret!)
- **Database URL**: Found in Settings → Database

### 1.3 Run Database Migrations

```bash
# Clone repository locally
git clone https://github.com/YOUR_USERNAME/contractors-mall.git
cd contractors-mall

# Install dependencies
pnpm install

# Set up Supabase CLI
npx supabase login

# Link to your project
npx supabase link --project-ref [PROJECT_ID]

# Push all migrations
npx supabase db push

# Verify migrations
npx supabase db status
```

### 1.4 Configure Storage Buckets

In Supabase Dashboard → Storage:

1. Create buckets:
   - `delivery-proofs` (Public)
   - `product-images` (Public)
   - `documents` (Private)

2. Set policies for each bucket (already in migrations)

### 1.5 Seed Initial Data

```bash
# Run seed script
npx supabase db seed

# This will create:
# - Default vehicle types
# - Product categories
# - System settings
# - Test supplier account (optional)
```

---

## 🌐 Part 2: Frontend Deployment (Vercel)

### 2.1 Prepare Repository

1. Ensure latest code is pushed:
```bash
git add .
git commit -m "Prepare for Alpha deployment"
git push origin main
```

2. Create deployment branch (optional):
```bash
git checkout -b deployment/alpha
git push origin deployment/alpha
```

### 2.2 Deploy Admin Portal

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import Git Repository:
   - Select your GitHub repo
   - Choose `contractors-mall`

4. Configure Project:
   ```
   Framework Preset: Next.js
   Root Directory: apps/admin
   Build Command: cd ../.. && pnpm build --filter=@contractors-mall/admin
   Output Directory: .next
   Install Command: pnpm install --frozen-lockfile
   ```

5. Environment Variables (click "Add"):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=[your-supabase-url]
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
   SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
   NEXT_PUBLIC_APP_URL=https://contractors-mall-admin.vercel.app
   NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN=[your-mapbox-token]
   ```

6. Click "Deploy" and wait (~3-5 minutes)

### 2.3 Deploy Contractor Web App

Repeat the same process with different settings:

1. Add New Project in Vercel
2. Import same repository
3. Configure:
   ```
   Root Directory: apps/web
   Build Command: cd ../.. && pnpm build --filter=@contractors-mall/web
   ```

4. Environment Variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=[same-as-admin]
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[same-as-admin]
   NEXT_PUBLIC_APP_URL=https://contractors-mall-web.vercel.app
   NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN=[same-as-admin]
   ```

### 2.4 Configure Domains

Your apps will be available at:
- Admin: `https://[project-name]-admin.vercel.app`
- Web: `https://[project-name]-web.vercel.app`

For custom domains (optional):
1. In Vercel → Project Settings → Domains
2. Add custom domain (e.g., `admin.contractorsmall.jo`)
3. Update DNS records at your registrar

---

## 🔒 Part 3: Security Configuration

### 3.1 Update Supabase Security

In Supabase Dashboard → Authentication → Settings:

1. **Site URL**: Set to your Vercel admin URL
2. **Redirect URLs**: Add both Vercel URLs
3. **JWT Expiry**: Set to 3600 (1 hour for Alpha)
4. **Enable Email Confirmations**: Yes

### 3.2 Configure CORS

In Supabase → API → Settings:
- Add your Vercel domains to allowed origins

### 3.3 Set Up Rate Limiting

Already configured in middleware, but verify:
- API routes have rate limiting
- Supabase has default rate limits

---

## ✅ Part 4: Post-Deployment Checklist

### 4.1 Smoke Testing

Test critical paths:

1. **Authentication Flow**:
   - [ ] Supplier registration
   - [ ] Email verification
   - [ ] Login/Logout
   - [ ] Password reset

2. **Supplier Features**:
   - [ ] Create product
   - [ ] Upload images
   - [ ] View dashboard
   - [ ] Manage orders

3. **Order Flow**:
   - [ ] Browse products
   - [ ] Add to cart
   - [ ] Checkout
   - [ ] Payment simulation

4. **Delivery**:
   - [ ] PIN verification
   - [ ] Photo upload
   - [ ] Order completion

### 4.2 Monitoring Setup

1. **Vercel Analytics**:
   - Automatically enabled
   - Check dashboard for Web Vitals

2. **Supabase Monitoring**:
   - Check Database → Monitoring
   - Set up alerts for errors

3. **Error Tracking** (Optional):
   ```bash
   # Install Sentry
   pnpm add @sentry/nextjs

   # Configure in next.config.js
   ```

### 4.3 Alpha User Setup

1. Create test accounts:
   ```sql
   -- In Supabase SQL Editor
   -- Create test supplier
   INSERT INTO profiles (email, role, full_name)
   VALUES ('supplier@test.com', 'supplier_admin', 'Test Supplier');

   -- Create test contractor
   INSERT INTO profiles (email, role, full_name)
   VALUES ('contractor@test.com', 'contractor', 'Test Contractor');
   ```

2. Whitelist Alpha testers (optional):
   - Use Supabase Auth → User Management
   - Or implement invite codes

---

## 🐛 Part 5: Troubleshooting

### Common Issues

1. **Build Failures**:
   ```bash
   # Clear cache and rebuild
   pnpm clean:all
   pnpm install
   pnpm build
   ```

2. **Database Connection Issues**:
   - Check Supabase service is running
   - Verify environment variables
   - Check connection pooling settings

3. **Authentication Problems**:
   - Verify redirect URLs in Supabase
   - Check JWT secret configuration
   - Clear browser cookies

4. **Performance Issues**:
   - Enable Vercel Edge Functions
   - Check database indexes
   - Review API response times

### Debug Commands

```bash
# Check build locally
pnpm build:production

# Test environment variables
pnpm dev

# Check type errors
pnpm type-check

# Verify database
npx supabase db status
```

---

## 📊 Part 6: Performance Monitoring

### Key Metrics to Track

1. **Core Web Vitals** (Vercel Dashboard):
   - LCP < 2.5s
   - FID < 100ms
   - CLS < 0.1

2. **API Performance** (Supabase):
   - Query execution time < 100ms
   - Connection pool usage < 80%
   - Error rate < 1%

3. **User Metrics**:
   - Page load time
   - Time to interactive
   - Bounce rate

---

## 🔄 Part 7: Continuous Deployment

### GitHub Actions Setup

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: pnpm test
      - name: Type check
        run: pnpm type-check
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### Environment Management

Use Vercel environment variables for:
- Production
- Preview (branches)
- Development (local)

---

## 📝 Part 8: Rollback Procedures

### Database Rollback

```bash
# List migrations
npx supabase db migrations list

# Rollback to specific version
npx supabase db rollback --to [VERSION]
```

### Application Rollback

In Vercel Dashboard:
1. Go to Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

---

## 🚦 Part 9: Go-Live Checklist

Before announcing Alpha:

- [ ] All critical features tested
- [ ] SSL certificates active
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Support email configured
- [ ] Terms of Service deployed
- [ ] Privacy Policy deployed
- [ ] Alpha feedback form ready
- [ ] Test data cleaned
- [ ] Admin accounts created

---

## 📞 Support

For deployment issues:
- **Vercel**: [vercel.com/support](https://vercel.com/support)
- **Supabase**: [supabase.com/support](https://supabase.com/support)
- **Project**: Create issue on GitHub

---

## 🎯 Next Steps

After successful deployment:

1. **Week 1**: Monitor performance and errors
2. **Week 2**: Gather Alpha user feedback
3. **Week 3**: Implement critical fixes
4. **Week 4**: Prepare for Beta release

---

**Deployment Status**: Ready for Alpha Testing 🚀

Last Updated: November 2024