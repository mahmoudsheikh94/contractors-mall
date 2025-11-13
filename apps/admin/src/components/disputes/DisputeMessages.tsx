/**
 * Dispute Messages Component
 * =========================
 * Handles communication between parties in a dispute
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

interface Message {
  id: string
  message: string
  sender: {
    id: string
    name: string
    role: string
  }
  is_admin_message: boolean
  is_internal: boolean
  created_at: string
}

interface DisputeMessagesProps {
  disputeId: string
  currentUserRole: 'admin' | 'contractor' | 'supplier'
  currentUserId: string
}

export function DisputeMessages({
  disputeId,
  currentUserRole,
  currentUserId
}: DisputeMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()

    // Subscribe to new messages
    const supabase = createClient()
    const subscription = supabase
      .channel(`dispute-messages-${disputeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dispute_messages',
          filter: `dispute_id=eq.${disputeId}`
        },
        (payload) => {
          loadMessages()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [disputeId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function loadMessages() {
    try {
      const supabase = createClient()

      // Get messages based on user role
      let query = supabase
        .from('dispute_messages')
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, role)
        `)
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true })

      // Non-admin users shouldn't see internal messages
      if (currentUserRole !== 'admin') {
        query = query.eq('is_internal', false)
      }

      const { data, error } = await query

      if (error) throw error

      setMessages(data as any || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim()) return

    setSending(true)
    setError('')

    try {
      const supabase = createClient()

      // Send message
      const { error: messageError } = await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: disputeId,
          sender_id: currentUserId,
          message: newMessage.trim(),
          is_admin_message: currentUserRole === 'admin',
          is_internal: isInternal && currentUserRole === 'admin'
        })

      if (messageError) throw messageError

      // Log event
      await supabase
        .from('dispute_events')
        .insert({
          dispute_id: disputeId,
          event_type: 'message_sent',
          description: isInternal ? 'رسالة داخلية' : 'رسالة جديدة',
          user_id: currentUserId,
          metadata: {
            sender_type: currentUserRole,
            is_internal: isInternal
          }
        })

      // Send notification to other parties (if not internal)
      if (!isInternal) {
        // TODO: Integrate with notification service
        console.log('Send notification to parties')
      }

      setNewMessage('')
      setIsInternal(false)
      loadMessages()
    } catch (err: any) {
      console.error('Error sending message:', err)
      setError(err.message || 'فشل إرسال الرسالة')
    } finally {
      setSending(false)
    }
  }

  function getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      contractor: 'مقاول',
      supplier_admin: 'مورد',
      admin: 'مشرف',
      driver: 'سائق'
    }
    return labels[role] || role
  }

  function getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      contractor: 'bg-blue-100 text-blue-800',
      supplier_admin: 'bg-green-100 text-green-800',
      admin: 'bg-purple-100 text-purple-800',
      driver: 'bg-orange-100 text-orange-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-20 bg-gray-100 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm flex flex-col h-[600px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">المراسلات</h3>
        {currentUserRole === 'admin' && (
          <p className="text-sm text-gray-500 mt-1">
            الرسائل الداخلية مرئية للمشرفين فقط
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <span className="text-4xl block mb-2">💬</span>
            لا توجد رسائل بعد
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.sender.id === currentUserId

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                    {/* Sender info */}
                    <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? '' : 'justify-end'}`}>
                      <span className="text-sm font-medium text-gray-700">
                        {message.sender.name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getRoleColor(message.sender.role)}`}>
                        {getRoleLabel(message.sender.role)}
                      </span>
                      {message.is_internal && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                          داخلي
                        </span>
                      )}
                    </div>

                    {/* Message bubble */}
                    <div
                      className={`p-4 rounded-lg ${
                        isOwnMessage
                          ? 'bg-primary-100 text-primary-900'
                          : message.is_admin_message
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-gray-100 text-gray-900'
                      } ${message.is_internal ? 'border-2 border-yellow-300' : ''}`}
                    >
                      <p className="whitespace-pre-wrap">{message.message}</p>
                    </div>

                    {/* Timestamp */}
                    <div className={`mt-1 text-xs text-gray-500 ${isOwnMessage ? '' : 'text-left'}`}>
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                        locale: ar
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-200 px-6 py-4">
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {currentUserRole === 'admin' && (
          <div className="mb-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded text-primary-600"
              />
              <span className="font-medium text-gray-700">رسالة داخلية (للمشرفين فقط)</span>
            </label>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isInternal ? 'اكتب ملاحظة داخلية...' : 'اكتب رسالتك...'}
            className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {sending ? '...' : 'إرسال'}
          </button>
        </div>
      </form>
    </div>
  )
}