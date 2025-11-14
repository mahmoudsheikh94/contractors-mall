/**
 * Dispute Timeline Component
 * =========================
 * Shows the complete history of dispute events
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

interface TimelineEvent {
  id: string
  type: 'created' | 'status_changed' | 'note_added' | 'evidence_uploaded' | 'message_sent' | 'resolved'
  title: string
  description: string
  user: {
    name: string
    role: string
  }
  created_at: string
  metadata?: any
}

interface DisputeTimelineProps {
  disputeId: string
}

export function DisputeTimeline({ disputeId }: DisputeTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTimeline()
  }, [disputeId])

  async function loadTimeline() {
    try {
      const supabase = createClient()

      // Get dispute events
      const { data: disputeEvents, error } = await (supabase as any)
        .from('dispute_events')
        .select(`
          *,
          user:profiles!user_id(full_name, role)
        `)
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform events for timeline
      const timeline = disputeEvents?.map(event => ({
        id: event.id,
        type: event.event_type,
        title: getEventTitle(event.event_type),
        description: event.description || getEventDescription(event),
        user: {
          name: event.user?.full_name || 'النظام',
          role: event.user?.role || 'system'
        },
        created_at: event.created_at,
        metadata: event.metadata
      })) || []

      setEvents(timeline)
    } catch (error) {
      console.error('Error loading timeline:', error)
    } finally {
      setLoading(false)
    }
  }

  function getEventTitle(type: string): string {
    const titles: Record<string, string> = {
      created: 'فتح النزاع',
      status_changed: 'تغيير الحالة',
      note_added: 'إضافة ملاحظة',
      evidence_uploaded: 'رفع دليل',
      message_sent: 'رسالة جديدة',
      resolved: 'حل النزاع'
    }
    return titles[type] || 'حدث'
  }

  function getEventDescription(event: any): string {
    switch (event.event_type) {
      case 'status_changed':
        return `تم تغيير الحالة من ${event.metadata?.old_status} إلى ${event.metadata?.new_status}`
      case 'evidence_uploaded':
        return `تم رفع ${event.metadata?.file_count || 1} ملف`
      case 'message_sent':
        return `رسالة من ${event.metadata?.sender_type === 'contractor' ? 'المقاول' : 'المورد'}`
      default:
        return event.description || ''
    }
  }

  function getEventIcon(type: string): string {
    const icons: Record<string, string> = {
      created: '🔴',
      status_changed: '🔄',
      note_added: '📝',
      evidence_uploaded: '📎',
      message_sent: '💬',
      resolved: '✅'
    }
    return icons[type] || '📌'
  }

  function getEventColor(type: string): string {
    const colors: Record<string, string> = {
      created: 'bg-red-100 text-red-800',
      status_changed: 'bg-blue-100 text-blue-800',
      note_added: 'bg-yellow-100 text-yellow-800',
      evidence_uploaded: 'bg-purple-100 text-purple-800',
      message_sent: 'bg-gray-100 text-gray-800',
      resolved: 'bg-green-100 text-green-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">السجل الزمني للنزاع</h3>

      {events.length === 0 ? (
        <p className="text-gray-500 text-center py-8">لا توجد أحداث مسجلة</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute right-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          {/* Events */}
          <div className="space-y-6">
            {events.map((event, index) => (
              <div key={event.id} className="relative flex gap-4">
                {/* Event dot */}
                <div className="relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getEventColor(event.type)}`}>
                    <span className="text-lg">{getEventIcon(event.type)}</span>
                  </div>
                </div>

                {/* Event content */}
                <div className="flex-1 pb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{event.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.created_at), {
                          addSuffix: true,
                          locale: ar
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-gray-500">بواسطة:</span>
                      <span className="text-xs font-medium text-gray-700">
                        {event.user.name}
                      </span>
                      <span className="text-xs px-2 py-1 bg-white rounded-full text-gray-600">
                        {getRoleLabel(event.user.role)}
                      </span>
                    </div>

                    {/* Additional metadata */}
                    {event.metadata?.notes && (
                      <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                        <p className="text-sm text-gray-700">{event.metadata.notes}</p>
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

  function getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      contractor: 'مقاول',
      supplier_admin: 'مورد',
      admin: 'مشرف',
      system: 'النظام'
    }
    return labels[role] || role
  }
}