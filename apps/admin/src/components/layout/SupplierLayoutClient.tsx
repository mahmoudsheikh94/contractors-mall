'use client'

import { useState, ReactNode } from 'react'
import SupplierSidebar from '../SupplierSidebar'
import { MobileTopBar } from './MobileTopBar'
import { BottomNav } from './BottomNav'
import { NotificationPanel } from '../NotificationPanel'

interface SupplierLayoutClientProps {
  businessName: string
  userName: string
  children: ReactNode
}

export function SupplierLayoutClient({ businessName, userName, children }: SupplierLayoutClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Mobile Top Bar */}
      <MobileTopBar
        businessName={businessName}
        onMenuClick={() => setIsMobileMenuOpen(true)}
      />

      <div className="flex h-screen">
        {/* Sidebar (responsive) */}
        <SupplierSidebar
          businessName={businessName}
          userName={userName}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Desktop Header */}
          <div className="hidden md:block sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {businessName}
              </h2>
              <NotificationPanel />
            </div>
          </div>

          {/* Page Content */}
          <div className="p-4 md:p-8 pb-20 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Navigation (mobile only) */}
      <BottomNav />
    </div>
  )
}
