'use client'

import { useEffect, useState } from 'react'

interface Tag {
  id: string
  name: string
  color: string
}

interface TagAssignment {
  id: string
  assigned_at: string
  tag: Tag
}

interface OrderTagsProps {
  orderId: string
}

export function OrderTags({ orderId }: OrderTagsProps) {
  const [assignments, setAssignments] = useState<TagAssignment[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [adding, setAdding] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch assigned tags
      const assignmentsResponse = await fetch(`/api/supplier/orders/${orderId}/tags`)
      const assignmentsData = await assignmentsResponse.json()

      // Fetch all available tags
      const tagsResponse = await fetch('/api/supplier/tags')
      const tagsData = await tagsResponse.json()

      setAssignments(assignmentsData.tags || [])
      setAvailableTags(tagsData.tags || [])
    } catch (err: any) {
      console.error('Error fetching tags:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [orderId])

  const handleAddTag = async (tagId: string) => {
    try {
      setAdding(true)

      const response = await fetch(`/api/supplier/orders/${orderId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add tag')
      }

      // Add to assignments
      setAssignments([...assignments, result.assignment])
      setShowAddMenu(false)
    } catch (err: any) {
      console.error('Error adding tag:', err)
      alert(err.message || 'فشل إضافة التصنيف')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    if (!confirm('هل تريد إزالة هذا التصنيف؟')) return

    try {
      const response = await fetch(`/api/supplier/orders/${orderId}/tags?tagId=${tagId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove tag')
      }

      // Remove from assignments
      setAssignments(assignments.filter(a => a.tag.id !== tagId))
    } catch (err: any) {
      console.error('Error removing tag:', err)
      alert(err.message || 'فشل إزالة التصنيف')
    }
  }

  // Get tags that aren't assigned yet
  const assignedTagIds = new Set(assignments.map(a => a.tag.id))
  const unassignedTags = availableTags.filter(t => !assignedTagIds.has(t.id))

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">جاري التحميل...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Assigned Tags */}
      {assignments.map(assignment => (
        <div
          key={assignment.id}
          className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border"
          style={{
            backgroundColor: `${assignment.tag.color}20`,
            borderColor: assignment.tag.color,
            color: assignment.tag.color,
          }}
        >
          <span>{assignment.tag.name}</span>
          <button
            onClick={() => handleRemoveTag(assignment.tag.id)}
            className="hover:opacity-70"
            title="إزالة التصنيف"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      {/* Add Tag Button */}
      {unassignedTags.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="px-3 py-1 text-sm font-medium text-gray-600 border border-gray-300 border-dashed rounded-full hover:border-primary-500 hover:text-primary-600 transition-colors"
            disabled={adding}
          >
            + إضافة تصنيف
          </button>

          {/* Dropdown Menu */}
          {showAddMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowAddMenu(false)}
              />
              {/* Menu */}
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-64 overflow-y-auto">
                {unassignedTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag.id)}
                    disabled={adding}
                    className="w-full px-4 py-2 text-right hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
                  >
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: tag.color, borderColor: tag.color }}
                    />
                    <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* No Tags State */}
      {assignments.length === 0 && unassignedTags.length === 0 && (
        <span className="text-sm text-gray-400 italic">لا توجد تصنيفات</span>
      )}
    </div>
  )
}
