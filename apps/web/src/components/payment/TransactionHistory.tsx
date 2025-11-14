/**
 * Transaction History Component
 * =============================
 * Display payment transaction history with filters
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download, Search, ChevronDown } from 'lucide-react'

interface Transaction {
  id: string
  orderId: string
  orderNumber: string
  amount: number
  currency: string
  status: 'pending' | 'captured' | 'released' | 'refunded' | 'failed' | 'disputed'
  paymentMethod: {
    type: string
    last4?: string
    brand?: string
  }
  createdAt: string
  updatedAt: string
  supplierName?: string
  escrowReleaseDate?: string
  refundAmount?: number
  refundReason?: string
}

interface TransactionHistoryProps {
  customerId?: string
  supplierId?: string
  limit?: number
  showFilters?: boolean
  showExport?: boolean
}

export function TransactionHistory({
  customerId,
  supplierId,
  limit,
  showFilters = true,
  showExport = true
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  useEffect(() => {
    loadTransactions()
  }, [customerId, supplierId])

  useEffect(() => {
    applyFilters()
  }, [transactions, statusFilter, dateRange, searchQuery])

  async function loadTransactions() {
    try {
      const supabase = createClient()
      let query = (supabase as any)
        .from('payment_transactions')
        .select(`
          *,
          order:orders!inner(
            order_number,
            supplier:suppliers(business_name)
          ),
          payment_method:payment_methods(
            type,
            last4,
            brand
          )
        `)

      // Apply role-based filters
      if (customerId) {
        query = query.eq('customer_id', customerId)
      }
      if (supplierId) {
        query = query.eq('order.supplier_id', supplierId)
      }

      // Apply limit if specified
      if (limit) {
        query = query.limit(limit)
      }

      // Order by date
      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      // Transform data
      const formattedTransactions: Transaction[] = (data || []).map((tx: any) => ({
        id: tx.id,
        orderId: tx.order_id,
        orderNumber: tx.order?.order_number || '',
        amount: tx.amount,
        currency: tx.currency || 'JOD',
        status: tx.status,
        paymentMethod: {
          type: tx.payment_method?.type || 'card',
          last4: tx.payment_method?.last4,
          brand: tx.payment_method?.brand
        },
        createdAt: tx.created_at,
        updatedAt: tx.updated_at,
        supplierName: tx.order?.supplier?.business_name,
        escrowReleaseDate: tx.escrow_release_date,
        refundAmount: tx.refunded_amount,
        refundReason: tx.refund_reason
      }))

      setTransactions(formattedTransactions)
      setFilteredTransactions(formattedTransactions)
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...transactions]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter)
    }

    // Date range filter
    if (dateRange.from) {
      filtered = filtered.filter(tx => new Date(tx.createdAt) >= new Date(dateRange.from))
    }
    if (dateRange.to) {
      filtered = filtered.filter(tx => new Date(tx.createdAt) <= new Date(dateRange.to))
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(tx =>
        tx.orderNumber.toLowerCase().includes(query) ||
        tx.id.toLowerCase().includes(query) ||
        tx.supplierName?.toLowerCase().includes(query)
      )
    }

    setFilteredTransactions(filtered)
  }

  function exportToCSV() {
    const headers = ['التاريخ', 'رقم الطلب', 'المبلغ', 'الحالة', 'طريقة الدفع', 'المورد']
    const rows = filteredTransactions.map(tx => [
      new Date(tx.createdAt).toLocaleDateString('ar-JO'),
      tx.orderNumber,
      `${tx.amount} ${tx.currency}`,
      getStatusLabel(tx.status),
      getPaymentMethodLabel(tx.paymentMethod),
      tx.supplierName || '-'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'معلق'
      case 'captured':
        return 'محجوز'
      case 'released':
        return 'مفرج عنه'
      case 'refunded':
        return 'مسترجع'
      case 'failed':
        return 'فشل'
      case 'disputed':
        return 'متنازع عليه'
      default:
        return status
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'captured':
        return 'bg-blue-100 text-blue-800'
      case 'released':
        return 'bg-green-100 text-green-800'
      case 'refunded':
        return 'bg-gray-100 text-gray-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'disputed':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  function getPaymentMethodLabel(method: Transaction['paymentMethod']): string {
    if (method.type === 'card' && method.brand && method.last4) {
      return `${method.brand} •••• ${method.last4}`
    }
    switch (method.type) {
      case 'card':
        return 'بطاقة ائتمان'
      case 'bank':
        return 'تحويل بنكي'
      case 'wallet':
        return 'محفظة إلكترونية'
      default:
        return 'غير محدد'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="border-b pb-4">
              <div className="flex justify-between mb-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-48"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header with Filters */}
      {showFilters && (
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">سجل المعاملات</h2>
            {showExport && filteredTransactions.length > 0 && (
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
              >
                <Download className="w-4 h-4" />
                تصدير CSV
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white flex items-center justify-between hover:bg-gray-50"
              >
                <span>{statusFilter === 'all' ? 'جميع الحالات' : getStatusLabel(statusFilter)}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showFilterDropdown && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                  {['all', 'pending', 'captured', 'released', 'refunded', 'failed', 'disputed'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status)
                        setShowFilterDropdown(false)
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {status === 'all' ? 'جميع الحالات' : getStatusLabel(status)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date From */}
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="من تاريخ"
            />

            {/* Date To */}
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="إلى تاريخ"
            />
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="divide-y">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg mb-2">لا توجد معاملات</p>
            <p className="text-sm">لم يتم العثور على معاملات تطابق معايير البحث</p>
          </div>
        ) : (
          filteredTransactions.map(transaction => (
            <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                {/* Transaction Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      طلب #{transaction.orderNumber}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                      {getStatusLabel(transaction.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <span>{new Date(transaction.createdAt).toLocaleDateString('ar-JO')}</span>
                    <span>•</span>
                    <span>{getPaymentMethodLabel(transaction.paymentMethod)}</span>
                    {transaction.supplierName && (
                      <>
                        <span>•</span>
                        <span>{transaction.supplierName}</span>
                      </>
                    )}
                  </div>
                  {transaction.status === 'refunded' && transaction.refundReason && (
                    <p className="mt-2 text-sm text-gray-500">
                      سبب الاسترجاع: {transaction.refundReason}
                    </p>
                  )}
                  {transaction.status === 'captured' && transaction.escrowReleaseDate && (
                    <p className="mt-2 text-sm text-blue-600">
                      سيتم الإفراج: {new Date(transaction.escrowReleaseDate).toLocaleDateString('ar-JO')}
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">
                    {transaction.amount.toFixed(2)} {transaction.currency}
                  </p>
                  {transaction.status === 'refunded' && transaction.refundAmount && transaction.refundAmount < transaction.amount && (
                    <p className="text-sm text-gray-500">
                      مسترجع: {transaction.refundAmount.toFixed(2)} {transaction.currency}
                    </p>
                  )}
                  <a
                    href={`/orders/${transaction.orderId}`}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    عرض التفاصيل ←
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {filteredTransactions.length > 0 && (
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              عرض {filteredTransactions.length} من {transactions.length} معاملة
            </span>
            <div className="text-right">
              <p className="text-sm text-gray-600">الإجمالي</p>
              <p className="text-xl font-bold text-gray-900">
                {filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)} JOD
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}