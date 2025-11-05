# ⚡ Fast Deploy Guide - You're Almost There!

Since your database is already set up, you only need **2 simple steps** to go live:

---

## ✅ What's Already Done

- ✅ Database & tables created in Supabase
- ✅ All migrations applied
- ✅ RLS policies configured
- ✅ Code pushed to GitHub
- ✅ CI/CD pipeline ready

---

## 🚀 Step 1: Verify Storage Buckets (2 minutes)

Visit: https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/storage/buckets

**Check if these buckets exist:**
- `product-images`
- `delivery-proofs`
- `dispute-media`

### If Buckets Don't Exist - Create Them:

Click "New bucket" for each:

**1. product-images**
- Name: `product-images`
- Public: ✅ Yes
- File size limit: `5242880` (5MB)
- Allowed MIME types: `image/jpeg,image/png,image/webp`

**2. delivery-proofs**
- Name: `delivery-proofs`
- Public: ❌ No
- File size limit: `10485760` (10MB)
- Allowed MIME types: `image/jpeg,image/png,image/webp`

**3. dispute-media**
- Name: `dispute-media`
- Public: ❌ No
- File size limit: `10485760` (10MB)
- Allowed MIME types: `image/jpeg,image/png,image/webp,application/pdf`

---

## 🚀 Step 2: Deploy to Vercel (10 minutes)

### Option A: Vercel Dashboard (Easiest)

1. **Go to Vercel**: https://vercel.com

2. **Click "Add New..." → Project**

3. **Import from GitHub**:
   - Select: `mahmoudsheikh94/contractors-mall`
   - Click "Import"

4. **Configure Admin Portal**:
   - Framework Preset: Next.js
   - Root Directory: `apps/admin`
   - Build Command: `cd ../.. && pnpm build --filter=@contractors-mall/admin`
   - Output Directory: `.next`
   - Install Command: `pnpm install --frozen-lockfile`

5. **Add Environment Variables** (Admin):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://zbscashhrdeofvgjnbsb.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpic2Nhc2hocmRlb2Z2Z2puYnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Nzc3NDUsImV4cCI6MjA3NjI1Mzc0NX0.YNs2X__Z6IZ1wBc6CH1ivRzGBPwAbch8e7qjBj5enbs
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpic2Nhc2hocmRlb2Z2Z2puYnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY3Nzc0NSwiZXhwIjoyMDc2MjUzNzQ1fQ.pzlUjpU53N2RVYME1UEStsetc6KcD7BIh33H73BnOU4
   ```

6. **Click "Deploy"** - Wait 2-3 minutes

7. **Repeat for Web App**:
   - Click "Add New..." → Project
   - Select same GitHub repo
   - Root Directory: `apps/web`
   - Same build/install commands (replace `admin` with `web`)
   - Same environment variables

### Option B: Vercel CLI (Alternative)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy Admin
cd apps/admin
vercel --prod

# Deploy Web
cd ../web
vercel --prod
```

---

## 🔧 Step 3: Configure Auth URLs (1 minute)

Once both apps are deployed, get the URLs from Vercel (they'll look like):
- `https://contractors-mall-admin.vercel.app`
- `https://contractors-mall-web.vercel.app`

**Add to Supabase**:
https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/auth/url-configuration

**Site URL**: Use your admin URL
```
https://contractors-mall-admin.vercel.app
```

**Redirect URLs**: Add these (replace with your actual URLs):
```
https://contractors-mall-admin.vercel.app/**
https://contractors-mall-web.vercel.app/**
http://localhost:3001/**
http://localhost:3000/**
```

---

## ✅ Deployment Complete!

After completing the steps above:

1. **Test Admin Portal**:
   - Visit your admin URL
   - Register a new supplier account
   - Check email for verification
   - Login and create a test product

2. **Test Web App**:
   - Visit your web URL
   - Register a contractor account
   - Browse products
   - Add to cart

---

## 🎉 From Now On: Automatic!

Every push to GitHub automatically deploys both apps:

```bash
git add .
git commit -m "Update features"
git push origin main
# 🤖 GitHub Actions automatically deploys!
```

---

## 🆘 Need Help?

**Vercel Deployment Issues**:
- Check build logs in Vercel dashboard
- Verify environment variables are set
- Check that build commands are correct

**Authentication Issues**:
- Verify redirect URLs in Supabase
- Check that environment variables match
- Ensure buckets exist

**Quick Test**:
```bash
# Test locally first
pnpm dev

# Then push to GitHub
git push origin main
```

---

**You're 2 steps away from being live!** 🚀
