-- ==========================================
-- Phase 2C Parts 6-7: Customer (Contractor) Insights
-- Phase 2D: Communication & Notifications
-- ==========================================

-- ==========================================
-- 1. CONTRACTOR COMMUNICATIONS (Phase 2C Part 7)
-- ==========================================

CREATE TABLE IF NOT EXISTS contractor_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('order_inquiry', 'complaint', 'feedback', 'general', 'dispute')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contractor_communications_contractor ON contractor_communications(contractor_id);
CREATE INDEX idx_contractor_communications_supplier ON contractor_communications(supplier_id);
CREATE INDEX idx_contractor_communications_order ON contractor_communications(order_id);
CREATE INDEX idx_contractor_communications_created ON contractor_communications(created_at DESC);

-- ==========================================
-- 2. MESSAGES SYSTEM (Phase 2D Part 1)
-- ==========================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('contractor', 'supplier', 'admin', 'driver')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_order ON messages(order_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_unread ON messages(is_read, order_id) WHERE is_read = FALSE;
CREATE INDEX idx_message_attachments_message ON message_attachments(message_id);

-- ==========================================
-- 3. NOTIFICATION SYSTEM (Phase 2D Parts 2-3)
-- ==========================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  -- Email notification preferences
  email_new_order BOOLEAN DEFAULT TRUE,
  email_status_updates BOOLEAN DEFAULT TRUE,
  email_daily_summary BOOLEAN DEFAULT TRUE,
  email_weekly_report BOOLEAN DEFAULT TRUE,
  email_low_stock BOOLEAN DEFAULT TRUE,
  email_messages BOOLEAN DEFAULT TRUE,
  -- In-app notification preferences
  app_new_order BOOLEAN DEFAULT TRUE,
  app_status_updates BOOLEAN DEFAULT TRUE,
  app_messages BOOLEAN DEFAULT TRUE,
  app_low_stock BOOLEAN DEFAULT TRUE,
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  template_id VARCHAR(50) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX idx_email_queue_status ON email_queue(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_email_queue_created ON email_queue(created_at DESC);
CREATE INDEX idx_in_app_notifications_user ON in_app_notifications(user_id, is_read);
CREATE INDEX idx_in_app_notifications_created ON in_app_notifications(created_at DESC);

-- ==========================================
-- 4. CONTRACTOR INSIGHTS VIEW (Phase 2C Part 6)
-- ==========================================

CREATE OR REPLACE VIEW contractor_insights AS
SELECT
  c.id as contractor_id,
  c.full_name as contractor_name,
  c.email as contractor_email,
  c.phone as contractor_phone,
  c.created_at as member_since,
  -- Order statistics
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(o.total_jod), 0) as total_spent,
  COALESCE(AVG(o.total_jod), 0) as average_order_value,
  MAX(o.created_at) as last_order_date,
  -- Order status breakdown
  COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) as completed_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'disputed' THEN o.id END) as disputed_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'rejected' THEN o.id END) as rejected_orders,
  -- Time-based metrics
  DATE_PART('day', NOW() - MAX(o.created_at)) as days_since_last_order,
  COUNT(DISTINCT o.id) FILTER (WHERE o.created_at >= NOW() - INTERVAL '30 days') as orders_last_30_days,
  COUNT(DISTINCT o.id) FILTER (WHERE o.created_at >= NOW() - INTERVAL '90 days') as orders_last_90_days,
  -- Supplier relationship
  s.id as supplier_id,
  s.business_name as supplier_name
FROM profiles c
INNER JOIN orders o ON c.id = o.contractor_id
INNER JOIN suppliers s ON o.supplier_id = s.id
WHERE c.role = 'contractor'
GROUP BY c.id, c.full_name, c.email, c.phone, c.created_at, s.id, s.business_name;

