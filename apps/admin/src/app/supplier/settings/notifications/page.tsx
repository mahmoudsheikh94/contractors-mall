import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationPreferencesForm } from '@/components/supplier/settings/NotificationPreferencesForm'

export const metadata = {
  title: 'إعدادات الإشعارات - المقاول مول',
  description: 'إدارة تفضيلات الإشعارات والتنبيهات'
}

export default async function NotificationSettingsPage() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  // Get supplier profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, supplier_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'supplier_admin') {
    redirect('/auth/login')
  }

  // Get or create notification preferences
  let { data: preferences } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // If no preferences exist, create default ones
  if (!preferences) {
    const { data: newPreferences } = await supabase
      .from('notification_preferences')
      .insert({
        user_id: user.id,
        email_notifications: {
          new_order: true,
          order_status_update: true,
          payment_received: true,
          low_stock: true,
          new_message: true,
          weekly_summary: true
        },
        in_app_notifications: {
          new_order: true,
          order_status_update: true,
          payment_received: true,
          low_stock: true,
          new_message: true
        },
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00'
      })
      .select()
      .single()

    preferences = newPreferences
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">إعدادات الإشعارات</h1>
          <p className="text-gray-600 mt-2">
            قم بتخصيص كيفية ومتى تتلقى الإشعارات
          </p>
        </div>

        {/* Preferences Form */}
        <NotificationPreferencesForm initialPreferences={preferences} userId={user.id} />
      </div>
    </div>
  )
}
