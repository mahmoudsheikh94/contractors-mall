'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AdminSidebarProps {
  userName: string
}

export default function AdminSidebar({ userName }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const menuItems = [
    {
      label: 'لوحة التحكم',
      href: '/admin/dashboard',
      icon: '📊',
    },
    {
      label: 'إدارة الطلبات',
      href: '/admin/orders',
      icon: '📦',
    },
    {
      label: 'إدارة الموردين',
      href: '/admin/suppliers',
      icon: '🏢',
    },
    {
      label: 'المدفوعات',
      href: '/admin/payments',
      icon: '💰',
    },
    {
      label: 'النزاعات',
      href: '/admin/disputes',
      icon: '⚖️',
    },
    {
      label: 'المستخدمون',
      href: '/admin/users',
      icon: '👥',
    },
    {
      label: 'الصحة والمراقبة',
      href: '/admin/health',
      icon: '🏥',
    },
    {
      label: 'إعدادات النظام',
      href: '/admin/settings',
      icon: '⚙️',
    },
  ]

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-xl font-bold text-center">المقاول مول</h2>
        <p className="text-sm text-gray-400 text-center mt-1">لوحة الإدارة</p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
            {userName.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm">{userName}</p>
            <p className="text-xs text-gray-400">مدير النظام</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-semibold"
        >
          <span>🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  )
}
