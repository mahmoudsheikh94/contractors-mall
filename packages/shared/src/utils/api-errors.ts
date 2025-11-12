/**
 * Standardized API Error Handling
 * ================================
 * Provides consistent error responses across all API routes
 * with bilingual support (Arabic/English) and proper HTTP status codes
 */

// Note: NextResponse import removed to avoid Next.js dependency in shared package
// Consumers of this package should handle response creation

/**
 * Standard API Error Codes
 * Use these for consistent error identification across the app
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Resource Errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',

  // Business Logic Errors
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',

  // Database Errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',

  // External Service Errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  PAYMENT_PROVIDER_ERROR: 'PAYMENT_PROVIDER_ERROR',
  SMS_PROVIDER_ERROR: 'SMS_PROVIDER_ERROR',
  MAP_SERVICE_ERROR: 'MAP_SERVICE_ERROR',

  // System Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

/**
 * Standard Error Response Structure
 */
export interface ApiErrorResponse {
  error: {
    code: ErrorCode
    message: string
    message_ar?: string
    details?: any
    timestamp: string
    request_id?: string
  }
}

/**
 * API Error Class
 * Use this to create consistent error responses
 */
export class ApiError extends Error {
  public readonly code: ErrorCode
  public readonly status: number
  public readonly messageAr?: string
  public readonly details?: any
  public readonly requestId?: string

  constructor(
    code: ErrorCode,
    message: string,
    status: number = 500,
    options?: {
      messageAr?: string
      details?: any
      requestId?: string
    }
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.messageAr = options?.messageAr
    this.details = options?.details
    this.requestId = options?.requestId
  }

  /**
   * Convert to response object
   * Consumers should use this with their framework's response method
   */
  toResponseObject(): ApiErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        message_ar: this.messageAr,
        details: this.details,
        timestamp: new Date().toISOString(),
        request_id: this.requestId,
      }
    }
  }
}

/**
 * Common Error Factory Functions
 */
