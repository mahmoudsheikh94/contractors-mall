'use client'

import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs'
import Link from 'next/link'
import { ReactNode } from 'react'

export interface Action {
  /**
   * Action label (e.g., "حفظ", "إضافة منتج")
   */
  label: string

  /**
   * Click handler
   */
  onClick?: () => void

  /**
   * Link href (use either onClick or href, not both)
   */
  href?: string

  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'

  /**
   * Icon to show before label
   */
  icon?: ReactNode

  /**
   * Disabled state
   */
  disabled?: boolean

  /**
   * Loading state
   */
  loading?: boolean
}

interface PageHeaderProps {
  /**
   * Page title (e.g., "تفاصيل المنتج", "الطلبات")
   */
  title: string

  /**
   * Optional subtitle/description
   */
  subtitle?: string

  /**
   * Optional metadata (e.g., "تم الإنشاء في 2025-01-01")
   */
  metadata?: ReactNode

  /**
   * Breadcrumb items (if not provided, auto-generates from pathname)
   */
  breadcrumbs?: BreadcrumbItem[]

  /**
   * Custom breadcrumb labels
   */
  breadcrumbLabels?: Record<string, string>

  /**
   * Hide breadcrumbs
   */
  hideBreadcrumbs?: boolean

  /**
   * Primary action button (e.g., Save, Add Product)
   */
  primaryAction?: Action

  /**
   * Secondary action buttons
   */
  secondaryActions?: Action[]

  /**
   * Additional custom content (e.g., tabs, filters)
   */
  children?: ReactNode

  /**
   * Optional thumbnail/image (for detail pages)
   */
  thumbnail?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  metadata,
  breadcrumbs,
  breadcrumbLabels,
  hideBreadcrumbs = false,
  primaryAction,
  secondaryActions = [],
  children,
  thumbnail,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {/* Breadcrumbs */}
      {!hideBreadcrumbs && (
        <Breadcrumbs items={breadcrumbs} labels={breadcrumbLabels} />
      )}

      {/* Header Content */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left Side: Title, Subtitle, Metadata */}
        <div className="flex gap-4 items-start min-w-0 flex-1">
          {/* Thumbnail */}
          {thumbnail && (
            <div className="flex-shrink-0 hidden sm:block">
              {thumbnail}
            </div>
          )}

          {/* Title Area */}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
              {title}
            </h1>

            {subtitle && (
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                {subtitle}
              </p>
            )}

            {metadata && (
              <div className="text-gray-500 mt-2 text-xs sm:text-sm">
                {metadata}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Actions */}
        {(primaryAction || secondaryActions.length > 0) && (
          <div className="flex flex-row-reverse sm:flex-row items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Primary Action */}
            {primaryAction && (
              <ActionButton action={primaryAction} variant="primary" />
            )}

            {/* Secondary Actions */}
            {secondaryActions.map((action, index) => (
              <ActionButton key={index} action={action} variant="secondary" />
            ))}
          </div>
        )}
      </div>

      {/* Additional Content (tabs, filters, etc.) */}
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Action button component
 */
function ActionButton({ action, variant }: { action: Action; variant?: Action['variant'] }) {
  const actualVariant = action.variant || variant || 'primary'

  const baseClasses = 'inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base'

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  }

  const className = `${baseClasses} ${variantClasses[actualVariant]}`

  const content = (
    <>
      {action.icon && (
        <span className="me-2 flex-shrink-0">
          {action.icon}
        </span>
      )}
      <span>{action.loading ? 'جاري التحميل...' : action.label}</span>
    </>
  )

  if (action.href) {
    return (
      <Link
        href={action.href}
        className={className}
        aria-disabled={action.disabled}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      onClick={action.onClick}
      disabled={action.disabled || action.loading}
      className={className}
    >
      {content}
    </button>
  )
}
