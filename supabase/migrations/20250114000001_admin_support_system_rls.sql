-- ============================================
-- Admin Support System RLS Policies
-- Date: January 14, 2025
-- Purpose: Add missing RLS policies for admin support messaging system
-- ============================================
--
-- PROBLEM:
-- Admin support tables have RLS enabled but no policies,
-- completely blocking the customer support messaging system:
-- 1. admin_conversations - Support ticket threads
-- 2. admin_messages - Messages within conversations
-- 3. admin_conversation_participants - Users in conversations
--
-- SOLUTION:
-- Add comprehensive RLS policies to enable support communications
-- while maintaining proper access control.
-- ============================================

-- ============================================
-- 1. ADMIN_CONVERSATIONS TABLE POLICIES
-- ============================================

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Users can view their conversations" ON admin_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON admin_conversations;
DROP POLICY IF EXISTS "Admins can manage all conversations" ON admin_conversations;

-- Policy: Users can view conversations they're participating in
CREATE POLICY "Users can view their conversations"
  ON admin_conversations FOR SELECT
  TO authenticated
  USING (
    -- User is a participant in the conversation
    id IN (
      SELECT conversation_id
      FROM admin_conversation_participants
      WHERE user_id = auth.uid()
    )
    -- OR user is an admin
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Policy: Users can create new conversations (open support tickets)
CREATE POLICY "Users can create conversations"
  ON admin_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Anyone can create a conversation
    -- (The system will automatically add them as a participant)
    true
  );

-- Policy: Users can update conversations they're part of
CREATE POLICY "Users can update their conversations"
  ON admin_conversations FOR UPDATE
  TO authenticated
  USING (
    -- User is a participant
    id IN (
      SELECT conversation_id
      FROM admin_conversation_participants
      WHERE user_id = auth.uid()
    )
    -- OR user is an admin
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    -- User is a participant
    id IN (
      SELECT conversation_id
      FROM admin_conversation_participants
      WHERE user_id = auth.uid()
    )
    -- OR user is an admin
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Policy: Admins can manage all conversations
CREATE POLICY "Admins can manage all conversations"
  ON admin_conversations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- 2. ADMIN_MESSAGES TABLE POLICIES
-- ============================================

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON admin_messages;
DROP POLICY IF EXISTS "Users can send messages" ON admin_messages;
DROP POLICY IF EXISTS "Users can edit their own messages" ON admin_messages;
DROP POLICY IF EXISTS "Admins can manage all messages" ON admin_messages;

-- Policy: Users can view messages in conversations they're part of
CREATE POLICY "Users can view messages in their conversations"
  ON admin_messages FOR SELECT
  TO authenticated
  USING (
    -- User is a participant in the conversation
    conversation_id IN (
      SELECT conversation_id
      FROM admin_conversation_participants
      WHERE user_id = auth.uid()
    )
    -- AND message is not an internal admin note (unless user is admin)
    AND (
      is_internal = false
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
      )
    )
  );

-- Policy: Users can send messages in their conversations
CREATE POLICY "Users can send messages"
  ON admin_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Message sender must be the authenticated user
    sender_id = auth.uid()
    -- AND user must be a participant in the conversation
    AND conversation_id IN (
      SELECT conversation_id
      FROM admin_conversation_participants
      WHERE user_id = auth.uid()
    )
    -- Regular users cannot send internal notes
    AND (
      is_internal = false
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
      )
    )
  );

-- Policy: Users can edit their own recent messages
CREATE POLICY "Users can edit their own messages"
  ON admin_messages FOR UPDATE
  TO authenticated
  USING (
    -- Must be the sender
    sender_id = auth.uid()
    -- Message must be less than 15 minutes old
    AND created_at > (NOW() - INTERVAL '15 minutes')
  )
  WITH CHECK (
    -- Must remain the sender
    sender_id = auth.uid()
    -- Cannot change is_internal flag
    AND is_internal = (
      SELECT is_internal
      FROM admin_messages
      WHERE id = admin_messages.id
    )
  );

-- Policy: Admins can manage all messages
CREATE POLICY "Admins can manage all messages"
  ON admin_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- 3. ADMIN_CONVERSATION_PARTICIPANTS TABLE POLICIES
-- ============================================

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Users can view participants" ON admin_conversation_participants;
DROP POLICY IF EXISTS "System can add participants" ON admin_conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON admin_conversation_participants;
DROP POLICY IF EXISTS "Admins can manage participants" ON admin_conversation_participants;

-- Policy: Users can view participants in their conversations
CREATE POLICY "Users can view participants"
  ON admin_conversation_participants FOR SELECT
  TO authenticated
  USING (
    -- User can see participants if they're in the conversation
    conversation_id IN (
      SELECT conversation_id
      FROM admin_conversation_participants acp
      WHERE acp.user_id = auth.uid()
    )
    -- OR user is an admin
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Policy: System and admins can add participants
CREATE POLICY "System can add participants"
  ON admin_conversation_participants FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    -- Service role can always add
    auth.role() = 'service_role'
    -- OR user is adding themselves to a conversation
    OR user_id = auth.uid()
    -- OR user is an admin
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Policy: Users can remove themselves from conversations
CREATE POLICY "Users can leave conversations"
  ON admin_conversation_participants FOR DELETE
  TO authenticated
  USING (
    -- User can only remove themselves
    user_id = auth.uid()
    -- OR user is an admin
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Policy: Users can update their participation status
CREATE POLICY "Users can update their participation"
  ON admin_conversation_participants FOR UPDATE
  TO authenticated
  USING (
    -- User can only update their own participation
    user_id = auth.uid()
    -- OR user is an admin
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    -- Cannot change user_id
    user_id = auth.uid()
    -- OR user is an admin
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Policy: Admins can manage all participants
CREATE POLICY "Admins can manage participants"
  ON admin_conversation_participants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- 4. EMAIL_TEMPLATES TABLE POLICIES
-- ============================================

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Everyone can view active templates" ON email_templates;
DROP POLICY IF EXISTS "Admins can manage templates" ON email_templates;

-- Policy: Everyone can view active email templates
-- (Needed for the system to send emails)
CREATE POLICY "Everyone can view active templates"
  ON email_templates FOR SELECT
  USING (is_active = true);

-- Policy: Only admins can manage email templates
CREATE POLICY "Admins can manage templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Users can view their conversations" ON admin_conversations IS
  'Allows users to view support conversations they are participating in';

COMMENT ON POLICY "Users can create conversations" ON admin_conversations IS
  'Allows any authenticated user to open a new support ticket';

COMMENT ON POLICY "Users can view messages in their conversations" ON admin_messages IS
  'Allows users to read messages in their support conversations, excluding internal admin notes';

COMMENT ON POLICY "Users can send messages" ON admin_messages IS
  'Allows users to send messages in conversations they are part of';

COMMENT ON POLICY "Users can view participants" ON admin_conversation_participants IS
  'Allows users to see who is participating in their support conversations';

COMMENT ON POLICY "System can add participants" ON admin_conversation_participants IS
  'Allows the system to add participants when creating conversations';

COMMENT ON POLICY "Everyone can view active templates" ON email_templates IS
  'Makes active email templates accessible to the system for sending notifications';

COMMENT ON POLICY "Admins can manage templates" ON email_templates IS
  'Gives admins full control over email template management';

-- ============================================
-- VERIFICATION
-- ============================================

-- List all policies created for verification
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'admin_conversations',
    'admin_messages',
    'admin_conversation_participants',
    'email_templates'
  )
ORDER BY tablename, policyname;