-- Create indexes to improve view performance
CREATE INDEX IF NOT EXISTS idx_orders_contractor_supplier ON orders(contractor_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_status ON orders(created_at DESC, status);

-- ==========================================
-- 5. CONTRACTOR CATEGORY PREFERENCES VIEW
-- ==========================================

CREATE OR REPLACE VIEW contractor_category_preferences AS
SELECT
  o.contractor_id,
  s.supplier_id,
  c.name_ar as category_name_ar,
  c.name_en as category_name_en,
  COUNT(DISTINCT oi.product_id) as unique_products_ordered,
  SUM(oi.quantity) as total_quantity_ordered,
  SUM(oi.total_jod) as total_spent_on_category,
  COUNT(DISTINCT o.id) as orders_with_category,
  MAX(o.created_at) as last_ordered_date
FROM orders o
INNER JOIN suppliers s ON o.supplier_id = s.id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
INNER JOIN categories c ON p.category_id = c.id
WHERE o.status IN ('completed', 'delivered', 'in_delivery')
GROUP BY o.contractor_id, s.supplier_id, c.id, c.name_ar, c.name_en;

-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on new tables
ALTER TABLE contractor_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Contractor Communications Policies
CREATE POLICY "Suppliers can view communications for their contractors"
  ON contractor_communications FOR SELECT
  USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can create communications"
  ON contractor_communications FOR INSERT
  WITH CHECK (
    supplier_id IN (
      SELECT id FROM suppliers WHERE owner_id = auth.uid()
    )
  );

-- Messages Policies
CREATE POLICY "Users can view messages for their orders"
  ON messages FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE contractor_id = auth.uid()
      OR supplier_id IN (
        SELECT id FROM suppliers WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can send messages on their orders"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND order_id IN (
      SELECT id FROM orders
      WHERE contractor_id = auth.uid()
      OR supplier_id IN (
        SELECT id FROM suppliers WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Message Attachments Policies
CREATE POLICY "Users can view attachments for accessible messages"
  ON message_attachments FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM messages
      WHERE order_id IN (
        SELECT id FROM orders
        WHERE contractor_id = auth.uid()
        OR supplier_id IN (
          SELECT id FROM suppliers WHERE owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can add attachments to their messages"
  ON message_attachments FOR INSERT
  WITH CHECK (
    message_id IN (
      SELECT id FROM messages WHERE sender_id = auth.uid()
    )
  );

-- Notification Preferences Policies
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- Email Queue Policies (admin only for security)
CREATE POLICY "Only admins can manage email queue"
  ON email_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- In-App Notifications Policies
CREATE POLICY "Users can view their own notifications"
  ON in_app_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON in_app_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ==========================================
-- 7. FUNCTIONS FOR ANALYTICS
-- ==========================================

-- Function to get contractor lifetime value
CREATE OR REPLACE FUNCTION get_contractor_lifetime_value(
  p_contractor_id UUID,
  p_supplier_id UUID
)
RETURNS TABLE (
  total_revenue DECIMAL(10,2),
  order_count INTEGER,
  avg_order_value DECIMAL(10,2),
  first_order_date TIMESTAMPTZ,
  last_order_date TIMESTAMPTZ,
  customer_tenure_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(o.total_jod), 0)::DECIMAL(10,2) as total_revenue,
    COUNT(o.id)::INTEGER as order_count,
    COALESCE(AVG(o.total_jod), 0)::DECIMAL(10,2) as avg_order_value,
    MIN(o.created_at) as first_order_date,
    MAX(o.created_at) as last_order_date,
    EXTRACT(DAY FROM (MAX(o.created_at) - MIN(o.created_at)))::INTEGER as customer_tenure_days
  FROM orders o
  WHERE o.contractor_id = p_contractor_id
    AND o.supplier_id = p_supplier_id
    AND o.status IN ('completed', 'delivered');
END;
$$ LANGUAGE plpgsql;

-- Function to get contractor purchase frequency
CREATE OR REPLACE FUNCTION get_contractor_purchase_frequency(
  p_contractor_id UUID,
  p_supplier_id UUID,
  p_period_days INTEGER DEFAULT 365
)
RETURNS TABLE (
  month_year TEXT,
  order_count INTEGER,
  total_spent DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') as month_year,
    COUNT(o.id)::INTEGER as order_count,
    SUM(o.total_jod)::DECIMAL(10,2) as total_spent
  FROM orders o
  WHERE o.contractor_id = p_contractor_id
    AND o.supplier_id = p_supplier_id
    AND o.created_at >= NOW() - INTERVAL '1 day' * p_period_days
    AND o.status IN ('completed', 'delivered')
  GROUP BY DATE_TRUNC('month', o.created_at)
  ORDER BY DATE_TRUNC('month', o.created_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 8. TRIGGERS FOR AUTOMATED NOTIFICATIONS
-- ==========================================

-- Trigger function to create notification on order status change
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_contractor_id UUID;
  v_supplier_owner_id UUID;
  v_message TEXT;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get contractor ID
    v_contractor_id := NEW.contractor_id;

    -- Get supplier owner ID
    SELECT owner_id INTO v_supplier_owner_id
    FROM suppliers
    WHERE id = NEW.supplier_id;

    -- Create message based on status
    CASE NEW.status
      WHEN 'accepted' THEN v_message := 'تم قبول طلبك #' || NEW.order_number;
      WHEN 'rejected' THEN v_message := 'تم رفض طلبك #' || NEW.order_number;
      WHEN 'in_delivery' THEN v_message := 'طلبك #' || NEW.order_number || ' قيد التوصيل';
      WHEN 'delivered' THEN v_message := 'تم توصيل طلبك #' || NEW.order_number;
      WHEN 'completed' THEN v_message := 'اكتمل طلبك #' || NEW.order_number;
      WHEN 'disputed' THEN v_message := 'يوجد نزاع على طلبك #' || NEW.order_number;
      ELSE v_message := 'تم تحديث حالة طلبك #' || NEW.order_number;
    END CASE;

    -- Create notification for contractor
    INSERT INTO in_app_notifications (user_id, type, title, message, data)
    VALUES (
      v_contractor_id,
      'order_status_update',
      'تحديث حالة الطلب',
      v_message,
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );

    -- Create notification for supplier (if not the one who changed it)
    IF auth.uid() != v_supplier_owner_id THEN
      INSERT INTO in_app_notifications (user_id, type, title, message, data)
      VALUES (
        v_supplier_owner_id,
        'order_status_update',
        'تحديث حالة الطلب',
        'تم تحديث حالة الطلب #' || NEW.order_number || ' إلى ' || NEW.status,
        jsonb_build_object(
          'order_id', NEW.id,
          'order_number', NEW.order_number,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
    END IF;

    -- Add to email queue if preferences allow
    -- (This would check notification_preferences and add to email_queue)
    -- Simplified for now - actual implementation would be more complex
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for order status changes
DROP TRIGGER IF EXISTS on_order_status_change ON orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

-- Trigger function to mark messages as read when recipient views
CREATE OR REPLACE FUNCTION auto_mark_messages_read()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark message as read if current user is not the sender
  IF NEW.is_read = FALSE AND auth.uid() != NEW.sender_id THEN
    NEW.is_read := TRUE;
    NEW.read_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would need to be implemented differently in practice
-- as it needs to detect when a user actually views the message

-- ==========================================
-- 9. SAMPLE DATA FOR TESTING
-- ==========================================

-- Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM notification_preferences np WHERE np.user_id = profiles.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ==========================================
-- 10. GRANTS AND PERMISSIONS
-- ==========================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON contractor_insights TO authenticated;
GRANT SELECT ON contractor_category_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION get_contractor_lifetime_value TO authenticated;
GRANT EXECUTE ON FUNCTION get_contractor_purchase_frequency TO authenticated;