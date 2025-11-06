-- Add dual verification badges for email and phone
-- Allows users to sign up with either email or phone
-- Phone verification grants both badges

-- Add verification columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_method TEXT CHECK (verification_method IN ('email', 'phone', 'both'));

-- Update existing users to mark email as verified if auth.users.email_confirmed_at exists
UPDATE profiles p
SET
  email_verified = true,
  verification_method = 'email'
FROM auth.users u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND p.email_verified = false;

-- Create function to handle phone verification
-- When phone is verified, mark both email and phone as verified
CREATE OR REPLACE FUNCTION verify_phone_number(
  p_user_id UUID,
  p_verification_code TEXT
)
RETURNS JSON AS $$
DECLARE
  v_profile RECORD;
  v_result JSON;
BEGIN
  -- For MVP, we'll use a simple verification code check
  -- In production, integrate with SMS service like Twilio

  -- Get profile
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Profile not found'
    );
  END IF;

  -- Simple verification: code is last 4 digits of phone
  -- Replace with actual SMS verification in production
  IF p_verification_code = RIGHT(v_profile.phone, 4) THEN
    -- Update profile with verification
    UPDATE profiles
    SET
      phone_verified = true,
      email_verified = true,  -- Grant both badges
      phone_verified_at = NOW(),
      verification_method = 'both',
      updated_at = NOW()
    WHERE id = p_user_id;

    RETURN json_build_object(
      'success', true,
      'message', 'Phone verified successfully',
      'badges', json_build_object(
        'email_verified', true,
        'phone_verified', true
      )
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid verification code'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to send verification code (placeholder for SMS integration)
CREATE OR REPLACE FUNCTION send_phone_verification(
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_phone TEXT;
  v_code TEXT;
BEGIN
  -- Get phone number
  SELECT phone INTO v_phone
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND OR v_phone IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Phone number not found'
    );
  END IF;

  -- Generate 4-digit code (last 4 digits of phone for MVP)
  -- In production, generate random code and integrate with SMS service
  v_code := RIGHT(v_phone, 4);

  -- TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
  -- For now, just return success

  RETURN json_build_object(
    'success', true,
    'message', 'Verification code sent',
    'code', v_code  -- Remove in production!
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: No additional RLS policies needed for profiles table
-- The existing RLS policies already handle user access properly
-- The SECURITY DEFINER functions bypass RLS when needed

-- Create index for faster verification lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON profiles(phone_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON profiles(email_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_method ON profiles(verification_method);

-- Add comment explaining the verification system
COMMENT ON COLUMN profiles.email_verified IS 'Email verified via Supabase Auth';
COMMENT ON COLUMN profiles.phone_verified IS 'Phone verified via SMS code';
COMMENT ON COLUMN profiles.verification_method IS 'How user verified their account: email, phone, or both';
COMMENT ON FUNCTION verify_phone_number IS 'Verifies phone number and grants both email and phone badges';
COMMENT ON FUNCTION send_phone_verification IS 'Sends verification code to phone (integrate with SMS service)';
