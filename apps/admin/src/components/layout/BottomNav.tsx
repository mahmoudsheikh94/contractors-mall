'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BottomNavItem {
  label: string
  href: string
  icon: string
  badge?: number
}

const NAV_ITEMS: BottomNavItem[] = [
  {
    label: 'الرئيسية',
    href: '/supplier/dashboard',
    icon: '📊',
  },
  {
    label: 'الطلبات',
    href: '/supplier/orders',
    icon: '📦',
  },
  {
    label: 'المنتجات',
    href: '/supplier/products',
    icon: '🛍️',
  },
  {
    label: 'الحساب',
    href: '/supplier/profile',
    icon: '👤',
  },
]

interface BottomNavProps {
  /**
   * Optional badge counts for nav items (e.g., pending orders count)
   */
  badges?: {
    orders?: number
    products?: number
  }
}

export function BottomNav({ badges }: BottomNavProps = {}) {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-area-bottom"
      role="navigation"
      aria-label="التنقل السريع"
    >
      <ul className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href)
          const badge = item.href.includes('orders') ? badges?.orders : item.href.includes('products') ? badges?.products : undefined

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`
                  flex flex-col items-center justify-center
                  py-3 px-2 min-h-[64px]
                  transition-colors
                  ${isActive ? 'text-primary-600' : 'text-gray-600 hover:text-gray-900'}
                `}
              >
                <div className="relative">
                  <span className="text-2xl block mb-1">{item.icon}</span>

                  {/* Badge */}
                  {badge && badge > 0 && (
                    <span className="absolute -top-1 -end-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>

                <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
