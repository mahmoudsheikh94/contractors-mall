'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  message: string
  sender_id: string
  sender_type: 'contractor' | 'supplier' | 'admin' | 'driver'
  is_read: boolean
  created_at: string
  sender: {
    id: string
    full_name: string
    email: string
  }
  attachments?: Array<{
    id: string
    file_url: string
    file_name: string
    file_type: string
    file_size_bytes: number
  }>
}

interface OrderChatProps {
  orderId: string
  currentUserId: string
  currentUserType: 'contractor' | 'supplier'
}

export function OrderChat({ orderId, currentUserId, currentUserType }: OrderChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [prevMessageCount, setPrevMessageCount] = useState(0)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/messages`)
      const data = await response.json()

      if (response.ok) {
        setMessages(data.messages || [])
      } else {
        setError(data.error || 'فشل في تحميل الرسائل')
      }
    } catch (err) {
      setError('حدث خطأ أثناء تحميل الرسائل')
    } finally {
      setLoading(false)
    }
  }

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    setSending(true)
    setError('')

    try {
      const response = await fetch(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        setMessages([data.message, ...messages])
        setNewMessage('')
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
      } else {
        setError(data.error || 'فشل في إرسال الرسالة')
      }
    } catch (err) {
      setError('حدث خطأ أثناء إرسال الرسالة')
    } finally {
      setSending(false)
    }
  }

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  // Handle scroll detection to know if user manually scrolled up
  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setIsUserScrolling(!isAtBottom)
  }

  // Scroll to bottom only when new messages are added (not on polling refresh)
  useEffect(() => {
    // Only auto-scroll if:
    // 1. Message count increased (new message added)
    // 2. User hasn't manually scrolled up
    if (messages.length > prevMessageCount && !isUserScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    setPrevMessageCount(messages.length)
  }, [messages])

  // Load messages on mount
  useEffect(() => {
    fetchMessages()
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchMessages, 10000)
    return () => clearInterval(interval)
  }, [orderId])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="mr-3 text-gray-600">جاري التحميل...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            💬 الرسائل
          </h3>
          <span className="text-sm text-gray-500">
            {messages.length} رسالة
          </span>
        </div>
      </div>

      {/* Messages List */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="p-4 h-96 overflow-y-auto space-y-4"
      >
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">📭</span>
            <p className="mt-4 text-gray-600">لا توجد رسائل بعد</p>
            <p className="text-sm text-gray-500 mt-2">ابدأ المحادثة بإرسال رسالة أدناه</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender_id === currentUserId}
                currentUserType={currentUserType}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={handleTextareaChange}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none min-h-[42px] max-h-32"
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage(e)
              }
            }}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {sending ? '...' : 'إرسال'}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          اضغط Enter للإرسال، Shift+Enter لسطر جديد
        </p>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  isOwn,
  currentUserType
}: {
  message: Message
  isOwn: boolean
  currentUserType: string
}) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'الآن'
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`
    if (diffHours < 24) return `منذ ${diffHours} ساعة`
    if (diffDays < 7) return `منذ ${diffDays} يوم`

    return date.toLocaleDateString('ar-JO', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSenderLabel = () => {
    if (isOwn) return 'أنت'
    return message.sender.full_name
  }

  const getSenderBadge = () => {
    const badges = {
      contractor: { label: 'عميل', color: 'bg-blue-100 text-blue-800' },
      supplier: { label: 'مورد', color: 'bg-green-100 text-green-800' },
      admin: { label: 'إدارة', color: 'bg-purple-100 text-purple-800' },
      driver: { label: 'سائق', color: 'bg-yellow-100 text-yellow-800' }
    }

    const badge = badges[message.sender_type] || badges.contractor

    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className={`flex ${isOwn ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[70%] ${isOwn ? 'order-1' : 'order-2'}`}>
        {/* Sender info */}
        <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row' : 'flex-row-reverse'}`}>
          <span className="text-sm font-medium text-gray-900">
            {getSenderLabel()}
          </span>
          {!isOwn && getSenderBadge()}
          <span className="text-xs text-gray-500">
            {formatTime(message.created_at)}
          </span>
        </div>

        {/* Message bubble */}
        <div
          className={`
            px-4 py-2 rounded-lg
            ${isOwn
              ? 'bg-primary-600 text-white rounded-br-none'
              : 'bg-gray-100 text-gray-900 rounded-bl-none'
            }
          `}
        >
          <p className="whitespace-pre-wrap break-words">{message.message}</p>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`
                    flex items-center gap-2 p-2 rounded
                    ${isOwn ? 'bg-primary-700' : 'bg-gray-200'}
                    hover:opacity-80 transition-opacity
                  `}
                >
                  <span>📎</span>
                  <span className="text-sm truncate">{att.file_name}</span>
                  <span className="text-xs opacity-75">
                    ({(att.file_size_bytes / 1024).toFixed(0)} KB)
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Read receipt */}
        {isOwn && (
          <div className="text-xs text-gray-500 mt-1">
            {message.is_read ? '✓✓ تمت القراءة' : '✓ تم الإرسال'}
          </div>
        )}
      </div>
    </div>
  )
}