'use client'

import { useState, useMemo } from 'react'
import { ContractorProfileCard } from './ContractorProfileCard'

interface Contractor {
  id: string
  full_name: string
  email: string
  phone: string
  created_at: string
  insights: {
    total_orders: number
    total_spent: number
    average_order_value: number
    last_order_date: string | null
    days_since_last_order: number | null
    orders_last_30_days: number
    orders_last_90_days: number
    completed_orders: number
    disputed_orders: number
    rejected_orders: number
  }
}

interface ContractorsListProps {
  initialContractors: Contractor[]
  supplierId: string
}

type SortField = 'name' | 'total_spent' | 'total_orders' | 'last_order' | 'retention_score'
type FilterSegment = 'all' | 'vip' | 'loyal' | 'at_risk' | 'occasional' | 'new'

export function ContractorsList({ initialContractors }: ContractorsListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('total_spent')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterSegment, setFilterSegment] = useState<FilterSegment>('all')

  // Calculate retention score for sorting
  const calculateRetentionScore = (insights: Contractor['insights']): number => {
    if (!insights) return 0
    let score = 0

    // Frequency score (0-40 points)
    if (insights.orders_last_30_days >= 5) score += 40
    else if (insights.orders_last_30_days >= 3) score += 30
    else if (insights.orders_last_30_days >= 1) score += 20

    // Value score (0-30 points)
    if (insights.average_order_value >= 200) score += 30
    else if (insights.average_order_value >= 100) score += 20
    else if (insights.average_order_value >= 50) score += 10

    // Loyalty score (0-30 points)
    if (insights.total_orders >= 20) score += 30
    else if (insights.total_orders >= 10) score += 20
    else if (insights.total_orders >= 5) score += 10

    return score
  }

  // Determine customer segment
  const determineSegment = (insights: Contractor['insights']): FilterSegment => {
    const { total_orders, average_order_value, orders_last_30_days, days_since_last_order } = insights

    // VIP: High value, high frequency
    if (total_orders >= 10 && average_order_value >= 150 && orders_last_30_days >= 2) {
      return 'vip'
    }

    // At Risk: Previously active but now inactive
    if (total_orders >= 5 && days_since_last_order !== null && days_since_last_order > 60) {
      return 'at_risk'
    }

    // Loyal: Consistent ordering
    if (total_orders >= 5 && orders_last_30_days >= 1) {
      return 'loyal'
    }

    // Occasional: Has ordered multiple times
    if (total_orders >= 2) {
      return 'occasional'
    }

    // New: Less than 2 orders
    return 'new'
  }

  // Enrich contractors with calculated fields
  const enrichedContractors = useMemo(() => {
    return initialContractors.map(contractor => ({
      ...contractor,
      retention_score: calculateRetentionScore(contractor.insights),
      customer_segment: determineSegment(contractor.insights)
    }))
  }, [initialContractors])

  // Filter and sort contractors
  const filteredAndSortedContractors = useMemo(() => {
    let result = [...enrichedContractors]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        c =>
          c.full_name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.phone.includes(query)
      )
    }

    // Apply segment filter
    if (filterSegment !== 'all') {
      result = result.filter(c => c.customer_segment === filterSegment)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = a.full_name.localeCompare(b.full_name, 'ar')
          break
        case 'total_spent':
          comparison = a.insights.total_spent - b.insights.total_spent
          break
        case 'total_orders':
          comparison = a.insights.total_orders - b.insights.total_orders
          break
        case 'last_order':
          const dateA = a.insights.last_order_date ? new Date(a.insights.last_order_date).getTime() : 0
          const dateB = b.insights.last_order_date ? new Date(b.insights.last_order_date).getTime() : 0
          comparison = dateA - dateB
          break
        case 'retention_score':
          comparison = a.retention_score - b.retention_score
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [enrichedContractors, searchQuery, filterSegment, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const segmentCounts = useMemo(() => {
    const counts = {
      all: enrichedContractors.length,
      vip: 0,
      loyal: 0,
      at_risk: 0,
      occasional: 0,
      new: 0
    }

    enrichedContractors.forEach(c => {
      counts[c.customer_segment]++
    })

    return counts
  }, [enrichedContractors])

  return (
    <div>
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              بحث عن عميل
            </label>
            <input
              type="text"
              placeholder="ابحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ترتيب حسب
            </label>
            <div className="flex gap-2">
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value as SortField)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="total_spent">إجمالي الإنفاق</option>
                <option value="total_orders">عدد الطلبات</option>
                <option value="retention_score">درجة الاحتفاظ</option>
                <option value="last_order">آخر طلب</option>
                <option value="name">الاسم</option>
              </select>
              <button
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={sortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}
              >
                {sortDirection === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Segment Filter Tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'الكل', icon: '📊' },
            { value: 'vip', label: 'VIP', icon: '👑' },
            { value: 'loyal', label: 'مخلص', icon: '⭐' },
            { value: 'at_risk', label: 'معرض للخطر', icon: '⚠️' },
            { value: 'occasional', label: 'عرضي', icon: '💼' },
            { value: 'new', label: 'جديد', icon: '🆕' }
          ].map(segment => (
            <button
              key={segment.value}
              onClick={() => setFilterSegment(segment.value as FilterSegment)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${
                  filterSegment === segment.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <span className="ml-2">{segment.icon}</span>
              {segment.label}
              <span className="mr-2 text-sm opacity-75">
                ({segmentCounts[segment.value as keyof typeof segmentCounts]})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        عرض {filteredAndSortedContractors.length} من {enrichedContractors.length} عميل
      </div>

      {/* Contractors Grid */}
      {filteredAndSortedContractors.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <span className="text-6xl">🔍</span>
          <h3 className="mt-4 text-xl font-semibold text-gray-900">لا توجد نتائج</h3>
          <p className="mt-2 text-gray-600">
            {searchQuery
              ? 'لم يتم العثور على عملاء مطابقين لبحثك'
              : 'لا يوجد عملاء في هذه الفئة'}
          </p>
          {(searchQuery || filterSegment !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setFilterSegment('all')
              }}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedContractors.map(contractor => (
            <ContractorProfileCard
              key={contractor.id}
              contractor={contractor}
            />
          ))}
        </div>
      )}
    </div>
  )
}
