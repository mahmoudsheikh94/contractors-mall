import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

async function getDeliveries(supplierId: string, filter?: string) {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let query = supabase
    .from('deliveries')
    .select(`
      *,
      order:orders!inner(
        id,
        order_number,
        total_jod,
        status,
        contractor_id,
        supplier_id
      )
    `)
    .eq('order.supplier_id', supplierId)
    .order('scheduled_date', { ascending: true })
    .order('created_at', { ascending: false })

  // Apply filters
  if (filter === 'today') {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    query = query
      .gte('scheduled_date', today.toISOString().split('T')[0])
      .lt('scheduled_date', tomorrow.toISOString().split('T')[0])
  } else if (filter === 'pending') {
    query = query.is('completed_at', null)
  } else if (filter === 'completed') {
    query = query.not('completed_at', 'is', null)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching deliveries:', error)
    return []
  }

  return data || []
}

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const supabase = await createClient()

  // Get current user and supplier info
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">خطأ: لم يتم العثور على حساب المورد</p>
      </div>
    )
  }

  const deliveries = await getDeliveries(supplier.id, searchParams.filter)

  // Calculate stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const stats = {
    today: deliveries.filter(d => d.scheduled_date === todayStr).length,
    pending: deliveries.filter(d => !d.completed_at).length,
    completed: deliveries.filter(d => d.completed_at).length,
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          إدارة التوصيلات
        </h1>
        <p className="text-gray-600 mt-2">
          تتبع وإدارة جميع عمليات التوصيل
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">📅</span>
            <span className="text-sm text-blue-600">اليوم</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{stats.today}</div>
          <div className="text-sm text-blue-700">توصيلات مجدولة</div>
        </div>

        <div className="bg-yellow-50 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">⏳</span>
            <span className="text-sm text-yellow-600">معلقة</span>
          </div>
          <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
          <div className="text-sm text-yellow-700">بانتظار التوصيل</div>
        </div>

        <div className="bg-green-50 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">✅</span>
            <span className="text-sm text-green-600">مكتملة</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{stats.completed}</div>
          <div className="text-sm text-green-700">تم التوصيل</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <FilterButton
              href="/supplier/deliveries"
              label="الكل"
              active={!searchParams.filter}
            />
            <FilterButton
              href="/supplier/deliveries?filter=today"
              label="اليوم"
              active={searchParams.filter === 'today'}
            />
            <FilterButton
              href="/supplier/deliveries?filter=pending"
              label="معلقة"
              active={searchParams.filter === 'pending'}
            />
            <FilterButton
              href="/supplier/deliveries?filter=completed"
              label="مكتملة"
              active={searchParams.filter === 'completed'}
            />
          </div>
        </div>

        {/* Deliveries List */}
        {deliveries.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {(deliveries as any).map((delivery: any) => (
              <DeliveryCard key={delivery.delivery_id} delivery={delivery} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <span className="text-4xl">📭</span>
            <p className="mt-4 text-gray-600">لا توجد توصيلات</p>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterButton({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-primary-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </Link>
  )
}

function DeliveryCard({ delivery }: { delivery: any }) {
  const order = delivery.order
  const isCompleted = !!delivery.completed_at
  const isPinVerified = !!delivery.pin_verified_at
  const isPhotoUploaded = !!delivery.photo_uploaded_at

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Order Number & Status */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              طلب #{order.order_number}
            </h3>
            {isCompleted ? (
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                ✓ تم التوصيل
              </span>
            ) : (
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                ⏳ معلق
              </span>
            )}
          </div>

          {/* Delivery Date & Time */}
          <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>{new Date(delivery.scheduled_date).toLocaleDateString('ar-JO')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🕐</span>
              <span>{getTimeSlotLabel(delivery.scheduled_time_slot)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>💰</span>
              <span>{order.total_jod.toFixed(2)} د.أ</span>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
            <span>📍</span>
            <span>{delivery.address_line}, {delivery.neighborhood}, {delivery.city}</span>
          </div>

          {/* Confirmation Status */}
          {!isCompleted && (
            <div className="flex items-center gap-2 text-sm">
              {order.total_jod >= 120 ? (
                <span className="text-blue-600">
                  🔐 يتطلب رمز PIN للتأكيد
                </span>
              ) : (
                <span className="text-purple-600">
                  📸 يتطلب صورة للتأكيد
                </span>
              )}
            </div>
          )}

          {isCompleted && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              {isPinVerified && <span>✓ تم التحقق بواسطة PIN</span>}
              {isPhotoUploaded && <span>✓ تم رفع صورة التأكيد</span>}
              <span className="text-gray-500">
                • {new Date(delivery.completed_at).toLocaleString('ar-JO')}
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div>
          {!isCompleted ? (
            <Link
              href={`/supplier/deliveries/${delivery.delivery_id}`}
              className="inline-block bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold"
            >
              تأكيد التوصيل ←
            </Link>
          ) : (
            <Link
              href={`/supplier/deliveries/${delivery.delivery_id}`}
              className="inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              عرض التفاصيل ←
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function getTimeSlotLabel(slot: string) {
  const slots: Record<string, string> = {
    morning: 'صباحاً (8:00 - 12:00)',
    afternoon: 'ظهراً (12:00 - 4:00)',
    evening: 'مساءً (4:00 - 8:00)',
  }
  return slots[slot] || slot
}
