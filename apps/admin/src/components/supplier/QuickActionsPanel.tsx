'use client'

import { useState } from 'react'

interface QuickActionsPanelProps {
  supplierId: string
  selectedProducts?: string[]
  onRefresh?: () => void
}

export function QuickActionsPanel({
  supplierId,
  selectedProducts = [],
  onRefresh,
}: QuickActionsPanelProps) {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  const handleExportCSV = async () => {
    try {
      setExporting(true)

      const response = await fetch(`/api/supplier/products/export?supplierId=${supplierId}`)

      if (!response.ok) {
        throw new Error('Failed to export products')
      }

      // Get the CSV blob
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `products-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('فشل تصدير المنتجات')
    } finally {
      setExporting(false)
    }
  }

  const handleImportCSV = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        setImporting(true)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('supplierId', supplierId)

        const response = await fetch('/api/supplier/products/import', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to import products')
        }

        alert(`تم استيراد ${result.imported} منتج بنجاح${result.errors?.length > 0 ? `\n\nتحذيرات: ${result.errors.length}` : ''}`)

        if (onRefresh) {
          onRefresh()
        }
      } catch (error: any) {
        console.error('Import error:', error)
        alert(error.message || 'فشل استيراد المنتجات')
      } finally {
        setImporting(false)
      }
    }
    input.click()
  }

  const handleDownloadTemplate = () => {
    // CSV template with headers
    const headers = [
      'SKU',
      'name_ar',
      'name_en',
      'description_ar',
      'description_en',
      'category_id',
      'unit_ar',
      'unit_en',
      'price_per_unit',
      'min_order_quantity',
      'stock_quantity',
      'weight_kg_per_unit',
      'volume_m3_per_unit',
      'length_m_per_unit',
      'requires_open_bed',
      'is_available',
    ].join(',')

    const example = [
      'SKU-001',
      'اسمنت',
      'Cement',
      'اسمنت عالي الجودة',
      'High quality cement',
      'category-id-here',
      'كيس',
      'bag',
      '5.50',
      '10',
      '100',
      '50',
      '0.04',
      '',
      'false',
      'true',
    ].join(',')

    const csv = `${headers}\n${example}`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'products-template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">⚡ إجراءات سريعة</h2>
          <p className="text-sm text-gray-600 mt-1">
            عمليات جماعية وتصدير/استيراد المنتجات
          </p>
        </div>
        {selectedProducts.length > 0 && (
          <div className="text-sm text-primary-700 font-medium">
            {selectedProducts.length} منتج محدد
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="flex items-center justify-center gap-2 bg-white border-2 border-green-200 text-green-700 px-4 py-3 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-xl">📥</span>
          <span>{exporting ? 'جاري التصدير...' : 'تصدير CSV'}</span>
        </button>

        {/* Import CSV */}
        <button
          onClick={handleImportCSV}
          disabled={importing}
          className="flex items-center justify-center gap-2 bg-white border-2 border-blue-200 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-xl">📤</span>
          <span>{importing ? 'جاري الاستيراد...' : 'استيراد CSV'}</span>
        </button>

        {/* Download Template */}
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center justify-center gap-2 bg-white border-2 border-purple-200 text-purple-700 px-4 py-3 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors font-semibold"
        >
          <span className="text-xl">📋</span>
          <span>تحميل النموذج</span>
        </button>

        {/* Bulk Edit (disabled if no selection) */}
        <button
          disabled={selectedProducts.length === 0}
          className="flex items-center justify-center gap-2 bg-white border-2 border-amber-200 text-amber-700 px-4 py-3 rounded-lg hover:bg-amber-50 hover:border-amber-300 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          title={selectedProducts.length === 0 ? 'اختر منتجات للتعديل الجماعي' : ''}
        >
          <span className="text-xl">✏️</span>
          <span>تعديل جماعي</span>
        </button>
      </div>

      {/* Helper Text */}
      <div className="mt-4 flex items-start gap-2 text-xs text-gray-600 bg-white/50 rounded-lg p-3">
        <span>💡</span>
        <div>
          <p className="font-medium mb-1">نصائح:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>استخدم "تحميل النموذج" للحصول على ملف CSV بالتنسيق الصحيح</li>
            <li>"تصدير CSV" يقوم بتصدير جميع منتجاتك الحالية</li>
            <li>"استيراد CSV" يدعم إضافة وتحديث المنتجات</li>
            <li>حدد منتجات من القائمة لتفعيل "تعديل جماعي"</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
