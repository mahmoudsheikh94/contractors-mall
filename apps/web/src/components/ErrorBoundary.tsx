'use client';

import React, { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry with additional context
    Sentry.withScope((scope) => {
      scope.setContext('errorBoundary', {
        context: this.props.context || 'unknown',
        componentStack: errorInfo.componentStack,
      });
      Sentry.captureException(error);
    });

    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-4 flex items-center justify-center">
              <svg
                className="h-12 w-12 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
              حدث خطأ ما
            </h2>
            <p className="mb-6 text-center text-gray-600">
              عذراً، حدث خطأ غير متوقع. تم تسجيل المشكلة وسنعمل على إصلاحها.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
            >
              إعادة تحميل الصفحة
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Technical Details (Dev Only)
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specific error boundaries for different sections

export function CheckoutErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      context="checkout"
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md rounded-lg bg-white p-8 shadow-lg">
            <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
              خطأ في عملية الشراء
            </h2>
            <p className="mb-6 text-center text-gray-600">
              حدث خطأ أثناء معالجة طلبك. الرجاء المحاولة مرة أخرى أو الاتصال بالدعم.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
            >
              العودة إلى الصفحة الرئيسية
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function PaymentErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      context="payment"
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md rounded-lg bg-white p-8 shadow-lg">
            <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
              خطأ في عملية الدفع
            </h2>
            <p className="mb-6 text-center text-gray-600">
              حدث خطأ أثناء معالجة الدفع. لم يتم خصم أي مبلغ. الرجاء المحاولة مرة أخرى.
            </p>
            <button
              onClick={() => window.location.href = '/checkout'}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
