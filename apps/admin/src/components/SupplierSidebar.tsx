'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface SidebarProps {
  businessName: string
  userName: string
  isOpen?: boolean
  onClose?: () => void
}

export default function SupplierSidebar({ businessName, userName, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isOpen && onClose) {
      onClose()
    }
  }, [pathname])

  // Close sidebar on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

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
    <>
      {/* Overlay (mobile only) */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 bottom-0 start-0 z-50
          w-64 bg-white shadow-lg
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          rtl:${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">{businessName}</h2>
              <p className="text-sm text-gray-600 mt-1 truncate">{userName}</p>
            </div>

            {/* Close button (mobile only) */}
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden ms-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="إغلاق القائمة"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1 overflow-y-auto">
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
                    <span className="text-xl me-3">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <span className="text-xl me-2">🚪</span>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  )
}