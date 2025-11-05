# 🚀 Supabase Cloud Setup Guide - Step by Step

## Part 1: Create Your Supabase Project (5 minutes)

### Step 1: Sign Up for Supabase

1. Open your browser and go to: **https://supabase.com**
2. Click **"Start your project"** or **"Sign Up"**
3. Sign up with:
   - GitHub (recommended - instant)
   - OR Email/Password

### Step 2: Create New Project

1. After signing in, click **"New Project"**
2. Choose or create an **Organization** (you can use your personal account)
3. Fill in project details:
   - **Name**: `Contractors Mall` or `مول المقاول`
   - **Database Password**: Create a strong password (SAVE THIS!)
     - Example: `ContractorsMall2024!@#`
     - **IMPORTANT**: Copy this password somewhere safe!
   - **Region**: Choose closest to Jordan:
     - **Europe (Frankfurt)** - Best for MENA region
     - OR **Asia Pacific (Singapore)** if Frankfurt isn't available
   - **Pricing Plan**: Free (perfect for MVP)
4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning...

### Step 3: Get Your Project Credentials

Once the project is ready:

1. **Get Project URL:**
   - Look at the URL in your browser, OR
   - Go to: **Settings** → **API** → **Project URL**
   - It looks like: `https://abcdefghijklmno.supabase.co`
   - **Copy this entire URL**

2. **Get Anon Key:**
   - Go to: **Settings** → **API**
   - Find **Project API keys** section
   - Copy the **`anon` / `public`** key
   - It's a long string starting with `eyJh...`
   - **Copy this entire key**

3. **Get Service Role Key:**
   - Same page (**Settings** → **API**)
   - Find the **`service_role`** key
   - ⚠️ **This is secret - don't share publicly**
   - **Copy this entire key**

### Step 4: Share Credentials with Me

**Paste these 3 items in the chat:**

```
Project URL: https://xxxxx.supabase.co
Anon Key: eyJhbGc...
Service Role Key: eyJhbGc...
```

---

## Part 2: Apply Database Migrations (I'll help with this)

Once you share your credentials, I'll:
1. Create a script to apply all migrations
2. Guide you through running it
3. Verify everything is set up correctly

---

## 🎯 What Happens After Setup

Once complete, you'll have:

### ✅ Database Tables (16 total)
- profiles (user accounts)
- suppliers (material suppliers)
- vehicles (delivery vehicles)
- products (product catalog)
- orders (order management)
- deliveries (delivery tracking)
- payments (escrow payments)
- disputes (QC workflow)
- And 8 more supporting tables

### ✅ SQL Functions (5 total)
- fn_estimate_vehicle (auto vehicle selection)
- fn_visible_suppliers (supplier filtering)
- generate_order_number (unique order IDs)
- get_delivery_approval_method (photo/PIN logic)
- check_site_visit_requirement (dispute rules)

### ✅ Storage Buckets (3 total)
- product_media (product images)
- delivery_proofs (delivery photos/documents)
- dispute_media (dispute evidence)

### ✅ Seed Data
- 3 vehicles (وانيت 1 طن, شاحنة 3.5 طن, قلاب مسطح 5 طن)
- 4 platform settings (thresholds, commission, etc.)
- 7 product categories

---

## 🆘 Troubleshooting

### "I can't find the API keys"
- Go to your project dashboard
- Click **Settings** (gear icon in sidebar)
- Click **API**
- Scroll down to **Project API keys**

### "The project is taking too long to create"
- This is normal for first project (2-3 minutes)
- Refresh the page if stuck
- Check your internet connection

### "I forgot to save my database password"
- You can reset it in: **Settings** → **Database** → **Reset Database Password**
- ⚠️ This will cause downtime, so do it before adding data

### "Wrong region selected"
- You can't change region after creation
- You'd need to create a new project
- But for MVP, any region works fine

---

## 📊 Free Tier Limits (More than enough for MVP)

Your free Supabase project includes:
- ✅ 500 MB database storage
- ✅ 1 GB file storage
- ✅ 50,000 monthly active users
- ✅ 2 GB bandwidth
- ✅ 500,000 Edge Function invocations

**This is plenty for MVP development and initial launch!**

---

## ⏭️ Next Steps

After you share your credentials:
1. I'll create environment files
2. I'll prepare migration scripts
3. We'll apply all database schema
4. We'll run seed data
5. We'll test the connection
6. You'll be ready to develop!

**Go ahead and create your project now, then share the 3 credentials above!** 🚀