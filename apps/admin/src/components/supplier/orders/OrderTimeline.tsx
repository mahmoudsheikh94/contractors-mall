'use client'

import { useEffect, useState } from 'react'

interface Activity {
  id: string
  activity_type: string
  description: string
  metadata: any
  created_at: string
  created_by: string | null
  creator: {
    id: string
    full_name: string
  } | null
}

interface OrderTimelineProps {
  orderId: string
}

export function OrderTimeline({ orderId }: OrderTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true)
        const response = await fetch(`/api/supplier/orders/${orderId}/activities`)

        if (!response.ok) {
          throw new Error('Failed to fetch activities')
        }

        const data = await response.json()
        setActivities(data.activities || [])
      } catch (err: any) {
        console.error('Error fetching activities:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [orderId])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return '🔄'
      case 'note_added':
        return '📝'
      case 'edited':
        return '✏️'
      case 'tag_added':
        return '🏷️'
      case 'tag_removed':
        return '🗑️'
      default:
        return '📋'
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'status_change':
        return 'bg-blue-50 border-blue-200'
      case 'note_added':
        return 'bg-green-50 border-green-200'
      case 'edited':
        return 'bg-amber-50 border-amber-200'
      case 'tag_added':
        return 'bg-purple-50 border-purple-200'
      case 'tag_removed':
        return 'bg-gray-50 border-gray-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'الآن'
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`
    if (diffHours < 24) return `منذ ${diffHours} ساعة`
    if (diffDays < 7) return `منذ ${diffDays} يوم`

    return date.toLocaleDateString('ar-JO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">جاري التحميل...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8">
          <span className="text-4xl">⚠️</span>
          <p className="mt-4 text-red-600">فشل تحميل السجل</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">سجل الأنشطة</h2>
        <p className="text-sm text-gray-600 mt-1">
          تاريخ كامل لجميع التحديثات والإجراءات على هذا الطلب
        </p>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="p-12 text-center">
          <span className="text-4xl">📋</span>
          <p className="mt-4 text-gray-600">لا توجد أنشطة بعد</p>
        </div>
      ) : (
        <div className="p-6">
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id} className="relative">
                {/* Timeline connector */}
                {index !== activities.length - 1 && (
                  <div className="absolute right-6 top-12 bottom-0 w-0.5 bg-gray-200" />
                )}

                {/* Activity card */}
                <div className={`flex gap-4 border rounded-lg p-4 ${getActivityColor(activity.activity_type)}`}>
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-white border-2 flex items-center justify-center text-2xl">
                      {getActivityIcon(activity.activity_type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {activity.description}
                        </p>
                        {activity.creator && (
                          <p className="text-xs text-gray-600 mt-1">
                            بواسطة {activity.creator.full_name}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(activity.created_at)}
                      </span>
                    </div>

                    {/* Metadata */}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-gray-600 bg-white/50 rounded px-2 py-1">
                        {activity.metadata.old_value && activity.metadata.new_value && (
                          <span>
                            من: <span className="font-medium">{activity.metadata.old_value}</span>
                            {' → '}
                            إلى: <span className="font-medium">{activity.metadata.new_value}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
