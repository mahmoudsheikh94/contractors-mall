interface MessagesListProps {
  messages: any[]
}

export default function MessagesList({ messages }: MessagesListProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-4">💬</div>
        <p>لا توجد رسائل بعد</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message: any) => {
        const sender = Array.isArray(message.sender) ? message.sender[0] : message.sender
        const isAdmin = sender?.role === 'admin'

        return (
          <div
            key={message.id}
            className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] ${isAdmin ? 'order-2' : 'order-1'}`}>
              {/* Sender Name */}
              <div className={`text-xs text-gray-600 mb-1 ${isAdmin ? 'text-left' : 'text-right'}`}>
                {sender?.full_name}
                {message.is_internal && (
                  <span className="mr-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                    داخلية
                  </span>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`px-4 py-3 rounded-lg ${
                  isAdmin
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((url: string, idx: number) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block text-xs underline ${
                          isAdmin ? 'text-blue-100' : 'text-primary-600'
                        }`}
                      >
                        📎 مرفق {idx + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className={`text-xs text-gray-500 mt-1 ${isAdmin ? 'text-left' : 'text-right'}`}>
                {new Date(message.created_at).toLocaleString('ar-JO')}
                {message.is_read && <span className="mr-2">✓✓</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
