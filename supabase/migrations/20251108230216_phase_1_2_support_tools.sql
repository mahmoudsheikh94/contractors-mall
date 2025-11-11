-- ============================================================================
-- PHASE 1.2: COMPLETE CUSTOMER SUPPORT TOOLS MIGRATION
-- ============================================================================
-- Date: 2025-11-08
-- Purpose: Add comprehensive customer support capabilities
-- Features:
--   1. Full-text search on orders
--   2. In-app messaging system (admin <-> users)
--   3. Email templates management
--   4. Activity feed view
-- ============================================================================

-- ============================================================================
-- PART 1: FULL-TEXT SEARCH
-- ============================================================================

-- Create full-text search index on orders
CREATE INDEX IF NOT EXISTS orders_search_idx ON orders
USING GIN (to_tsvector('english',
  coalesce(order_number, '') || ' ' ||
  coalesce(delivery_address, '') || ' ' ||
  coalesce(delivery_phone, '') || ' ' ||
  coalesce(special_requests, '')
));

-- Add Arabic search support
CREATE INDEX IF NOT EXISTS orders_search_ar_idx ON orders
USING GIN (to_tsvector('arabic',
  coalesce(delivery_address, '') || ' ' ||
  coalesce(special_requests, '')
));

COMMENT ON INDEX orders_search_idx IS 'Full-text search index for orders (English)';
COMMENT ON INDEX orders_search_ar_idx IS 'Full-text search index for orders (Arabic)';

-- ============================================================================
-- PART 2: IN-APP MESSAGING SYSTEM
-- ============================================================================

-- Conversations table
CREATE TABLE IF NOT EXISTS admin_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_admin_conversations_status ON admin_conversations(status);
CREATE INDEX idx_admin_conversations_order_id ON admin_conversations(order_id);
CREATE INDEX idx_admin_conversations_created_at ON admin_conversations(created_at DESC);

COMMENT ON TABLE admin_conversations IS 'Support conversations between admins and users';
COMMENT ON COLUMN admin_conversations.order_id IS 'Optional reference to related order';
COMMENT ON COLUMN admin_conversations.priority IS 'Conversation priority for support triage';

-- Conversation participants table
CREATE TABLE IF NOT EXISTS admin_conversation_participants (
  conversation_id UUID NOT NULL REFERENCES admin_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_admin_conversation_participants_user_id ON admin_conversation_participants(user_id);

COMMENT ON TABLE admin_conversation_participants IS 'Tracks who is participating in each conversation';

-- Messages table
CREATE TABLE IF NOT EXISTS admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES admin_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  attachments TEXT[], -- URLs to uploaded files
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_internal BOOLEAN NOT NULL DEFAULT false, -- Admin-only notes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_admin_messages_conversation_id ON admin_messages(conversation_id);
CREATE INDEX idx_admin_messages_sender_id ON admin_messages(sender_id);
CREATE INDEX idx_admin_messages_created_at ON admin_messages(created_at DESC);

COMMENT ON TABLE admin_messages IS 'Messages within support conversations';
COMMENT ON COLUMN admin_messages.is_internal IS 'If true, only visible to admins (internal notes)';

-- ============================================================================
-- PART 3: EMAIL TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  subject_ar TEXT NOT NULL,
  subject_en TEXT NOT NULL,
  body_ar TEXT NOT NULL,
  body_en TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of variable names
  category TEXT NOT NULL DEFAULT 'general', -- 'orders', 'support', 'marketing', 'general'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active);

COMMENT ON TABLE email_templates IS 'Email templates for admin communications';
COMMENT ON COLUMN email_templates.variables IS 'Array of variable names that can be used in template, e.g. ["customer_name", "order_number"]';

-- ============================================================================
-- PART 4: ACTIVITY FEED VIEW
-- ============================================================================

-- Create view for unified activity feed
CREATE OR REPLACE VIEW admin_activity_feed AS
-- Order created events
SELECT
  'order_created' as event_type,
  o.id as reference_id,
  o.created_at as event_time,
  o.contractor_id as user_id,
  json_build_object(
    'order_number', o.order_number,
    'total_jod', o.total_jod,
    'status', o.status,
    'supplier_id', o.supplier_id
  ) as metadata,
  o.created_at as created_at
FROM orders o

UNION ALL

-- Order status changed events
SELECT
  'order_status_changed' as event_type,
  o.id as reference_id,
  o.updated_at as event_time,
  o.contractor_id as user_id,
  json_build_object(
    'order_number', o.order_number,
    'status', o.status
  ) as metadata,
  o.updated_at as created_at
FROM orders o

UNION ALL

-- Dispute opened events
SELECT
  'dispute_opened' as event_type,
  d.id as reference_id,
  d.created_at as event_time,
  d.opened_by as user_id,
  json_build_object(
    'order_id', d.order_id,
    'reason', d.reason,
    'status', d.status
  ) as metadata,
  d.created_at as created_at
