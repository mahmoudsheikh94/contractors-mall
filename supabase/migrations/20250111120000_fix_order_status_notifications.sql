-- ==========================================
-- Fix Order Status Change Notifications
-- Date: January 11, 2025
-- ==========================================
--
-- This migration fixes the notify_order_status_change() trigger function to:
-- 1. Handle ALL order statuses (not just a subset)
-- 2. Provide appropriate Arabic messages for each status
-- 3. Only notify contractor for relevant status changes
-- 4. Fix 'accepted' → 'confirmed' mapping

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_order_status_change ON orders;

-- Replace the notification function with complete status coverage
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_contractor_id UUID;
  v_supplier_owner_id UUID;
  v_message TEXT;
  v_should_notify_contractor BOOLEAN := TRUE;
  v_should_notify_supplier BOOLEAN := TRUE;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get contractor ID
    v_contractor_id := NEW.contractor_id;

    -- Get supplier owner ID
    SELECT owner_id INTO v_supplier_owner_id
    FROM suppliers
    WHERE id = NEW.supplier_id;

    -- Create message based on status with full coverage
    CASE NEW.status
      -- Don't notify on initial pending status (order just created)
      WHEN 'pending' THEN
        v_should_notify_contractor := FALSE;
        v_message := 'طلب جديد #' || NEW.order_number;

      -- Confirmed = accepted by supplier
      WHEN 'confirmed' THEN
        v_message := 'تم قبول طلبك من المورد #' || NEW.order_number;

      -- Cancelled
      WHEN 'cancelled' THEN
        v_message := 'تم إلغاء طلبك #' || NEW.order_number;

      -- Awaiting contractor confirmation after delivery
      WHEN 'awaiting_contractor_confirmation' THEN
        v_message := 'تم توصيل طلبك #' || NEW.order_number || ' - يرجى تأكيد الاستلام';

      -- In delivery
      WHEN 'in_delivery' THEN
        v_message := 'طلبك #' || NEW.order_number || ' قيد التوصيل - في الطريق إليك';

      -- Delivered
      WHEN 'delivered' THEN
        v_message := 'تم توصيل طلبك #' || NEW.order_number;

      -- Completed
      WHEN 'completed' THEN
        v_message := 'اكتمل طلبك #' || NEW.order_number || ' - شكراً لتعاملك معنا';

      -- Rejected by supplier
      WHEN 'rejected' THEN
        v_message := 'تم رفض طلبك #' || NEW.order_number;
        IF NEW.rejection_reason IS NOT NULL THEN
          v_message := v_message || ' - ' || NEW.rejection_reason;
        END IF;

      -- Disputed
      WHEN 'disputed' THEN
        v_message := 'يوجد نزاع على طلبك #' || NEW.order_number || ' - سيتم مراجعته من قبل فريق الدعم';

      -- Fallback for any other status
      ELSE
        v_message := 'تم تحديث حالة طلبك #' || NEW.order_number || ' إلى: ' || NEW.status;
    END CASE;

    -- Create notification for contractor (if applicable)
    IF v_should_notify_contractor AND v_contractor_id IS NOT NULL THEN
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
    END IF;

    -- Create notification for supplier (if not the one who changed it and if applicable)
    IF v_should_notify_supplier AND v_supplier_owner_id IS NOT NULL AND auth.uid() != v_supplier_owner_id THEN
      -- Customize message for supplier
      CASE NEW.status
        WHEN 'pending' THEN
          v_message := 'طلب جديد #' || NEW.order_number || ' - يرجى المراجعة والقبول';
        WHEN 'confirmed' THEN
          v_message := 'تم قبول الطلب #' || NEW.order_number;
        WHEN 'cancelled' THEN
          v_message := 'تم إلغاء الطلب #' || NEW.order_number;
        WHEN 'disputed' THEN
          v_message := 'نزاع على الطلب #' || NEW.order_number || ' - يرجى التواصل مع العميل';
        WHEN 'awaiting_contractor_confirmation' THEN
          v_message := 'في انتظار تأكيد العميل لاستلام الطلب #' || NEW.order_number;
        WHEN 'completed' THEN
          v_message := 'اكتمل الطلب #' || NEW.order_number;
        ELSE
          v_message := 'تم تحديث حالة الطلب #' || NEW.order_number || ' إلى: ' || NEW.status;
      END CASE;

      INSERT INTO in_app_notifications (user_id, type, title, message, data)
      VALUES (
        v_supplier_owner_id,
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
    END IF;

    -- TODO: Add to email queue based on notification preferences
    -- This can be enhanced later to check notification_preferences table
    -- and add to email_queue for users who have email notifications enabled
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

-- Add comment for documentation
COMMENT ON FUNCTION notify_order_status_change() IS
  'Trigger function that creates in-app notifications when order status changes.
   Handles all order statuses: pending, confirmed, cancelled, awaiting_contractor_confirmation,
   in_delivery, delivered, completed, rejected, disputed.
   Updated: January 11, 2025 - Added complete status coverage';
