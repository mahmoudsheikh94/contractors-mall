'use client'

import Link from 'next/link'
import { Button } from '@contractors-mall/ui'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white" dir="rtl">
      {/* Hero Section */}
      <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24">
        <div className="text-center max-w-4xl">
          {/* Logo/Title */}
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 text-gray-900">
            مول المقاول
          </h1>

          {/* Tagline */}
          <p className="text-2xl sm:text-3xl text-gray-700 mb-4 font-medium">
            كل موادك في كبسة واحدة
          </p>

          {/* Description */}
          <p className="text-lg sm:text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            منصة رقمية تربط المقاولين بموردي مواد البناء في الأردن.
            <br />
            توصيل سريع، أسعار شفافة، وجودة مضمونة.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/auth/register">
              <Button variant="primary" size="lg" className="w-full sm:w-auto min-w-[200px]">
                إنشاء حساب جديد
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto min-w-[200px]">
                تسجيل الدخول
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-primary-600 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">توصيل سريع</h3>
              <p className="text-gray-600">
                توصيل في نفس اليوم أو اليوم التالي مع تحديد موعد التسليم
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-primary-600 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">دفع آمن</h3>
              <p className="text-gray-600">
                نظام ضمان الدفع - يتم تحويل المبلغ بعد تأكيد الاستلام
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-primary-600 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">جودة مضمونة</h3>
              <p className="text-gray-600">
                موردين موثوقين ومعتمدين مع نظام تقييم شفاف
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}