'use client'

import { useState } from 'react'

export default function TestDataPage() {
  const [loading, setLoading] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [ordersResult, setOrdersResult] = useState<any>(null)

  const seedAll = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/seed-all', {
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
        message: 'Failed to seed data',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const seedTestOrders = async () => {
    setOrdersLoading(true)
    setOrdersResult(null)

    try {
      const response = await fetch('/api/seed-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      setOrdersResult(data)
    } catch (error) {
      setOrdersResult({
        success: false,
        message: 'Failed to seed test orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setOrdersLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12" dir="rtl">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">إنشاء بيانات اختبار</h1>
          <p className="text-gray-600 mb-8">
            هذه الصفحة لإنشاء بيانات اختبارية لتطوير وتجربة النظام
          </p>

          <div className="space-y-6">
            {/* Step 1: Seed Everything */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    إنشاء البيانات الأساسية
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    إنشاء الموردين، التصنيفات، والمنتجات (قم بهذه الخطوة أولاً)
                  </p>

                  <button
                    onClick={seedAll}
                    disabled={loading}
                    className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-primary-600 hover:bg-primary-700'
                    }`}
                  >
                    {loading ? 'جاري الإنشاء...' : 'إنشاء الموردين والمنتجات'}
                  </button>
                </div>
              </div>

              {result && (
                <div className={`mt-4 p-4 rounded-lg ${
                  result.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <h4 className={`font-semibold mb-2 ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {result.success ? '✓ نجحت العملية' : '✗ فشلت العملية'}
                  </h4>
                  <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                    {result.message}
                  </p>

                  {result.results && (
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-white p-2 rounded">
                        <div className="text-gray-600">موردين</div>
                        <div className="text-lg font-bold text-green-700">{result.results.suppliers}</div>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <div className="text-gray-600">تصنيفات</div>
                        <div className="text-lg font-bold text-green-700">{result.results.categories}</div>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <div className="text-gray-600">منتجات</div>
                        <div className="text-lg font-bold text-green-700">{result.results.products}</div>
                      </div>
                    </div>
                  )}

                  {result.results?.errors && result.results.errors.length > 0 && (
                    <div className="mt-3">
                      <div className="font-semibold text-red-900 mb-1">أخطاء:</div>
                      <ul className="space-y-1">
                        {result.results.errors.map((err: string, idx: number) => (
                          <li key={idx} className="text-sm text-red-700">• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Seed Orders */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    إنشاء طلبات اختبارية
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    إنشاء طلبات تجريبية بحالات مختلفة (قم بالخطوة 1 أولاً)
                  </p>

                  <button
                    onClick={seedTestOrders}
                    disabled={ordersLoading}
                    className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
                      ordersLoading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {ordersLoading ? 'جاري الإنشاء...' : 'إنشاء طلبات اختبارية'}
                  </button>
                </div>
              </div>

              {ordersResult && (
                <div className={`mt-4 p-4 rounded-lg ${
                  ordersResult.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <h4 className={`font-semibold mb-2 ${
                    ordersResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {ordersResult.success ? '✓ نجحت العملية' : '✗ فشلت العملية'}
                  </h4>
                  <p className={ordersResult.success ? 'text-green-700' : 'text-red-700'}>
                    {ordersResult.message}
                  </p>

                  {ordersResult.orders && ordersResult.orders.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-semibold text-green-900 mb-2">
                        الطلبات المُنشأة:
                      </h5>
                      <ul className="space-y-1">
                        {ordersResult.orders.map((order: any) => (
                          <li key={order.id} className="text-sm text-green-700">
                            • {order.order_number} - {order.status} - {order.total_jod} د.أ
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ordersResult.error && (
                    <pre className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800 overflow-x-auto">
                      {JSON.stringify(ordersResult.error, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
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