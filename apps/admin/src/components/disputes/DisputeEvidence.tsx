/**
 * Dispute Evidence Component
 * =========================
 * Handles evidence upload and display for disputes
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Evidence {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  uploaded_by: {
    name: string
    role: string
  }
  description?: string
  created_at: string
}

interface DisputeEvidenceProps {
  disputeId: string
  orderId: string
  canUpload?: boolean
}

export function DisputeEvidence({ disputeId, orderId, canUpload = true }: DisputeEvidenceProps) {
  const router = useRouter()
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [description, setDescription] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadEvidence()
  }, [disputeId])

  async function loadEvidence() {
    try {
      const supabase = createClient()

      const { data, error } = await (supabase as any)
        .from('dispute_evidence')
        .select(`
          *,
          uploaded_by:profiles!uploaded_by(full_name, role)
        `)
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setEvidence(data as any || [])
    } catch (error) {
      console.error('Error loading evidence:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFiles || selectedFiles.length === 0) {
      setError('الرجاء اختيار ملف واحد على الأقل')
      return
    }

    setUploading(true)
    setError('')

    try {
      const supabase = createClient()
      const uploadedFiles: Evidence[] = []

      // Upload each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError(`الملف ${file.name} كبير جداً (الحد الأقصى 10 ميجابايت)`)
          continue
        }

        // Generate unique file name
        const fileExt = file.name.split('.').pop()
        const fileName = `${disputeId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('dispute-evidence')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('dispute-evidence')
          .getPublicUrl(fileName)

        // Save evidence record
        const { data: evidenceData, error: evidenceError } = await (supabase as any)
          .from('dispute_evidence')
          .insert({
            dispute_id: disputeId,
            order_id: orderId,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            description: description || null,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single()

        if (evidenceError) throw evidenceError

        // Log event
        await (supabase as any)
          .from('dispute_events')
          .insert({
            dispute_id: disputeId,
            event_type: 'evidence_uploaded',
            description: `تم رفع ملف: ${file.name}`,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            metadata: {
              file_name: file.name,
              file_type: file.type,
              file_size: file.size
            }
          })
      }

      alert('✓ تم رفع الملفات بنجاح')
      setShowUploadForm(false)
      setDescription('')
      setSelectedFiles(null)
      loadEvidence()
      router.refresh()
    } catch (err: any) {
      console.error('Error uploading evidence:', err)
      setError(err.message || 'فشل رفع الملفات')
    } finally {
      setUploading(false)
    }
  }

  function getFileIcon(fileType: string): string {
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType.startsWith('video/')) return '🎥'
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊'
    return '📎'
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="border-2 border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">الأدلة والمستندات</h3>
        {canUpload && !showUploadForm && (
          <button
            onClick={() => setShowUploadForm(true)}
            className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 text-sm"
          >
            + رفع دليل
          </button>
        )}
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <form onSubmit={handleUpload} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                اختر الملفات *
              </label>
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                الحد الأقصى 10 ميجابايت لكل ملف. الملفات المسموحة: صور، فيديو، PDF، Word، Excel
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                وصف الدليل (اختياري)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="اشرح ما يثبته هذا الدليل..."
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {uploading ? 'جاري الرفع...' : 'رفع الملفات'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUploadForm(false)
                  setDescription('')
                  setSelectedFiles(null)
                  setError('')
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400"
              >
                إلغاء
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Evidence List */}
      {evidence.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl block mb-2">📁</span>
          لم يتم رفع أي أدلة بعد
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidence.map((item) => (
            <div key={item.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getFileIcon(item.file_type)}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {item.file_name}
                  </h4>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{formatFileSize(item.file_size)}</span>
                    <span>•</span>
                    <span>{item.uploaded_by?.name}</span>
                    <span>•</span>
                    <span>{new Date(item.created_at).toLocaleDateString('ar-JO')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-1 bg-primary-100 text-primary-700 text-sm font-medium rounded hover:bg-primary-200 text-center"
                >
                  عرض
                </a>
                {item.file_type.startsWith('image/') && (
                  <button
                    onClick={() => {
                      // Open in modal (implement modal viewer)
                      window.open(item.file_url, '_blank')
                    }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200"
                  >
                    تكبير
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}