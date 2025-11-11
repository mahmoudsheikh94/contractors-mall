#!/usr/bin/env node

import pg from 'pg'

const { Client } = pg

const connectionString = 'postgresql://postgres.zbscashhrdeofvgjnbsb:5822075Mahmoud94$@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'

async function main() {
  const client = new Client({ connectionString })

  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected!\n')

    console.log('🔧 Step 1: Adding missing foreign key constraints...\n')

    // Fix order_notes.created_by foreign key
    try {
      await client.query(`
        ALTER TABLE order_notes
        ADD CONSTRAINT order_notes_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES profiles(id);
      `)
      console.log('  ✅ Added foreign key: order_notes.created_by → profiles(id)')
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('  ℹ️  Foreign key already exists: order_notes.created_by')
      } else {
        console.error('  ❌ Error adding FK for order_notes:', err.message)
      }
    }

    // Fix order_activities.created_by foreign key
    try {
      await client.query(`
        ALTER TABLE order_activities
        ADD CONSTRAINT order_activities_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES profiles(id);
      `)
      console.log('  ✅ Added foreign key: order_activities.created_by → profiles(id)')
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('  ℹ️  Foreign key already exists: order_activities.created_by')
      } else {
        console.error('  ❌ Error adding FK for order_activities:', err.message)
      }
    }

    console.log('\n🔧 Step 2: Creating missing tables from Phase 2C/2D...\n')

    // Create messages table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('contractor', 'supplier', 'admin', 'driver')),
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          read_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `)

      await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_order ON messages(order_id)`)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC)`)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(is_read, order_id) WHERE is_read = FALSE`)

      await client.query(`ALTER TABLE messages ENABLE ROW LEVEL SECURITY`)

      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can view messages for their orders'
          ) THEN
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
          END IF;
        END $$
      `)

      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can send messages on their orders'
          ) THEN
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
          END IF;
        END $$
      `)

      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can update their own messages'
          ) THEN
            CREATE POLICY "Users can update their own messages"
              ON messages FOR UPDATE
              USING (sender_id = auth.uid());
          END IF;
        END $$
      `)

      console.log('  ✅ Created messages table with RLS policies')
    } catch (err) {
      console.error('  ❌ Error creating messages:', err.message)
    }

    // Create in_app_notifications table
    try {
      await client.query(`
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
        )
      `)

      await client.query(`CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user ON in_app_notifications(user_id, is_read)`)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created ON in_app_notifications(created_at DESC)`)

      await client.query(`ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY`)

      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'in_app_notifications' AND policyname = 'Users can view their own notifications'
          ) THEN
            CREATE POLICY "Users can view their own notifications"
              ON in_app_notifications FOR SELECT
              USING (user_id = auth.uid());
          END IF;
        END $$
      `)

      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'in_app_notifications' AND policyname = 'Users can update their own notifications'
          ) THEN
            CREATE POLICY "Users can update their own notifications"
              ON in_app_notifications FOR UPDATE
              USING (user_id = auth.uid());
          END IF;
        END $$
      `)

      console.log('  ✅ Created in_app_notifications table with RLS policies')
    } catch (err) {
      console.error('  ❌ Error creating in_app_notifications:', err.message)
    }

    // Create message_attachments table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS message_attachments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          file_url TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_type VARCHAR(50),
          file_size_bytes INTEGER,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `)

      await client.query(`CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id)`)

      await client.query(`ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY`)

      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'message_attachments' AND policyname = 'Users can view attachments for accessible messages'
          ) THEN
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
          END IF;
        END $$
      `)

      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'message_attachments' AND policyname = 'Users can add attachments to their messages'
          ) THEN
            CREATE POLICY "Users can add attachments to their messages"
              ON message_attachments FOR INSERT
              WITH CHECK (
                message_id IN (
                  SELECT id FROM messages WHERE sender_id = auth.uid()
                )
              );
          END IF;
        END $$
      `)

      console.log('  ✅ Created message_attachments table with RLS policies')
    } catch (err) {
      console.error('  ❌ Error creating message_attachments:', err.message)
    }

    // Create notification_preferences table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS notification_preferences (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
          email_new_order BOOLEAN DEFAULT TRUE,
          email_status_updates BOOLEAN DEFAULT TRUE,
          email_daily_summary BOOLEAN DEFAULT TRUE,
          email_weekly_report BOOLEAN DEFAULT TRUE,
          email_low_stock BOOLEAN DEFAULT TRUE,
          email_messages BOOLEAN DEFAULT TRUE,
          app_new_order BOOLEAN DEFAULT TRUE,
          app_status_updates BOOLEAN DEFAULT TRUE,
          app_messages BOOLEAN DEFAULT TRUE,
          app_low_stock BOOLEAN DEFAULT TRUE,
          quiet_hours_enabled BOOLEAN DEFAULT FALSE,
          quiet_hours_start TIME,
          quiet_hours_end TIME,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `)

      await client.query(`CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id)`)

      await client.query(`ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY`)

      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users can view their own notification preferences'
          ) THEN
            CREATE POLICY "Users can view their own notification preferences"
              ON notification_preferences FOR SELECT
              USING (user_id = auth.uid());
          END IF;
        END $$
      `)

      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users can update their own notification preferences'
          ) THEN
            CREATE POLICY "Users can update their own notification preferences"
              ON notification_preferences FOR ALL
              USING (user_id = auth.uid());
          END IF;
        END $$
      `)

      console.log('  ✅ Created notification_preferences table with RLS policies')
    } catch (err) {
      console.error('  ❌ Error creating notification_preferences:', err.message)
    }

    console.log('\n✅ Schema fixes complete!\n')

    // Verify
    console.log('🔍 Verifying fixes...\n')

    const verifyFKs = [
      { table: 'order_notes', column: 'created_by', ref: 'profiles' },
      { table: 'order_activities', column: 'created_by', ref: 'profiles' },
      { table: 'messages', column: 'sender_id', ref: 'profiles' },
      { table: 'in_app_notifications', column: 'user_id', ref: 'profiles' },
    ]

    for (const fk of verifyFKs) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
          WHERE tc.table_name = $1
            AND kcu.column_name = $2
            AND tc.constraint_type = 'FOREIGN KEY'
        );
      `, [fk.table, fk.column])

      const status = result.rows[0].exists ? '✅' : '❌'
      console.log(`  ${status} ${fk.table}.${fk.column} → ${fk.ref}`)
    }

    console.log('\n🎉 All done!')

  } catch (err) {
    console.error('\n❌ Error:', err.message)
    console.error(err.stack)
  } finally {
    await client.end()
  }
}

main()