FROM disputes d

UNION ALL

-- Payment events
SELECT
  'payment_status_changed' as event_type,
  p.id as reference_id,
  COALESCE(p.released_at, p.refunded_at, p.held_at, p.created_at) as event_time,
  o.contractor_id as user_id,
  json_build_object(
    'order_id', p.order_id,
    'amount_jod', p.amount_jod,
    'status', p.status
  ) as metadata,
  COALESCE(p.released_at, p.refunded_at, p.held_at, p.created_at) as created_at
FROM payments p
JOIN orders o ON o.id = p.order_id

UNION ALL

-- Delivery events
SELECT
  'delivery_completed' as event_type,
  d.delivery_id as reference_id,
  d.created_at as event_time,
  o.contractor_id as user_id,
  json_build_object(
    'order_id', d.order_id,
    'driver_id', d.driver_id,
    'has_proof', CASE WHEN d.proof_photo_url IS NOT NULL THEN true ELSE false END,
    'pin_verified', COALESCE(d.pin_verified, false)
  ) as metadata,
  d.created_at as created_at
FROM deliveries d
JOIN orders o ON o.id = d.order_id

ORDER BY created_at DESC;

COMMENT ON VIEW admin_activity_feed IS 'Unified activity feed for admin support dashboard';

-- ============================================================================
-- PART 5: RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE admin_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Admin conversations policies
CREATE POLICY "Admins can view all conversations" ON admin_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Users can view their conversations" ON admin_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_conversation_participants
      WHERE admin_conversation_participants.conversation_id = admin_conversations.id
      AND admin_conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create conversations" ON admin_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can update conversations" ON admin_conversations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Conversation participants policies
CREATE POLICY "Admins can view all participants" ON admin_conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Users can view their participations" ON admin_conversation_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage participants" ON admin_conversation_participants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Admin messages policies
CREATE POLICY "Admins can view all messages" ON admin_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Users can view non-internal messages in their conversations" ON admin_messages
  FOR SELECT
  TO authenticated
  USING (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM admin_conversation_participants
      WHERE admin_conversation_participants.conversation_id = admin_messages.conversation_id
      AND admin_conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can send all messages" ON admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    AND sender_id = auth.uid()
  );

CREATE POLICY "Users can send non-internal messages" ON admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_internal = false
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM admin_conversation_participants
      WHERE admin_conversation_participants.conversation_id = admin_messages.conversation_id
      AND admin_conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update message read status" ON admin_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Email templates policies
CREATE POLICY "Admins can view all templates" ON email_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can manage templates" ON email_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Service role bypass for all tables
CREATE POLICY "Service role full access admin_conversations" ON admin_conversations
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access admin_conversation_participants" ON admin_conversation_participants
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access admin_messages" ON admin_messages
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access email_templates" ON email_templates
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 6: SEED DEFAULT EMAIL TEMPLATES
-- ============================================================================

