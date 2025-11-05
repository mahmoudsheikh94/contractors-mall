# 🚀 Quick Start Guide - Contractors Mall

## ✅ What's Already Done

Your credentials are safely saved in:
- `.env.local` - For local development
- `CREDENTIALS.md` - Secure backup (NOT in git)

## 📋 Next Steps (15 minutes)

### Step 1: Login to Supabase CLI (2 min)

```bash
cd "/Users/mahmoud/Desktop/Apps/Contractors Mall"
npx supabase login
```

This will open your browser. Log in with your Supabase account.

### Step 2: Link Your Project (1 min)

```bash
npx supabase link --project-ref zbscashhrdeofvgjnbsb
```

When prompted for password, enter:
```
5822075Mahmoud94$
```

### Step 3: Push Database Migrations (3 min)

```bash
npx supabase db push
```

This creates all your tables, views, functions, and security policies.

### Step 4: Create Storage Buckets (2 min)

Go to: https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/storage/buckets

Click "New bucket" for each:

1. **delivery-proofs**
   - Public: ✅ Yes
   - File size limit: 5MB

2. **product-images**
   - Public: ✅ Yes
   - File size limit: 2MB

3. **documents**
   - Public: ❌ No
   - File size limit: 10MB

### Step 5: Configure Auth Settings (2 min)

Go to: https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/auth/url-configuration

**Site URL**: `http://localhost:3001`

**Redirect URLs**: Add these:
```
http://localhost:3001/**
http://localhost:3000/**
https://contractors-mall-admin.vercel.app/**
https://contractors-mall-web.vercel.app/**
```

### Step 6: Test Locally (5 min)

```bash
# Start development servers
pnpm dev
```

Visit:
- **Admin Portal**: http://localhost:3001
- **Contractor App**: http://localhost:3000

Try these actions:
1. ✅ Register a new supplier account
2. ✅ Check your email for verification
3. ✅ Login to admin portal
4. ✅ Create a test product
5. ✅ View the dashboard

---

## 🚀 Ready to Deploy to Vercel?

### Option A: Automatic with GitHub (Recommended)

1. **Push to GitHub**:
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Follow the setup in `DEPLOYMENT.md`

3. **Set Environment Variables**:
   Use the setup script:
```bash
./scripts/setup-deployment.sh
```

### Option B: Manual Deployment

Follow the complete guide in `DEPLOYMENT.md`

---

## 📚 Documentation Reference

- **DEPLOYMENT.md** - Complete deployment guide
- **SUPABASE_SETUP.md** - Detailed Supabase configuration
- **CREDENTIALS.md** - All your credentials (keep safe!)
- **.env.local** - Local environment variables

---

## 🆘 Troubleshooting

### "Access token not provided"
```bash
npx supabase login
```

### "Cannot connect to database"
Check your credentials in `.env.local` match `CREDENTIALS.md`

### "Migration failed"
```bash
npx supabase db reset
npx supabase db push
```

### "Storage bucket not found"
Create them manually in Supabase Dashboard → Storage

---

## 🎯 Success Checklist

Before deploying, verify:
- [ ] Supabase CLI logged in
- [ ] Project linked successfully
- [ ] Migrations pushed without errors
- [ ] Storage buckets created
- [ ] Auth URLs configured
- [ ] Local app runs successfully
- [ ] Can register and login
- [ ] Can create products
- [ ] Dashboard loads data

---

## 📞 Need Help?

1. Check the full guides in:
   - `DEPLOYMENT.md`
   - `SUPABASE_SETUP.md`

2. Supabase Dashboard:
   - https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb

3. Community Support:
   - Supabase Discord: https://discord.supabase.com

---

**You're almost there! Just 6 simple steps and you'll be running locally.** 🎉

Run the commands above and you'll have your platform up and running in 15 minutes!