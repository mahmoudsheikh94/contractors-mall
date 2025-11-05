# 🗄️ Supabase Setup Guide - Contractors Mall

## ✅ Your Project is Already Created!

Your Supabase project is set up and ready to use:
- **Project Name**: contractors-mall
- **Project ID**: zbscashhrdeofvgjnbsb
- **Region**: Frankfurt (eu-central-1)
- **Dashboard**: https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb

---

## 🔗 Step 1: Link Your Local Project

Run this command to link your local codebase to your Supabase project:

```bash
cd "/Users/mahmoud/Desktop/Apps/Contractors Mall"
npx supabase link --project-ref zbscashhrdeofvgjnbsb
```

When prompted for the database password, enter:
```
5822075Mahmoud94$
```

---

## 📤 Step 2: Push Database Migrations

Your project has migrations ready in the `supabase/migrations` folder. Push them to your cloud database:

```bash
npx supabase db push
```

This will create all the necessary tables, views, functions, and RLS policies.

---

## 🗂️ Step 3: Set Up Storage Buckets

Go to: https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/storage/buckets

Create the following buckets:

### 1. delivery-proofs (Public)
- Click "New bucket"
- Name: `delivery-proofs`
- Public: ✅ Yes
- File size limit: 5MB
- Allowed MIME types: `image/jpeg,image/png,image/webp`

### 2. product-images (Public)
- Click "New bucket"
- Name: `product-images`
- Public: ✅ Yes
- File size limit: 2MB
- Allowed MIME types: `image/jpeg,image/png,image/webp`

### 3. documents (Private)
- Click "New bucket"
- Name: `documents`
- Public: ❌ No
- File size limit: 10MB
- Allowed MIME types: `application/pdf,image/*`

---

## 🌱 Step 4: Seed Initial Data (Optional)

To add sample categories, vehicle types, and test data:

```bash
npx supabase db seed
```

Or manually run SQL in the Supabase SQL Editor:
https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/editor

---

## 🔐 Step 5: Configure Authentication

Go to: https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/auth/url-configuration

### Site URL
Set to your production admin URL:
```
https://contractors-mall-admin.vercel.app
```

### Redirect URLs
Add both deployment URLs:
```
https://contractors-mall-admin.vercel.app/**
https://contractors-mall-web.vercel.app/**
http://localhost:3001/**
http://localhost:3000/**
```

### Email Templates
Go to: Auth → Email Templates

Customize the email templates for:
- Confirm signup
- Invite user
- Magic Link
- Change Email
- Reset Password

Use Arabic text for better UX in Jordan.

---

## 📊 Step 6: Verify Setup

Run these checks to ensure everything is working:

### Check Database Connection
```bash
npx supabase db status
```

### Check Tables
```bash
npx supabase db list
```

### Test API Connection
```bash
curl https://zbscashhrdeofvgjnbsb.supabase.co/rest/v1/
```

---

## 🚀 Step 7: Test Your Apps Locally

Now that Supabase is configured, test your apps:

```bash
# Start both apps
pnpm dev
```

Visit:
- Admin Portal: http://localhost:3001
- Contractor App: http://localhost:3000

Try:
1. Register a new supplier account
2. Verify email works
3. Create a product
4. Upload an image
5. View the dashboard

---

## 🔍 Monitoring & Debugging

### Database Logs
https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/logs/postgres-logs

### API Logs
https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/logs/edge-logs

### Auth Logs
https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/logs/auth-logs

### Storage Logs
https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/logs/storage-logs

---

## 🛠️ Common Commands

```bash
# Check which project you're linked to
npx supabase status

# Reset database (WARNING: Deletes all data)
npx supabase db reset

# Create a new migration
npx supabase migration new my_migration_name

# Pull schema from remote
npx supabase db pull

# Generate TypeScript types from database
npx supabase gen types typescript --local > lib/database.types.ts
```

---

## 📈 Free Tier Limits

Your project is on the free tier with these limits:
- **Database**: 500MB
- **Storage**: 1GB
- **Bandwidth**: 2GB
- **Monthly Active Users**: 50,000
- **Realtime connections**: 200 concurrent

This is perfect for Alpha testing!

---

## 🆙 Upgrading (When Needed)

When you're ready to scale beyond Alpha:

**Pro Plan**: $25/month
- 8GB database
- 100GB storage
- 250GB bandwidth
- Unlimited MAUs
- Point-in-time recovery (7 days)
- Priority support

Upgrade at: https://supabase.com/dashboard/project/zbscashhrdeofvgjnbsb/settings/billing

---

## 🔒 Security Checklist

- [x] RLS policies enabled on all tables
- [ ] Auth redirect URLs configured
- [ ] Storage buckets created
- [ ] Email templates customized
- [ ] Rate limiting reviewed
- [ ] Row level security tested
- [ ] Service role key secured (never in client code)

---

## 📞 Support

If you encounter issues:
1. Check Supabase Status: https://status.supabase.com
2. Community Discord: https://discord.supabase.com
3. Documentation: https://supabase.com/docs

---

**Next Steps**:
1. Link project: `npx supabase link --project-ref zbscashhrdeofvgjnbsb`
2. Push migrations: `npx supabase db push`
3. Create storage buckets
4. Test locally: `pnpm dev`

**Status**: ✅ Ready to Deploy!