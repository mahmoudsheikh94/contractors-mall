'use client'

interface CategoryPreference {
  category_name: string
  order_count: number
  total_spent: number
  percentage_of_orders: number
}

interface CategoryPreferencesProps {
  preferences: CategoryPreference[]
}

export function CategoryPreferences({ preferences }: CategoryPreferencesProps) {
  const topCategories = preferences.slice(0, 5)
  const maxSpent = Math.max(...topCategories.map(c => c.total_spent))

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">التفضيلات حسب الفئة</h3>

      {topCategories.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-4xl">📊</span>
          <p className="mt-2 text-gray-600 text-sm">لا توجد بيانات كافية</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topCategories.map((category, index) => (
            <div key={category.category_name}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📦'}</span>
                  <span className="font-medium text-gray-900">{category.category_name}</span>
                </div>
                <span className="text-sm text-gray-600">
                  {category.order_count} {category.order_count === 1 ? 'طلب' : 'طلبات'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${(category.total_spent / maxSpent) * 100}%`,
                      backgroundColor:
                        index === 0
                          ? '#10B981'
                          : index === 1
                          ? '#3B82F6'
                          : index === 2
                          ? '#F59E0B'
                          : '#6B7280'
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-600">
                    {category.total_spent.toFixed(0)} د.أ
                  </span>
                  <span className="text-xs text-gray-600">
                    {category.percentage_of_orders.toFixed(0)}% من الطلبات
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {preferences.length > 5 && (
        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-xs text-gray-500">
            يعرض أعلى 5 فئات من أصل {preferences.length} فئة
          </p>
        </div>
      )}
    </div>
  )
}
