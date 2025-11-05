'use client'

interface VerificationBadgesProps {
  emailVerified?: boolean
  phoneVerified?: boolean
  verificationMethod?: 'email' | 'phone' | 'both' | null
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
}

export default function VerificationBadges({
  emailVerified = false,
  phoneVerified = false,
  verificationMethod = null,
  size = 'md',
  showLabels = true
}: VerificationBadgesProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  }

  const sizeClass = sizeClasses[size]

  // If no verification, show nothing
  if (!emailVerified && !phoneVerified) {
    return null
  }

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      {emailVerified && (
        <span
          className={`inline-flex items-center gap-1 bg-blue-100 text-blue-800 font-medium rounded-full ${sizeClass}`}
          title="بريد إلكتروني مُحقق"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {showLabels && <span>بريد مُحقق</span>}
        </span>
      )}

      {phoneVerified && (
        <span
          className={`inline-flex items-center gap-1 bg-green-100 text-green-800 font-medium rounded-full ${sizeClass}`}
          title="رقم هاتف مُحقق"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          {showLabels && <span>هاتف مُحقق</span>}
        </span>
      )}

      {verificationMethod === 'both' && (
        <span
          className={`inline-flex items-center gap-1 bg-purple-100 text-purple-800 font-medium rounded-full ${sizeClass}`}
          title="تحقق مزدوج - موثوق 100%"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {showLabels && <span>موثوق</span>}
        </span>
      )}
    </div>
  )
}
