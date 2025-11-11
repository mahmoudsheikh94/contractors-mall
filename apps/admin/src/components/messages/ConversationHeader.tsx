'use client'

import { useState } from 'react'

interface ConversationHeaderProps {
  conversation: any
  participants: any[]
}

export default function ConversationHeader({ conversation, participants }: ConversationHeaderProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const customer = participants.find(p => p.role === 'customer')

  const handleCloseConversation = async () => {
    if (!confirm('هل أنت متأكد من إغلاق هذه المحادثة؟')) {
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })

      if (!response.ok) {
        throw new Error('Failed to close conversation')
      }

      alert('تم إغلاق المحادثة بنجاح')
      window.location.reload()
    } catch (error) {
      console.error('Error closing conversation:', error)
      alert('فشل إغلاق المحادثة')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{conversation.subject}</h1>

          {customer && (
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">العميل:</span> {customer.user?.full_name} ({customer.user?.email})
            </p>
          )}

          {conversation.order && (
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">الطلب:</span> #{conversation.order.order_number}
            </p>
          )}

          <div className="flex items-center gap-4 mt-3">
            {/* Status Badge */}
            {conversation.status === 'open' ? (
              <span className="inline-flex px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                مفتوحة
              </span>
            ) : (
              <span className="inline-flex px-3 py-1 bg-gray-100 text-gray-600 text-sm font-semibold rounded-full">
                مغلقة
              </span>
            )}

            {/* Priority Badge */}
            {conversation.priority === 'urgent' && (
              <span className="inline-flex px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                🔥 عاجل
              </span>
            )}
            {conversation.priority === 'high' && (
              <span className="inline-flex px-3 py-1 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full">
                عالي
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {conversation.status === 'open' && (
          <button
            onClick={handleCloseConversation}
            disabled={isUpdating}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            {isUpdating ? 'جاري الإغلاق...' : 'إغلاق المحادثة'}
          </button>
        )}
      </div>
    </div>
  )
}
