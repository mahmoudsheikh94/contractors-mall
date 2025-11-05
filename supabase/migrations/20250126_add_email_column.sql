-- Migration: Add email column to profiles table
-- Run this if you get the error: "Could not find the 'email' column of 'profiles' in the schema cache"
-- This happens if you ran the initial migration before the email column was added

-- Add email column to existing profiles table (safe - preserves existing data)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
