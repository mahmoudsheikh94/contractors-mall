'use client'

interface VerificationBadgesProps {
  emailVerified?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
}

export default function VerificationBadges({
  emailVerified = false,
  size = 'md',
  showLabels = true
}: VerificationBadgesProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  }

  const sizeClass = sizeClasses[size]

  // If email not verified, show nothing
  if (!emailVerified) {
    return null
  }

  return (
    <span
      className={`inline-flex items-center gap-1 bg-blue-100 text-blue-800 font-medium rounded-full ${sizeClass}`}
      title="بريد إلكتروني مُحقق"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      {showLabels && <span>بريد مُحقق</span>}
    </span>
  )
}
