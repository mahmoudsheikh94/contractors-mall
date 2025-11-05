-- ==========================================
-- Phase 2C: Order & Customer Management Enhancements
-- Date: November 5, 2025
-- FIXED VERSION: Corrected foreign key references to orders(id)
-- ==========================================

-- ==========================================
-- 1. ENHANCE ORDERS TABLE
-- ==========================================

-- Add new fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS special_requests TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_reference TEXT;

COMMENT ON COLUMN orders.delivery_instructions IS 'Special delivery instructions from contractor';
COMMENT ON COLUMN orders.special_requests IS 'Special requests or notes from contractor';
COMMENT ON COLUMN orders.internal_reference IS 'Supplier internal reference number';

-- ==========================================
-- 2. ORDER ACTIVITIES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS order_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'status_change', 'note_added', 'edited', 'tag_added', 'tag_removed'
  description TEXT NOT NULL,
  metadata JSONB, -- Additional context (old_value, new_value, etc.)
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_activities_order ON order_activities(order_id);
CREATE INDEX IF NOT EXISTS idx_order_activities_created_at ON order_activities(created_at DESC);

COMMENT ON TABLE order_activities IS 'Timeline of all activities on an order';
COMMENT ON COLUMN order_activities.metadata IS 'JSON object with activity-specific data';

-- ==========================================
-- 3. ORDER NOTES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS order_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_notes_order ON order_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_notes_created_at ON order_notes(created_at DESC);

COMMENT ON TABLE order_notes IS 'Notes and comments on orders';
COMMENT ON COLUMN order_notes.is_internal IS 'If true, note is only visible to supplier';

-- ==========================================
-- 4. ORDER TAGS SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS order_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6', -- hex color code
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, name)
);

CREATE INDEX IF NOT EXISTS idx_order_tags_supplier ON order_tags(supplier_id);

COMMENT ON TABLE order_tags IS 'Custom tags for organizing orders';
COMMENT ON COLUMN order_tags.color IS 'Hex color code for tag display';

-- Junction table for order-tag assignments
CREATE TABLE IF NOT EXISTS order_tag_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES order_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_order_tag_assignments_order ON order_tag_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tag_assignments_tag ON order_tag_assignments(tag_id);

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on new tables
ALTER TABLE order_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Order Activities Policies
CREATE POLICY "Suppliers can view activities for their orders"
  ON order_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_activities.order_id
      AND orders.supplier_id IN (
        SELECT id FROM suppliers WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Suppliers can create activities for their orders"
  ON order_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_activities.order_id
      AND orders.supplier_id IN (
        SELECT id FROM suppliers WHERE owner_id = auth.uid()
      )
    )
  );

-- Order Notes Policies
CREATE POLICY "Suppliers can view notes for their orders"
  ON order_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_notes.order_id
      AND orders.supplier_id IN (
        SELECT id FROM suppliers WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Suppliers can create notes for their orders"
  ON order_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_notes.order_id
      AND orders.supplier_id IN (
        SELECT id FROM suppliers WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Suppliers can update their own notes"
  ON order_notes FOR UPDATE
  USING (
    created_by = auth.uid()
  );

CREATE POLICY "Suppliers can delete their own notes"
  ON order_notes FOR DELETE
  USING (
    created_by = auth.uid()
  );

-- Order Tags Policies
CREATE POLICY "Suppliers can view their own tags"
  ON order_tags FOR SELECT
  USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can create their own tags"
  ON order_tags FOR INSERT
  WITH CHECK (
    supplier_id IN (
      SELECT id FROM suppliers WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can update their own tags"
  ON order_tags FOR UPDATE
  USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can delete their own tags"
  ON order_tags FOR DELETE
  USING (
    supplier_id IN (
      SELECT id FROM suppliers WHERE owner_id = auth.uid()
    )
  );

-- Order Tag Assignments Policies
CREATE POLICY "Suppliers can view tag assignments for their orders"
  ON order_tag_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_tag_assignments.order_id
      AND orders.supplier_id IN (
        SELECT id FROM suppliers WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Suppliers can assign tags to their orders"
  ON order_tag_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_tag_assignments.order_id
      AND orders.supplier_id IN (
        SELECT id FROM suppliers WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Suppliers can remove tags from their orders"
  ON order_tag_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_tag_assignments.order_id
      AND orders.supplier_id IN (
        SELECT id FROM suppliers WHERE owner_id = auth.uid()
      )
    )
  );

-- ==========================================
-- 6. FUNCTIONS AND TRIGGERS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for order_notes
DROP TRIGGER IF EXISTS update_order_notes_updated_at ON order_notes;
CREATE TRIGGER update_order_notes_updated_at
  BEFORE UPDATE ON order_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for order_tags
DROP TRIGGER IF EXISTS update_order_tags_updated_at ON order_tags;
CREATE TRIGGER update_order_tags_updated_at
  BEFORE UPDATE ON order_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create activity when note is added
CREATE OR REPLACE FUNCTION create_activity_on_note_added()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO order_activities (order_id, activity_type, description, created_by, metadata)
  VALUES (
    NEW.order_id,
    'note_added',
    CASE
      WHEN NEW.is_internal THEN 'أضاف ملاحظة داخلية'
      ELSE 'أضاف ملاحظة'
    END,
    NEW.created_by,
    jsonb_build_object('note_id', NEW.id, 'is_internal', NEW.is_internal)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_activity_on_note ON order_notes;
CREATE TRIGGER create_activity_on_note
  AFTER INSERT ON order_notes
  FOR EACH ROW
  EXECUTE FUNCTION create_activity_on_note_added();

-- ==========================================
-- 7. VIEWS FOR ANALYTICS
-- ==========================================

-- View for customer order statistics
CREATE OR REPLACE VIEW customer_order_stats AS
SELECT
  o.contractor_id,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.total_jod) as total_spent,
  AVG(o.total_jod) as average_order_value,
  MAX(o.created_at) as last_order_date,
  MIN(o.created_at) as first_order_date,
  o.supplier_id
FROM orders o
GROUP BY o.contractor_id, o.supplier_id;

COMMENT ON VIEW customer_order_stats IS 'Aggregated statistics per customer per supplier';

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
