'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/supabase'

type DisputeStatus = Database['public']['Enums']['dispute_status']

interface DisputeQCActionsProps {
  disputeId: string
  currentStatus: string
  siteVisitRequired: boolean
  siteVisitCompleted: boolean
}

export function DisputeQCActions({
  disputeId,
  currentStatus,
  siteVisitRequired,
  siteVisitCompleted,
}: DisputeQCActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showQCForm, setShowQCForm] = useState(false)
  const [showResolveForm, setShowResolveForm] = useState(false)

  const [qcNotes, setQcNotes] = useState('')
  const [qcAction, setQcAction] = useState('')
  const [resolution, setResolution] = useState('')

  async function handleUpdateStatus(newStatus: DisputeStatus) {
    if (!confirm(`هل أنت متأكد من تغيير الحالة إلى "${newStatus}"؟`)) return

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('disputes')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId)

      if (updateError) throw updateError

      alert('✓ تم تحديث الحالة بنجاح!')
      router.refresh()
    } catch (err: any) {
      console.error('Error updating status:', err)
      setError(err.message || 'فشل تحديث الحالة')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleSiteVisit(required: boolean) {
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('disputes')
        .update({
          site_visit_required: required,
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId)

      if (updateError) throw updateError

      alert(required ? '✓ تم تحديد الزيارة الميدانية' : '✓ تم إلغاء الزيارة الميدانية')
      router.refresh()
    } catch (err: any) {
      console.error('Error toggling site visit:', err)
      setError(err.message || 'فشل التحديث')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkSiteVisitCompleted() {
    if (!confirm('هل تم إكمال الزيارة الميدانية؟')) return

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('disputes')
        .update({
          site_visit_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId)

      if (updateError) throw updateError

      alert('✓ تم تسجيل إكمال الزيارة الميدانية')
      router.refresh()
    } catch (err: any) {
      console.error('Error marking site visit completed:', err)
      setError(err.message || 'فشل التحديث')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddQCNotes(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('disputes')
        .update({
          qc_notes: qcNotes,
          qc_action: qcAction || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId)

      if (updateError) throw updateError

      alert('✓ تم إضافة ملاحظات مراقبة الجودة')
      setShowQCForm(false)
      setQcNotes('')
      setQcAction('')
      router.refresh()
    } catch (err: any) {
      console.error('Error adding QC notes:', err)
      setError(err.message || 'فشل إضافة الملاحظات')
    } finally {
      setLoading(false)
    }
  }

  async function handleResolveDispute(e: React.FormEvent) {
    e.preventDefault()

    if (!confirm('هل أنت متأكد من حل هذا النزاع؟ سيتم الإفراج عن الدفعة أو استردادها.')) return

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution: resolution,
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId)

      if (updateError) throw updateError

      alert('✓ تم حل النزاع بنجاح!')
      setShowResolveForm(false)
      router.refresh()
    } catch (err: any) {
      console.error('Error resolving dispute:', err)
      setError(err.message || 'فشل حل النزاع')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">إجراءات مراقبة الجودة</h3>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* Update Status */}
        {currentStatus === 'opened' && (
          <button
            onClick={() => handleUpdateStatus('investigating')}
            disabled={loading}
            className="w-full px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors text-sm"
          >
            بدء التحقيق
          </button>
        )}

        {currentStatus === 'investigating' && (
          <button
            onClick={() => handleUpdateStatus('escalated')}
            disabled={loading}
            className="w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
          >
            تصعيد النزاع
          </button>
        )}

        {/* Site Visit Controls */}
        {!siteVisitRequired ? (
          <button
            onClick={() => handleToggleSiteVisit(true)}
            disabled={loading}
            className="w-full px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors text-sm"
          >
            🚗 تحديد زيارة ميدانية
          </button>
        ) : !siteVisitCompleted ? (
          <button
            onClick={handleMarkSiteVisitCompleted}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
          >
            ✓ تسجيل إكمال الزيارة
          </button>
        ) : null}

        {/* QC Notes */}
        {!showQCForm ? (
          <button
            onClick={() => setShowQCForm(true)}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
          >
            📝 إضافة ملاحظات QC
          </button>
        ) : (
          <form onSubmit={handleAddQCNotes} className="space-y-3 border-t pt-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                ملاحظات مراقبة الجودة *
              </label>
              <textarea
                value={qcNotes}
                onChange={(e) => setQcNotes(e.target.value)}
                required
                rows={3}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="أدخل ملاحظاتك هنا..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                الإجراء المتخذ (اختياري)
              </label>
              <textarea
                value={qcAction}
                onChange={(e) => setQcAction(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="ماذا فعلت؟"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                حفظ
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQCForm(false)
                  setQcNotes('')
                  setQcAction('')
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 text-sm"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}

        {/* Resolve Dispute */}
        {!showResolveForm ? (
          <button
            onClick={() => setShowResolveForm(true)}
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
          >
            ✓ حل النزاع
          </button>
        ) : (
          <form onSubmit={handleResolveDispute} className="space-y-3 border-t pt-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                ملخص الحل *
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                required
                rows={4}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="كيف تم حل النزاع؟"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                تأكيد الحل
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResolveForm(false)
                  setResolution('')
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 text-sm"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
