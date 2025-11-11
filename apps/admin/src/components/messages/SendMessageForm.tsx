'use client'

import { useState } from 'react'

interface SendMessageFormProps {
  conversationId: string
}

export default function SendMessageForm({ conversationId }: SendMessageFormProps) {
  const [content, setContent] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      alert('الرجاء كتابة الرسالة')
      return
    }

    setIsSending(true)
    try {
      const response = await fetch(`/api/admin/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          isInternal,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Clear form and refresh page
      setContent('')
      setIsInternal(false)
      window.location.reload()
    } catch (error) {
      console.error('Error sending message:', error)
      alert('فشل إرسال الرسالة')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Message Input */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="اكتب رسالتك هنا..."
        rows={3}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
        disabled={isSending}
      />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(e) => setIsInternal(e.target.checked)}
            disabled={isSending}
            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">رسالة داخلية (لن تظهر للعميل)</span>
        </label>

        <button
          type="submit"
          disabled={isSending || !content.trim()}
          className="px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSending ? 'جاري الإرسال...' : 'إرسال'}
        </button>
      </div>
    </form>
  )
}
