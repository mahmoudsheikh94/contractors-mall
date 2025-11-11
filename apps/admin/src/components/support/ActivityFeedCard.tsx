import Link from 'next/link'

interface ActivityFeedCardProps {
  activity: {
    event_type: string
    reference_id: string
    event_time: string
    user_id?: string
    metadata: any
    user?: {
      full_name: string
      role: string
      email: string
    }
  }
}

export default function ActivityFeedCard({ activity }: ActivityFeedCardProps) {
  const getActivityIcon = (eventType: string): string => {
    const icons: Record<string, string> = {
      order_created: '📦',
      order_status_changed: '🔄',
      dispute_created: '⚖️',
      dispute_status_changed: '⚖️',
      supplier_registered: '🏪',
      supplier_verified: '✅',
      payment_escrow: '💰',
      payment_released: '💸',
      payment_refunded: '↩️',
    }
    return icons[eventType] || '📌'
  }

  const getActivityColor = (eventType: string): string => {
    const colors: Record<string, string> = {
      order_created: 'text-blue-600 bg-blue-50',
      order_status_changed: 'text-purple-600 bg-purple-50',
      dispute_created: 'text-red-600 bg-red-50',
      dispute_status_changed: 'text-orange-600 bg-orange-50',
      supplier_registered: 'text-green-600 bg-green-50',
      supplier_verified: 'text-green-600 bg-green-50',
      payment_escrow: 'text-yellow-600 bg-yellow-50',
      payment_released: 'text-green-600 bg-green-50',
      payment_refunded: 'text-gray-600 bg-gray-50',
    }
    return colors[eventType] || 'text-gray-600 bg-gray-50'
  }

  const getActivityTitle = (eventType: string, metadata: any): string => {
    const titles: Record<string, string> = {
      order_created: `طلب جديد #${metadata.order_number || ''}`,
      order_status_changed: `تغيير حالة الطلب #${metadata.order_number || ''}`,
      dispute_created: `نزاع جديد على الطلب #${metadata.order_number || ''}`,
      dispute_status_changed: `تحديث حالة النزاع`,
      supplier_registered: `مورد جديد: ${metadata.business_name || ''}`,
      supplier_verified: `توثيق مورد: ${metadata.business_name || ''}`,
      payment_escrow: `احتجاز دفعة: ${metadata.amount_jod || 0} د.أ`,
      payment_released: `تحرير دفعة: ${metadata.amount_jod || 0} د.أ`,
      payment_refunded: `استرداد دفعة: ${metadata.amount_jod || 0} د.أ`,
    }
    return titles[eventType] || 'نشاط'
  }

  const getActivityDescription = (eventType: string, metadata: any): string => {
    const descriptions: Record<string, string> = {
      order_created: `بقيمة ${metadata.total_jod || 0} د.أ`,
      order_status_changed: `من ${metadata.old_status || ''} إلى ${metadata.new_status || ''}`,
      dispute_created: `السبب: ${metadata.reason || ''}`,
      dispute_status_changed: `${metadata.old_status || ''} → ${metadata.new_status || ''}`,
      supplier_registered: `في انتظار التوثيق`,
      supplier_verified: `جاهز للعمل`,
      payment_escrow: `للطلب #${metadata.order_number || ''}`,
      payment_released: `للمورد ${metadata.supplier_name || ''}`,
      payment_refunded: `للعميل ${metadata.contractor_name || ''}`,
    }
    return descriptions[eventType] || ''
  }

  const getActivityLink = (eventType: string, referenceId: string, metadata: any): string | null => {
    if (eventType.startsWith('order_')) {
      return `/admin/orders/${metadata.order_id || referenceId}`
    }
    if (eventType.startsWith('dispute_')) {
      return `/admin/disputes/${metadata.dispute_id || referenceId}`
    }
    if (eventType.startsWith('supplier_')) {
      return `/admin/suppliers/${metadata.supplier_id || referenceId}`
    }
    return null
  }

  const timeAgo = (date: string): string => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)

    if (seconds < 60) return 'منذ لحظات'
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`
    if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`
    return new Date(date).toLocaleDateString('ar-JO')
  }

  const link = getActivityLink(activity.event_type, activity.reference_id, activity.metadata)

  const content = (
    <div className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${getActivityColor(activity.event_type)}`}>
        {getActivityIcon(activity.event_type)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">
          {getActivityTitle(activity.event_type, activity.metadata)}
        </p>
        {getActivityDescription(activity.event_type, activity.metadata) && (
          <p className="text-sm text-gray-600 mt-1">
            {getActivityDescription(activity.event_type, activity.metadata)}
          </p>
        )}
        {activity.user && (
          <p className="text-xs text-gray-500 mt-1">
            {activity.user.full_name} ({activity.user.role})
          </p>
        )}
      </div>

      <div className="flex-shrink-0 text-xs text-gray-500">
        {timeAgo(activity.event_time)}
      </div>
    </div>
  )

  if (link) {
    return (
      <Link href={link} className="block">
        {content}
      </Link>
    )
  }

  return <div>{content}</div>
}
