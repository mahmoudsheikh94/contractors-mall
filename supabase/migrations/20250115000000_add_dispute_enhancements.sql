-- =============================================
-- Dispute Enhancements Migration
-- =============================================
-- Adds timeline tracking, evidence upload, and messaging features

-- Dispute Events Table (for timeline)
CREATE TABLE IF NOT EXISTS dispute_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'status_changed', 'note_added',
    'evidence_uploaded', 'message_sent', 'resolved',
    'site_visit_scheduled', 'site_visit_completed',
    'payment_action'
  )),
  description TEXT,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dispute Evidence Table
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dispute Messages Table
CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  is_admin_message BOOLEAN DEFAULT FALSE,
  is_internal BOOLEAN DEFAULT FALSE, -- Internal notes only visible to admins
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Preferences Tables
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  email_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  email_frequency TEXT DEFAULT 'instant' CHECK (email_frequency IN ('instant', 'daily', 'weekly')),
  sms_enabled BOOLEAN DEFAULT TRUE,
  sms_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  sms_quiet_hours_start TIME,
  sms_quiet_hours_end TIME,
  push_enabled BOOLEAN DEFAULT FALSE,
  push_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  language TEXT DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
  timezone TEXT DEFAULT 'Asia/Amman',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Supplier Notification Preferences
CREATE TABLE IF NOT EXISTS supplier_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  email_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  email_frequency TEXT DEFAULT 'instant' CHECK (email_frequency IN ('instant', 'daily', 'weekly')),
  sms_enabled BOOLEAN DEFAULT TRUE,
  sms_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  sms_quiet_hours_start TIME,
  sms_quiet_hours_end TIME,
  push_enabled BOOLEAN DEFAULT FALSE,
  push_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  language TEXT DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
  timezone TEXT DEFAULT 'Asia/Amman',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_email TEXT,
  recipient_phone TEXT,
  data JSONB NOT NULL,
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'queued', 'sending', 'sent',
    'delivered', 'failed', 'bounced', 'unsubscribed'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id),
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  provider_response JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage bucket for dispute evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('dispute-evidence', 'dispute-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for dispute evidence
CREATE POLICY "Authenticated users can upload dispute evidence" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dispute-evidence');

CREATE POLICY "Anyone can view dispute evidence" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'dispute-evidence');

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dispute_events_dispute_id ON dispute_events(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_events_created_at ON dispute_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created_at ON dispute_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_notification_id ON notification_logs(notification_id);

-- RLS Policies for dispute tables
ALTER TABLE dispute_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Dispute Events Policies
CREATE POLICY "Users can view dispute events for their disputes"
ON dispute_events FOR SELECT
TO authenticated
USING (
  dispute_id IN (
    SELECT id FROM disputes
    WHERE opened_by = auth.uid()
    OR order_id IN (
      SELECT id FROM orders
      WHERE contractor_id = auth.uid()
      OR supplier_id IN (
        SELECT id FROM suppliers
        WHERE owner_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Admins can manage all dispute events"
ON dispute_events FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Dispute Evidence Policies
CREATE POLICY "Users can view evidence for their disputes"
ON dispute_evidence FOR SELECT
TO authenticated
USING (
  dispute_id IN (
    SELECT id FROM disputes
    WHERE opened_by = auth.uid()
    OR order_id IN (
      SELECT id FROM orders
      WHERE contractor_id = auth.uid()
      OR supplier_id IN (
        SELECT id FROM suppliers
        WHERE owner_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Authenticated users can upload evidence"
ON dispute_evidence FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Admins can manage all evidence"
ON dispute_evidence FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Dispute Messages Policies
CREATE POLICY "Users can view non-internal messages for their disputes"
ON dispute_messages FOR SELECT
TO authenticated
USING (
  (NOT is_internal OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ))
  AND dispute_id IN (
    SELECT id FROM disputes
    WHERE opened_by = auth.uid()
    OR order_id IN (
      SELECT id FROM orders
      WHERE contractor_id = auth.uid()
      OR supplier_id IN (
        SELECT id FROM suppliers
        WHERE owner_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can send messages to their disputes"
ON dispute_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND dispute_id IN (
    SELECT id FROM disputes
    WHERE opened_by = auth.uid()
    OR order_id IN (
      SELECT id FROM orders
      WHERE contractor_id = auth.uid()
      OR supplier_id IN (
        SELECT id FROM suppliers
        WHERE owner_id = auth.uid()
      )
    )
  )
);

-- Notification Preferences Policies
CREATE POLICY "Users can manage their own notification preferences"
ON notification_preferences FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Functions for automated events
CREATE OR REPLACE FUNCTION log_dispute_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO dispute_events (
      dispute_id,
      event_type,
      description,
      metadata,
      user_id
    ) VALUES (
      NEW.id,
      'status_changed',
      'تم تغيير حالة النزاع',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      ),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status changes
CREATE TRIGGER on_dispute_status_change
  AFTER UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION log_dispute_status_change();

-- Function to log dispute creation
CREATE OR REPLACE FUNCTION log_dispute_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO dispute_events (
    dispute_id,
    event_type,
    description,
    user_id,
    metadata
  ) VALUES (
    NEW.id,
    'created',
    'تم فتح نزاع جديد',
    NEW.opened_by,
    jsonb_build_object(
      'reason', NEW.reason,
      'order_id', NEW.order_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for dispute creation
CREATE TRIGGER on_dispute_created
  AFTER INSERT ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION log_dispute_creation();

-- Add sample notification preferences for existing users
INSERT INTO notification_preferences (user_id, email_types, sms_types)
SELECT
  id,
  ARRAY['order_confirmation', 'payment_success', 'dispute_created', 'delivery_pin']::TEXT[],
  ARRAY['delivery_pin', 'delivery_started']::TEXT[]
FROM auth.users
WHERE id IN (SELECT id FROM profiles WHERE role = 'contractor')
ON CONFLICT (user_id) DO NOTHING;