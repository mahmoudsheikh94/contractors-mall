'use client'

import { useState } from 'react'

interface NotificationPreferences {
  id: string
  user_id: string
  email_notifications: {
    new_order?: boolean
    order_status_update?: boolean
    payment_received?: boolean
    low_stock?: boolean
    new_message?: boolean
    weekly_summary?: boolean
  }
  in_app_notifications: {
    new_order?: boolean
    order_status_update?: boolean
    payment_received?: boolean
    low_stock?: boolean
    new_message?: boolean
  }
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  created_at?: string
  updated_at?: string
}

interface NotificationPreferencesFormProps {
  initialPreferences: NotificationPreferences
  userId: string
}

export function NotificationPreferencesForm({
  initialPreferences,
  userId
}: NotificationPreferencesFormProps) {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)

    try {
      const response = await fetch('/api/supplier/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_notifications: preferences.email_notifications,
          in_app_notifications: preferences.in_app_notifications,
          quiet_hours_enabled: preferences.quiet_hours_enabled,
          quiet_hours_start: preferences.quiet_hours_start,
          quiet_hours_end: preferences.quiet_hours_end
        })
      })

      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'فشل في حفظ الإعدادات')
      }
    } catch (err) {
      setError('حدث خطأ أثناء حفظ الإعدادات')
    } finally {
      setSaving(false)
    }
  }

  const updateEmailNotification = (key: string, value: boolean) => {
    setPreferences({
      ...preferences,
      email_notifications: {
        ...preferences.email_notifications,
        [key]: value
      }
    })
  }

  const updateInAppNotification = (key: string, value: boolean) => {
    setPreferences({
      ...preferences,
      in_app_notifications: {
        ...preferences.in_app_notifications,
        [key]: value
      }
    })
  }

  const notificationTypes = [
    { key: 'new_order', label: 'طلب جديد', icon: '🛒', description: 'عندما يتم تقديم طلب جديد' },
    {
      key: 'order_status_update',
      label: 'تحديث حالة الطلب',
      icon: '📦',
      description: 'عند تغيير حالة الطلب'
    },
    {
      key: 'payment_received',
      label: 'استلام دفعة',
      icon: '💰',
      description: 'عند إطلاق الدفعة من الضمان'
    },
    {
      key: 'low_stock',
      label: 'مخزون منخفض',
      icon: '⚠️',
      description: 'عندما ينخفض المخزون عن الحد الأدنى'
    },
    { key: 'new_message', label: 'رسالة جديدة', icon: '💬', description: 'عند استلام رسالة جديدة' }
  ]

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">📧</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">إشعارات البريد الإلكتروني</h2>
            <p className="text-sm text-gray-600">تلقي التنبيهات عبر البريد الإلكتروني</p>
          </div>
        </div>

        <div className="space-y-4">
          {notificationTypes.map(type => (
            <div
              key={type.key}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{type.icon}</span>
                <div>
                  <p className="font-medium text-gray-900">{type.label}</p>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.email_notifications[type.key as keyof typeof preferences.email_notifications] ?? true}
                  onChange={e => updateEmailNotification(type.key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          ))}

          {/* Weekly Summary */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-medium text-gray-900">ملخص أسبوعي</p>
                <p className="text-sm text-gray-600">تقرير أسبوعي بالأداء والإحصائيات</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.email_notifications.weekly_summary ?? true}
                onChange={e => updateEmailNotification('weekly_summary', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* In-App Notifications */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🔔</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">الإشعارات داخل التطبيق</h2>
            <p className="text-sm text-gray-600">تلقي التنبيهات في لوحة التحكم</p>
          </div>
        </div>

        <div className="space-y-4">
          {notificationTypes.map(type => (
            <div
              key={type.key}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{type.icon}</span>
                <div>
                  <p className="font-medium text-gray-900">{type.label}</p>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.in_app_notifications[type.key as keyof typeof preferences.in_app_notifications] ?? true}
                  onChange={e => updateInAppNotification(type.key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🌙</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">ساعات الهدوء</h2>
            <p className="text-sm text-gray-600">
              لن تتلقى إشعارات خلال هذه الفترة
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Enable Quiet Hours */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">تفعيل ساعات الهدوء</p>
              <p className="text-sm text-gray-600">إيقاف الإشعارات في أوقات محددة</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.quiet_hours_enabled}
                onChange={e =>
                  setPreferences({ ...preferences, quiet_hours_enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Time Range */}
          {preferences.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">من الساعة</label>
                <input
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={e =>
                    setPreferences({ ...preferences, quiet_hours_start: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">إلى الساعة</label>
                <input
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={e => setPreferences({ ...preferences, quiet_hours_end: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {saved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-center gap-2">
            <span>✅</span>
            تم حفظ الإعدادات بنجاح
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  )
}
