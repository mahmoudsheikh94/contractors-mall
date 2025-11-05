'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  businessName: string
  userName: string
}

export default function SupplierSidebar({ businessName, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const menuItems = [
    {
      label: 'لوحة التحكم',
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
      label: 'التوصيل',
      href: '/supplier/deliveries',
      icon: '🚚',
    },
    {
      label: 'المحفظة',
      href: '/supplier/wallet',
      icon: '💰',
    },
    {
      label: 'الملف التجاري',
      href: '/supplier/profile',
      icon: '🏢',
    },
    {
      label: 'المناطق والرسوم',
      href: '/supplier/zones',
      icon: '🗺️',
    },
  ]

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="w-64 bg-white shadow-lg">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-gray-900">{businessName}</h2>
        <p className="text-sm text-gray-600 mt-1">{userName}</p>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl ml-3">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 w-64 p-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <span className="text-xl ml-2">🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  )
}