import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MessagesList from '@/components/messages/MessagesList'
import SendMessageForm from '@/components/messages/SendMessageForm'
import ConversationHeader from '@/components/messages/ConversationHeader'

async function getConversation(id: string) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  // Check if user is an admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/auth/login')
  }

  // Fetch conversation
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/admin/conversations/${id}`,
    {
      headers: {
        Cookie: `${await supabase.auth.getSession().then(s => s.data.session?.access_token ? `sb-access-token=${s.data.session.access_token}` : '')}`,
      },
    }
  )

  if (!response.ok) {
    console.error('Conversation API error:', await response.text())
    return null
  }

  const data = await response.json()
  return data.conversation
}

export default async function ConversationPage({
  params,
}: {
  params: { id: string }
}) {
  const conversation = await getConversation(params.id)

  if (!conversation) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">❌</div>
        <p className="text-lg text-gray-900 font-semibold">المحادثة غير موجودة</p>
        <Link
          href="/admin/support/messages"
          className="inline-block mt-4 text-primary-600 hover:text-primary-700"
        >
          العودة للمحادثات
        </Link>
      </div>
    )
  }

  const messages = Array.isArray(conversation.messages) ? conversation.messages : []
  const participants = Array.isArray(conversation.participants) ? conversation.participants : []

  return (
    <div>
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/admin/support/messages"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <span>←</span>
          <span>العودة للمحادثات</span>
        </Link>
      </div>

      {/* Conversation Header */}
      <ConversationHeader
        conversation={conversation}
        participants={participants}
      />

      {/* Messages Container */}
      <div className="mt-6 bg-white rounded-lg shadow-sm">
        {/* Messages List */}
        <div className="p-6 h-[500px] overflow-y-auto">
          <MessagesList messages={messages} />
        </div>

        {/* Send Message Form */}
        {conversation.status === 'open' && (
          <div className="border-t border-gray-200 p-4">
            <SendMessageForm conversationId={conversation.id} />
          </div>
        )}

        {conversation.status === 'closed' && (
          <div className="border-t border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">
              هذه المحادثة مغلقة. لا يمكن إرسال رسائل جديدة.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
