'use client'

import { useState } from 'react'

export default function TestDataPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const seedTestOrders = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/seed-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to seed test orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12" dir="rtl">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">إنشاء بيانات اختبار</h1>
          <p className="text-gray-600 mb-8">
            هذه الصفحة لإنشاء طلبات اختبارية لتطوير وتجربة النظام
          </p>

          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">تنبيه مهم</h3>
              <p className="text-yellow-700 text-sm">
                تأكد من تشغيل السيد الأساسي (seed-dev.sql) أولاً لإنشاء الموردين والمنتجات المطلوبة
              </p>
            </div>

            <button
              onClick={seedTestOrders}
              disabled={loading}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء طلبات اختبارية'}
            </button>

            {result && (
              <div className={`mt-6 p-4 rounded-lg ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <h3 className={`font-semibold mb-2 ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {result.success ? '✓ نجحت العملية' : '✗ فشلت العملية'}
                </h3>
                <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                  {result.message}
                </p>

                {result.orders && result.orders.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-green-900 mb-2">
                      الطلبات المُنشأة:
                    </h4>
                    <ul className="space-y-1">
                      {result.orders.map((order: any) => (
                        <li key={order.id} className="text-sm text-green-700">
                          • {order.order_number} - {order.status} - {order.total_jod} د.أ
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.error && (
                  <pre className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800 overflow-x-auto">
                    {JSON.stringify(result.error, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>

          <div className="mt-12 pt-8 border-t">
            <h2 className="text-xl font-bold text-gray-900 mb-4">بيانات الحسابات الاختبارية</h2>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">حسابات المقاولين</h3>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>• سامر المقاول: contractor1@test.jo</li>
                  <li>• عمر البناء: contractor2@test.jo</li>
                  <li>• ياسر الإنشاءات: contractor3@test.jo</li>
                </ul>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">أنواع الطلبات المُنشأة</h3>
                <ul className="space-y-1 text-sm text-purple-700">
                  <li>• طلب معلق (pending) - في انتظار قبول المورد</li>
                  <li>• طلب مؤكد (confirmed) - تم قبوله من المورد</li>
                  <li>• طلب قيد التوصيل (on_the_way) - في الطريق</li>
                  <li>• طلب مُسلّم (delivered) - تم التسليم، في انتظار التأكيد</li>
                  <li>• طلب مكتمل (completed) - تم التسليم والدفع</li>
                  <li>• طلب متنازع عليه (disputed) - يوجد مشكلة</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <a
              href="/orders"
              className="flex-1 text-center py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              عرض طلبات المقاول
            </a>
            <a
              href="/supplier/orders"
              target="_blank"
              className="flex-1 text-center py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              عرض طلبات المورد (Admin)
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}