'use client'

import { NotificationPanel } from '../NotificationPanel'

interface MobileTopBarProps {
  /**
   * Business/supplier name to display
   */
  businessName: string

  /**
   * Callback when hamburger menu is clicked
   */
  onMenuClick: () => void
}

export function MobileTopBar({ businessName, onMenuClick }: MobileTopBarProps) {
  return (
    <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Hamburger Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="فتح القائمة"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Business Name */}
        <h1 className="text-lg font-bold text-gray-900 truncate flex-1 mx-4 text-center">
          {businessName}
        </h1>

        {/* Notification Panel */}
        <div className="flex-shrink-0">
          <NotificationPanel />
        </div>
      </div>
    </header>
  )
}