export const ApiErrors = {
  // Authentication & Authorization
  unauthorized(details?: any): ApiError {
    return new ApiError(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      401,
      {
        messageAr: 'المصادقة مطلوبة',
        details
      }
    )
  },

  forbidden(details?: any): ApiError {
    return new ApiError(
      ErrorCodes.FORBIDDEN,
      'Access denied',
      403,
      {
        messageAr: 'الوصول مرفوض',
        details
      }
    )
  },

  invalidCredentials(): ApiError {
    return new ApiError(
      ErrorCodes.INVALID_CREDENTIALS,
      'Invalid email or password',
      401,
      {
        messageAr: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      }
    )
  },

  sessionExpired(): ApiError {
    return new ApiError(
      ErrorCodes.SESSION_EXPIRED,
      'Your session has expired. Please login again',
      401,
      {
        messageAr: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى'
      }
    )
  },

  // Validation Errors
  validationError(field: string, issue: string): ApiError {
    return new ApiError(
      ErrorCodes.VALIDATION_ERROR,
      `Validation failed: ${issue}`,
      400,
      {
        messageAr: `فشل التحقق: ${issue}`,
        details: { field, issue }
      }
    )
  },

  missingRequiredField(field: string): ApiError {
    return new ApiError(
      ErrorCodes.MISSING_REQUIRED_FIELD,
      `Required field missing: ${field}`,
      400,
      {
        messageAr: `حقل مطلوب مفقود: ${field}`,
        details: { field }
      }
    )
  },

  // Resource Errors
  notFound(resource: string, id?: string): ApiError {
    return new ApiError(
      ErrorCodes.NOT_FOUND,
      `${resource} not found`,
      404,
      {
        messageAr: `${resource} غير موجود`,
        details: { resource, id }
      }
    )
  },

  alreadyExists(resource: string, field?: string): ApiError {
    return new ApiError(
      ErrorCodes.ALREADY_EXISTS,
      `${resource} already exists`,
      409,
      {
        messageAr: `${resource} موجود بالفعل`,
        details: { resource, field }
      }
    )
  },

  conflict(message: string, messageAr?: string): ApiError {
    return new ApiError(
      ErrorCodes.CONFLICT,
      message,
      409,
      { messageAr }
    )
  },

  // Business Logic Errors
  businessRuleViolation(rule: string, messageAr?: string): ApiError {
    return new ApiError(
      ErrorCodes.BUSINESS_RULE_VIOLATION,
      rule,
      422,
      { messageAr }
    )
  },

  insufficientFunds(required: number, available: number): ApiError {
    return new ApiError(
      ErrorCodes.INSUFFICIENT_FUNDS,
      `Insufficient funds. Required: ${required} JOD, Available: ${available} JOD`,
      402,
      {
        messageAr: `الرصيد غير كافي. المطلوب: ${required} د.أ، المتاح: ${available} د.أ`,
        details: { required, available }
      }
    )
  },

  invalidStateTransition(from: string, to: string): ApiError {
    return new ApiError(
      ErrorCodes.INVALID_STATE_TRANSITION,
      `Invalid status transition from ${from} to ${to}`,
      422,
      {
        messageAr: `انتقال حالة غير صالح من ${from} إلى ${to}`,
        details: { from, to }
      }
    )
  },

  // Database Errors
  databaseError(operation: string, error?: any): ApiError {
    return new ApiError(
      ErrorCodes.DATABASE_ERROR,
      `Database operation failed: ${operation}`,
      500,
      {
        messageAr: `فشلت عملية قاعدة البيانات: ${operation}`,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    )
  },

  // External Service Errors
  externalServiceError(service: string, error?: any): ApiError {
    return new ApiError(
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      `External service error: ${service}`,
      503,
      {
        messageAr: `خطأ في الخدمة الخارجية: ${service}`,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    )
  },

  paymentProviderError(message?: string): ApiError {
    return new ApiError(
      ErrorCodes.PAYMENT_PROVIDER_ERROR,
      message || 'Payment processing failed',
      502,
      {
        messageAr: 'فشلت معالجة الدفع'
      }
    )
  },

  // System Errors
  internalError(error?: any): ApiError {
    return new ApiError(
      ErrorCodes.INTERNAL_ERROR,
      'An internal error occurred',
      500,
      {
        messageAr: 'حدث خطأ داخلي',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    )
  },

  serviceUnavailable(): ApiError {
    return new ApiError(
      ErrorCodes.SERVICE_UNAVAILABLE,
      'Service temporarily unavailable',
      503,
      {
        messageAr: 'الخدمة غير متاحة مؤقتاً'
      }
    )
  },

  rateLimitExceeded(limit: number, window: string): ApiError {
    return new ApiError(
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded. Max ${limit} requests per ${window}`,
      429,
      {
        messageAr: `تم تجاوز حد الطلبات. الحد الأقصى ${limit} طلب لكل ${window}`,
        details: { limit, window }
      }
    )
  },

  maintenanceMode(): ApiError {
    return new ApiError(
      ErrorCodes.MAINTENANCE_MODE,
      'System is under maintenance. Please try again later',
      503,
      {
        messageAr: 'النظام تحت الصيانة. يرجى المحاولة مرة أخرى لاحقاً'
      }
    )
  },
}

/**
 * Error Handler Wrapper
 * Framework-agnostic error handling wrapper
 * Consumers should adapt this for their specific framework (Next.js, Express, etc.)
 */
export function handleApiError(error: unknown): ApiError {
  // If it's already an ApiError, return it
  if (error instanceof ApiError) {
    return error
  }

  // Log unexpected errors
  console.error('Unexpected API error:', error)

  // Return generic internal error for unexpected errors
  return ApiErrors.internalError(error)
}

/**
 * Helper to extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'Unknown error'
}