INSERT INTO email_templates (name, description, subject_ar, subject_en, body_ar, body_en, variables, category)
VALUES
(
  'order_issue',
  'Notify customer about an issue with their order',
  'مشكلة في الطلب #{order_number}',
  'Issue with Order #{order_number}',
  'عزيزي {customer_name}،

نحن نتواصل معك بخصوص طلبك رقم #{order_number}.

{issue_description}

نحن نعمل على حل هذه المشكلة في أسرع وقت ممكن. سنبقيك على اطلاع بأي تطورات.

إذا كان لديك أي أسئلة، يرجى الرد على هذا البريد الإلكتروني.

مع أطيب التحيات،
فريق مول المقاول',
  'Dear {customer_name},

We are contacting you regarding your order #{order_number}.

{issue_description}

We are working to resolve this issue as quickly as possible. We will keep you informed of any developments.

If you have any questions, please reply to this email.

Best regards,
Contractors Mall Team',
  '["customer_name", "order_number", "issue_description"]'::jsonb,
  'orders'
),
(
  'order_update',
  'General order status update',
  'تحديث الطلب #{order_number}',
  'Order Update #{order_number}',
  'عزيزي {customer_name}،

نود إعلامك بتحديث على طلبك رقم #{order_number}.

الحالة الحالية: {order_status}

{update_message}

شكراً لاستخدامك مول المقاول.

مع أطيب التحيات،
فريق مول المقاول',
  'Dear {customer_name},

We would like to inform you of an update to your order #{order_number}.

Current Status: {order_status}

{update_message}

Thank you for using Contractors Mall.

Best regards,
Contractors Mall Team',
  '["customer_name", "order_number", "order_status", "update_message"]'::jsonb,
  'orders'
),
(
  'support_response',
  'Response to customer support inquiry',
  'رد على استفسارك',
  'Response to Your Inquiry',
  'عزيزي {customer_name}،

شكراً لتواصلك معنا.

{response_message}

إذا كنت بحاجة إلى مزيد من المساعدة، لا تتردد في التواصل معنا.

مع أطيب التحيات،
فريق الدعم - مول المقاول',
  'Dear {customer_name},

Thank you for contacting us.

{response_message}

If you need further assistance, please don''t hesitate to contact us.

Best regards,
Support Team - Contractors Mall',
  '["customer_name", "response_message"]'::jsonb,
  'support'
),
(
  'welcome_supplier',
  'Welcome email for newly verified suppliers',
  'مرحباً بك في مول المقاول!',
  'Welcome to Contractors Mall!',
  'عزيزي {supplier_name}،

نحن سعداء بالترحيب بك في منصة مول المقاول!

تم التحقق من حسابك بنجاح، ويمكنك الآن البدء في:
• إضافة منتجاتك
• استقبال الطلبات
• إدارة عملك

يمكنك الوصول إلى لوحة التحكم الخاصة بك على: {dashboard_url}

إذا كنت بحاجة إلى أي مساعدة، فريق الدعم لدينا جاهز لمساعدتك.

مع أطيب التحيات،
فريق مول المقاول',
  'Dear {supplier_name},

We are pleased to welcome you to the Contractors Mall platform!

Your account has been successfully verified, and you can now start:
• Adding your products
• Receiving orders
• Managing your business

You can access your dashboard at: {dashboard_url}

If you need any assistance, our support team is ready to help.

Best regards,
Contractors Mall Team',
  '["supplier_name", "dashboard_url"]'::jsonb,
  'general'
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PART 7: HELPER FUNCTIONS
-- ============================================================================

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_messages_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM admin_messages m
    JOIN admin_conversation_participants cp
      ON cp.conversation_id = m.conversation_id
    WHERE cp.user_id = p_user_id
      AND m.is_read = false
      AND m.sender_id != p_user_id
      AND (m.is_internal = false OR EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = p_user_id AND profiles.role = 'admin'
      ))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_unread_messages_count IS 'Get count of unread messages for a user across all conversations';

-- Function to mark all messages in a conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE admin_messages
  SET is_read = true,
      read_at = now()
  WHERE conversation_id = p_conversation_id
    AND is_read = false
    AND sender_id != p_user_id;

  UPDATE admin_conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_conversation_read IS 'Mark all messages in a conversation as read for a specific user';

-- ============================================================================
-- VERIFICATION AND SUCCESS REPORT
-- ============================================================================

DO $$
DECLARE
  v_search_index_exists BOOLEAN;
  v_conversations_count INTEGER;
  v_templates_count INTEGER;
  v_activity_feed_exists BOOLEAN;
BEGIN
  -- Check search indexes
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'orders_search_idx'
  ) INTO v_search_index_exists;

  -- Count conversations table
  SELECT COUNT(*) INTO v_conversations_count
  FROM information_schema.tables
  WHERE table_name = 'admin_conversations';

  -- Count email templates
  SELECT COUNT(*) INTO v_templates_count
  FROM email_templates;

  -- Check activity feed view
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name = 'admin_activity_feed'
  ) INTO v_activity_feed_exists;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PHASE 1.2 MIGRATION COMPLETED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 VERIFICATION RESULTS:';
  RAISE NOTICE '   • Search indexes created: %', CASE WHEN v_search_index_exists THEN '✅ Yes' ELSE '❌ No' END;
  RAISE NOTICE '   • Messaging tables created: %', CASE WHEN v_conversations_count > 0 THEN '✅ Yes' ELSE '❌ No' END;
  RAISE NOTICE '   • Email templates seeded: % templates', v_templates_count;
  RAISE NOTICE '   • Activity feed view: %', CASE WHEN v_activity_feed_exists THEN '✅ Created' ELSE '❌ Missing' END;
  RAISE NOTICE '';
  RAISE NOTICE '🔧 FEATURES ADDED:';
  RAISE NOTICE '   1. Full-text search on orders (English + Arabic)';
  RAISE NOTICE '   2. In-app messaging system';
  RAISE NOTICE '   3. Email templates (4 default templates)';
  RAISE NOTICE '   4. Activity feed view for support dashboard';
  RAISE NOTICE '   5. RLS policies for all new tables';
  RAISE NOTICE '   6. Helper functions for messaging';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT STEPS:';
  RAISE NOTICE '   1. Build API endpoints for new features';
  RAISE NOTICE '   2. Create frontend components';
  RAISE NOTICE '   3. Test bulk operations';
  RAISE NOTICE '   4. Configure email service (Resend)';
  RAISE NOTICE '';
END $$;
