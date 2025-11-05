'use client'

import { useEffect, useState } from 'react'

interface Note {
  id: string
  note: string
  is_internal: boolean
  created_at: string
  updated_at: string
  created_by: string
  creator: {
    id: string
    full_name: string
  } | null
}

interface OrderNotesProps {
  orderId: string
  currentUserId?: string
}

export function OrderNotes({ orderId, currentUserId }: OrderNotesProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isInternal, setIsInternal] = useState(true)

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/supplier/orders/${orderId}/notes`)

      if (!response.ok) {
        throw new Error('Failed to fetch notes')
      }

      const data = await response.json()
      setNotes(data.notes || [])
    } catch (err: any) {
      console.error('Error fetching notes:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [orderId])

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newNote.trim()) return

    try {
      setAdding(true)

      const response = await fetch(`/api/supplier/orders/${orderId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: newNote,
          isInternal,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add note')
      }

      // Add new note to list
      setNotes([result.note, ...notes])
      setNewNote('')
      setIsInternal(true)
    } catch (err: any) {
      console.error('Error adding note:', err)
      alert(err.message || 'فشل إضافة الملاحظة')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('هل تريد حذف هذه الملاحظة؟')) return

    try {
      const response = await fetch(`/api/supplier/orders/${orderId}/notes/${noteId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete note')
      }

      // Remove note from list
      setNotes(notes.filter(n => n.id !== noteId))
    } catch (err: any) {
      console.error('Error deleting note:', err)
      alert(err.message || 'فشل حذف الملاحظة')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
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

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">الملاحظات</h2>
        <p className="text-sm text-gray-600 mt-1">
          أضف ملاحظات داخلية أو عامة على هذا الطلب
        </p>
      </div>

      {/* Add Note Form */}
      <div className="p-6 border-b bg-gray-50">
        <form onSubmit={handleAddNote} className="space-y-4">
          <div>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="أضف ملاحظة..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              disabled={adding}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                disabled={adding}
              />
              <span className="text-sm text-gray-700">
                ملاحظة داخلية (لن يراها العميل)
              </span>
            </label>

            <button
              type="submit"
              disabled={adding || !newNote.trim()}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? 'جاري الإضافة...' : '+ إضافة ملاحظة'}
            </button>
          </div>
        </form>
      </div>

      {/* Notes List */}
      <div className="p-6">
        {notes.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl">📝</span>
            <p className="mt-4 text-gray-600">لا توجد ملاحظات بعد</p>
            <p className="text-sm text-gray-500 mt-1">أضف أول ملاحظة أعلاه</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`border rounded-lg p-4 ${
                  note.is_internal
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Note header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">
                        {note.is_internal ? '🔒' : '📝'}
                      </span>
                      {note.creator && (
                        <span className="text-sm font-semibold text-gray-900">
                          {note.creator.full_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatDate(note.created_at)}
                      </span>
                      {note.is_internal && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                          داخلية
                        </span>
                      )}
                    </div>

                    {/* Note content */}
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {note.note}
                    </p>
                  </div>

                  {/* Delete button (only for own notes) */}
                  {currentUserId && note.created_by === currentUserId && (
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="حذف الملاحظة"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
