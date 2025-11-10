'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  /**
   * Custom breadcrumb items. If not provided, will auto-generate from pathname.
   */
  items?: BreadcrumbItem[]

  /**
   * Maximum number of levels to show (default: 3)
   */
  maxLevels?: number

  /**
   * Custom labels for path segments (e.g., { 'products': 'المنتجات', 'new': 'منتج جديد' })
   */
  labels?: Record<string, string>

  /**
   * Hide breadcrumbs on mobile (default: true)
   */
  hideOnMobile?: boolean
}

// Default labels for common paths (Arabic)
const DEFAULT_LABELS: Record<string, string> = {
  // Main sections
  dashboard: 'لوحة التحكم',
  orders: 'الطلبات',
  products: 'المنتجات',
  deliveries: 'التوصيل',
  customers: 'العملاء',
  wallet: 'المحفظة',
  profile: 'الملف التجاري',
  zones: 'المناطق والرسوم',
  settings: 'الإعدادات',

  // Actions
  new: 'جديد',
  edit: 'تعديل',

  // Other
  notifications: 'الإشعارات',
  tags: 'الوسوم',
}

export function Breadcrumbs({
  items: customItems,
  maxLevels = 3,
  labels: customLabels = {},
  hideOnMobile = true,
}: BreadcrumbsProps) {
  const pathname = usePathname()

  // Merge custom labels with defaults
  const labels = { ...DEFAULT_LABELS, ...customLabels }

  // Generate breadcrumb items from pathname if not provided
  const items: BreadcrumbItem[] = customItems || generateBreadcrumbs(pathname, labels)

  // Limit to maxLevels
  const visibleItems = items.slice(0, maxLevels)

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="مسار التنقل"
      className={hideOnMobile ? 'hidden sm:block mb-4' : 'mb-4'}
    >
      <ol role="list" className="flex items-center gap-2 text-sm">
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1

          return (
            <li key={index} className="flex items-center gap-2">
              {/* Chevron separator (except for first item) */}
              {index > 0 && (
                <ChevronSeparator />
              )}

              {/* Breadcrumb link or text */}
              {isLast || !item.href ? (
                <span
                  className="text-gray-900 font-medium"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * RTL-aware chevron separator
 * Shows ‹ in RTL (Arabic), › in LTR (English)
 */
function ChevronSeparator() {
  return (
    <svg
      className="w-4 h-4 text-gray-400 rtl:rotate-180"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  )
}

/**
 * Auto-generate breadcrumbs from pathname
 */
function generateBreadcrumbs(
  pathname: string,
  labels: Record<string, string>
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // Skip first segment if it's a locale (ar, en)
  const startIndex = segments[0] === 'ar' || segments[0] === 'en' ? 1 : 0

  // Skip 'supplier' prefix if present
  const relevantSegments = segments[startIndex] === 'supplier'
    ? segments.slice(startIndex + 1)
    : segments.slice(startIndex)

  // Add home/dashboard as first item
  breadcrumbs.push({
    label: labels.dashboard || 'الرئيسية',
    href: '/supplier/dashboard',
  })

  // Build breadcrumbs for each segment
  relevantSegments.forEach((segment, index) => {
    // Skip UUIDs and numeric IDs in breadcrumbs
    const isId = /^[a-f0-9\-]{36}$/.test(segment) || /^\d+$/.test(segment)

    if (isId) {
      // For ID segments, use the label from the previous segment with # prefix
      const previousLabel = breadcrumbs[breadcrumbs.length - 1]?.label || ''
      const singularLabel = getSingularLabel(previousLabel)
      breadcrumbs.push({
        label: `${singularLabel} #${segment.slice(0, 8)}...`,
        // Don't add href for ID segments (they're the current page)
      })
    } else {
      // Build href for this segment
      const href = `/supplier/${relevantSegments.slice(0, index + 1).join('/')}`

      // Get label (custom or default)
      const label = labels[segment] || capitalizeArabic(segment)

      breadcrumbs.push({
        label,
        href,
      })
    }
  })

  return breadcrumbs
}

/**
 * Get singular form of plural Arabic labels
 */
function getSingularLabel(pluralLabel: string): string {
  const singularMap: Record<string, string> = {
    'الطلبات': 'طلب',
    'المنتجات': 'منتج',
    'التوصيل': 'توصيل',
    'العملاء': 'عميل',
  }

  return singularMap[pluralLabel] || pluralLabel
}

/**
 * Capitalize first letter (for non-translated segments)
 */
function capitalizeArabic(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
