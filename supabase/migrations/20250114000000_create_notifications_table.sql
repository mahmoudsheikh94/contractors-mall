-- Create In-App Notifications Table
-- ====================================
--
-- Stores notifications for contractors and other users
-- Used for: invoice ready, order updates, payment released, etc.

CREATE TABLE IF NOT EXISTS in_app_notifications (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification content
  type TEXT NOT NULL, -- 'invoice_ready', 'order_update', 'payment_released', 'delivery_scheduled', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Navigation
  link TEXT, -- Deep link to relevant page (e.g., /orders/123)
  metadata JSONB, -- Additional data (invoice_id, order_id, etc.)

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON in_app_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON in_app_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System can create notifications (authenticated users with proper permissions)
CREATE POLICY "System can create notifications"
  ON in_app_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Will be restricted by application logic

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Index for fetching user notifications sorted by date
CREATE INDEX idx_notifications_user_created
  ON in_app_notifications(user_id, created_at DESC);

-- Index for filtering unread notifications
CREATE INDEX idx_notifications_user_unread
  ON in_app_notifications(user_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

-- Index for notification type queries
CREATE INDEX idx_notifications_type
  ON in_app_notifications(type);

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON TABLE in_app_notifications IS 'In-app notifications for contractors and users. Used for order updates, invoice ready alerts, payment notifications, etc.';
COMMENT ON COLUMN in_app_notifications.type IS 'Notification type: invoice_ready, order_update, payment_released, delivery_scheduled, etc.';
COMMENT ON COLUMN in_app_notifications.link IS 'Deep link to navigate to relevant page when notification is clicked';
COMMENT ON COLUMN in_app_notifications.metadata IS 'Additional structured data related to the notification (invoice_id, order_id, etc.)';
