'use client'

/**
 * Download PDF Button Component
 * ==============================
 *
 * Client component for generating and downloading invoice PDFs
 * - Shows "Generate PDF" if no PDF exists
 * - Shows "Download PDF" if PDF exists
 * - Handles loading states and errors
 */

import { useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'

interface DownloadPDFButtonProps {
  invoiceId: string
  pdfUrl: string | null
  invoiceNumber: string
}

export function DownloadPDFButton({ invoiceId, pdfUrl, invoiceNumber }: DownloadPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState(pdfUrl)
  const [error, setError] = useState('')

  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true)
      setError('')

      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate PDF')
      }

      setCurrentPdfUrl(data.pdfUrl)

      // Show success message
      alert('تم إنشاء ملف PDF بنجاح!\nPDF generated successfully!')

    } catch (err: any) {
      console.error('PDF generation error:', err)
      setError(err.message || 'حدث خطأ أثناء إنشاء ملف PDF')
      alert(`خطأ: ${err.message}\nError: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // If PDF exists, show download button
  if (currentPdfUrl) {
    return (
      <div>
        <a
          href={currentPdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-sm"
        >
          <Download className="h-5 w-5" />
          <span>تحميل PDF</span>
        </a>
        <button
          onClick={handleGeneratePDF}
          disabled={isGenerating}
          className="mr-3 inline-flex items-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>جار إعادة الإنشاء...</span>
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              <span>إعادة إنشاء PDF</span>
            </>
          )}
        </button>
      </div>
    )
  }

  // If no PDF, show generate button
  return (
    <div>
      <button
        onClick={handleGeneratePDF}
        disabled={isGenerating}
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>جار إنشاء PDF...</span>
          </>
        ) : (
          <>
            <FileText className="h-5 w-5" />
            <span>إنشاء ملف PDF</span>
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
