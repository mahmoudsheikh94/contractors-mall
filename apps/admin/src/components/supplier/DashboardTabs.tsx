'use client'

import { useState } from 'react'

interface DashboardTabsProps {
  overviewContent: React.ReactNode
  analyticsContent: React.ReactNode
}

export function DashboardTabs({ overviewContent, analyticsContent }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview')

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 space-x-reverse" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            📊 نظرة عامة
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'analytics'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            📈 التحليلات المتقدمة
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && overviewContent}
        {activeTab === 'analytics' && analyticsContent}
      </div>
    </div>
  )
}
