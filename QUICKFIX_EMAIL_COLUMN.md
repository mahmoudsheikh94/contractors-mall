# Quick Fix: Add Email Column to Profiles Table

## Error You're Seeing
```
Could not find the 'email' column of 'profiles' in the schema cache
```

## Why This Happened
You ran the initial database migration before the `email` column was added to support magic link authentication.

## Fix (Takes 30 seconds)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Click on "SQL Editor" in the left sidebar

### Step 2: Run This Command
Copy and paste this into the SQL Editor and click "Run":

```sql
-- Add email column to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
```

### Step 3: Done!
That's it! Now go back to your app and try completing your profile again. The error should be gone.

## What This Does
- Adds an `email TEXT` column to your existing `profiles` table
- Creates an index on the `email` column for faster lookups
- Uses `IF NOT EXISTS` so it's safe to run multiple times
- **Preserves all your existing data** - doesn't delete anything

## Verification
After running the command, you should see:
```
Success. No rows returned
```

This means the column was added successfully!

## Need Help?
If you still see the error after running this:
1. Make sure you clicked "Run" in the SQL Editor
2. Check that you see "Success" in the results
3. Try refreshing your app page
4. Check the full troubleshooting guide in `SETUP_AUTH.md`
