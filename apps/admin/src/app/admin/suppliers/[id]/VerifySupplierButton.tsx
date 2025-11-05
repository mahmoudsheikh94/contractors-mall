'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface VerifySupplierButtonProps {
  supplierId: string
}

export function VerifySupplierButton({ supplierId }: VerifySupplierButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleVerify() {
    if (!confirm('هل أنت متأكد من توثيق هذا المورد؟')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('suppliers')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
        })
        .eq('id', supplierId)

      if (updateError) {
        throw updateError
      }

      alert('✓ تم توثيق المورد بنجاح!')
      router.refresh()
    } catch (err: any) {
      console.error('Error verifying supplier:', err)
      setError(err.message || 'فشل توثيق المورد')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <button
        onClick={handleVerify}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>جاري التوثيق...</span>
          </>
        ) : (
          <>
            <span>✓</span>
            <span>توثيق المورد</span>
          </>
        )}
      </button>
    </div>
  )
}
