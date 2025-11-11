import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreateConversationButton from '@/components/messages/CreateConversationButton'

async function getConversations(status?: string) {
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

  // Fetch conversations
  const params = new URLSearchParams()
  if (status) params.set('status', status)

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/admin/conversations?${params.toString()}`,
    {
      headers: {
        Cookie: `${await supabase.auth.getSession().then(s => s.data.session?.access_token ? `sb-access-token=${s.data.session.access_token}` : '')}`,
      },
    }
  )

  if (!response.ok) {
    console.error('Conversations API error:', await response.text())
    return []
  }

  const data = await response.json()
  return data.conversations || []
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const conversations = await getConversations(searchParams.status)

  const openCount = conversations.filter((c: any) => c.status === 'open').length
  const closedCount = conversations.filter((c: any) => c.status === 'closed').length

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">المحادثات</h1>
          <p className="text-gray-600 mt-2">إدارة محادثات الدعم مع المستخدمين</p>
        </div>
        <CreateConversationButton />
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex gap-4 border-b border-gray-200">
          <Link
            href="/admin/support/messages"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              !searchParams.status
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            الكل ({conversations.length})
          </Link>
          <Link
            href="/admin/support/messages?status=open"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              searchParams.status === 'open'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            مفتوحة ({openCount})
          </Link>
          <Link
            href="/admin/support/messages?status=closed"
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              searchParams.status === 'closed'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            مغلقة ({closedCount})
          </Link>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
        {conversations.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-lg">لا توجد محادثات</p>
          </div>
        ) : (
          conversations.map((conversation: any) => {
            const lastMessage = conversation.lastMessage
            const unreadCount = conversation.unreadCount || 0
            const participants = Array.isArray(conversation.participants) ? conversation.participants : []
            const customer = participants.find((p: any) => p.role === 'customer')

            return (
              <Link
                key={conversation.id}
                href={`/admin/support/messages/${conversation.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Priority Indicator */}
                  <div className="flex-shrink-0">
                    {conversation.priority === 'urgent' && (
                      <span className="inline-block w-3 h-3 bg-red-500 rounded-full"></span>
                    )}
                    {conversation.priority === 'high' && (
                      <span className="inline-block w-3 h-3 bg-orange-500 rounded-full"></span>
                    )}
                    {conversation.priority === 'normal' && (
                      <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
                    )}
                    {conversation.priority === 'low' && (
                      <span className="inline-block w-3 h-3 bg-gray-400 rounded-full"></span>
                    )}
                  </div>

                  {/* Conversation Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {conversation.subject}
                      </h3>
                      {conversation.status === 'closed' && (
                        <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
                          مغلقة
                        </span>
                      )}
                      {unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    {customer && (
                      <p className="text-sm text-gray-600 mb-1">
                        {customer.user?.full_name} ({customer.user?.email})
                      </p>
                    )}

                    {conversation.order && (
                      <p className="text-sm text-gray-600 mb-2">
                        الطلب #{conversation.order.order_number}
                      </p>
                    )}

                    {lastMessage && (
                      <p className="text-sm text-gray-500 truncate">
                        {lastMessage.content}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0 text-xs text-gray-500">
                    {new Date(conversation.updated_at).toLocaleDateString('ar-JO')}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
