'use client'

import { useState, useEffect } from 'react'

interface Communication {
  id: string
  type: string
  subject: string
  notes: string
  created_at: string
  created_by_name: string
  order_number?: string
}

interface CommunicationHistoryProps {
  contractorId: string
  supplierId: string
}

export function CommunicationHistory({ contractorId, supplierId }: CommunicationHistoryProps) {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetchCommunications()
  }, [])

  const fetchCommunications = async () => {
    try {
      const response = await fetch(
        `/api/supplier/communications?contractor_id=${contractorId}&limit=10`
      )
      const data = await response.json()

      if (response.ok) {
        setCommunications(data.communications || [])
      }
    } catch (err) {
      console.error('Failed to fetch communications:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      order_inquiry: '❓',
      complaint: '⚠️',
      feedback: '💬',
      general: '📞',
      dispute: '🚨'
    }
    return icons[type] || '📝'
  }

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      order_inquiry: 'استفسار عن طلب',
      complaint: 'شكوى',
      feedback: 'ملاحظات',
      general: 'عام',
      dispute: 'نزاع'
    }
    return names[type] || type
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'اليوم'
    if (diffDays === 1) return 'أمس'
    if (diffDays < 7) return `منذ ${diffDays} أيام`

    return date.toLocaleDateString('ar-JO', {
      month: 'short',
      day: 'numeric'
    })
  }

  const displayedCommunications = showAll ? communications : communications.slice(0, 5)

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">سجل التواصل</h3>

      {loading ? (
        <div className="py-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : communications.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-4xl">📞</span>
          <p className="mt-2 text-gray-600 text-sm">لا يوجد سجل تواصل</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayedCommunications.map(comm => (
              <div
                key={comm.id}
                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{getTypeIcon(comm.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">
                        {getTypeName(comm.type)}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(comm.created_at)}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{comm.subject}</p>
                    <p className="text-xs text-gray-600 line-clamp-2">{comm.notes}</p>
                    {comm.order_number && (
                      <p className="text-xs text-primary-600 mt-1">
                        طلب #{comm.order_number}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {communications.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-4 w-full py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {showAll ? 'عرض أقل' : `عرض الكل (${communications.length})`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
