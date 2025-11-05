'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Tag {
  id: string
  name: string
  color: string
  created_at: string
}

const PRESET_COLORS = [
  { name: 'أزرق', value: '#3B82F6' },
  { name: 'أخضر', value: '#10B981' },
  { name: 'أصفر', value: '#F59E0B' },
  { name: 'أحمر', value: '#EF4444' },
  { name: 'بنفسجي', value: '#8B5CF6' },
  { name: 'وردي', value: '#EC4899' },
  { name: 'برتقالي', value: '#F97316' },
  { name: 'تركواز', value: '#14B8A6' },
]

export default function TagsSettingsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [formData, setFormData] = useState({ name: '', color: '#3B82F6' })
  const [saving, setSaving] = useState(false)

  const fetchTags = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/supplier/tags')
      const data = await response.json()
      setTags(data.tags || [])
    } catch (err: any) {
      console.error('Error fetching tags:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTags()
  }, [])

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) return

    try {
      setSaving(true)

      const response = await fetch('/api/supplier/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create tag')
      }

      setTags([...tags, result.tag])
      setFormData({ name: '', color: '#3B82F6' })
      setShowAddForm(false)
    } catch (err: any) {
      console.error('Error creating tag:', err)
      alert(err.message || 'فشل إنشاء التصنيف')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingTag || !formData.name.trim()) return

    try {
      setSaving(true)

      const response = await fetch(`/api/supplier/tags/${editingTag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update tag')
      }

      setTags(tags.map(t => t.id === editingTag.id ? result.tag : t))
      setEditingTag(null)
      setFormData({ name: '', color: '#3B82F6' })
    } catch (err: any) {
      console.error('Error updating tag:', err)
      alert(err.message || 'فشل تحديث التصنيف')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`هل تريد حذف التصنيف "${tagName}"؟`)) return

    try {
      const response = await fetch(`/api/supplier/tags/${tagId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete tag')
      }

      setTags(tags.filter(t => t.id !== tagId))
    } catch (err: any) {
      console.error('Error deleting tag:', err)
      alert(err.message || 'فشل حذف التصنيف')
    }
  }

  const startEdit = (tag: Tag) => {
    setEditingTag(tag)
    setFormData({ name: tag.name, color: tag.color })
    setShowAddForm(false)
  }

  const cancelEdit = () => {
    setEditingTag(null)
    setFormData({ name: '', color: '#3B82F6' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/supplier/dashboard"
          className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center gap-2"
        >
          ← العودة إلى لوحة التحكم
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">إدارة التصنيفات</h1>
        <p className="text-gray-600 mt-2">
          أنشئ وإدارة التصنيفات لتنظيم طلباتك
        </p>
      </div>

      {/* Add Tag Button */}
      {!showAddForm && !editingTag && (
        <button
          onClick={() => setShowAddForm(true)}
          className="mb-6 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          + إنشاء تصنيف جديد
        </button>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingTag) && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingTag ? 'تعديل التصنيف' : 'إنشاء تصنيف جديد'}
          </h2>

          <form onSubmit={editingTag ? handleUpdateTag : handleCreateTag} className="space-y-4">
            {/* Tag Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم التصنيف
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: عاجل، متابعة، مهم"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={saving}
                required
              />
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اللون
              </label>
              <div className="flex flex-wrap gap-3">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: preset.value })}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      formData.color === preset.value
                        ? 'border-gray-900 scale-110'
                        : 'border-gray-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                    disabled={saving}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            {formData.name && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  معاينة
                </label>
                <div
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border"
                  style={{
                    backgroundColor: `${formData.color}20`,
                    borderColor: formData.color,
                    color: formData.color,
                  }}
                >
                  {formData.name}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={saving || !formData.name.trim()}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'جاري الحفظ...' : editingTag ? 'حفظ التغييرات' : 'إنشاء التصنيف'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  cancelEdit()
                }}
                disabled={saving}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors font-semibold disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tags List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">التصنيفات الحالية</h2>
          <p className="text-sm text-gray-600 mt-1">
            {tags.length} {tags.length === 1 ? 'تصنيف' : 'تصنيفات'}
          </p>
        </div>

        {tags.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl">🏷️</span>
            <p className="mt-4 text-gray-600">لا توجد تصنيفات بعد</p>
            <p className="text-sm text-gray-500 mt-1">أنشئ أول تصنيف لتنظيم طلباتك</p>
          </div>
        ) : (
          <div className="divide-y">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="p-6 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full border-2"
                    style={{ backgroundColor: tag.color, borderColor: tag.color }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{tag.name}</h3>
                    <p className="text-sm text-gray-500">
                      أنشئ في {new Date(tag.created_at).toLocaleDateString('ar-JO')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(tag)}
                    className="text-primary-600 hover:text-primary-700 px-4 py-2 rounded-lg hover:bg-primary-50 font-medium text-sm"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag.id, tag.name)}
                    className="text-red-600 hover:text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 font-medium text-sm"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
