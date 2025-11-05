'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type SignupMethod = 'email' | 'phone'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [signupMethod, setSignupMethod] = useState<SignupMethod>('email')
  const [formData, setFormData] = useState({
    // Owner Info
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',

    // Business Info
    businessName: '',
    businessNameEn: '',
    licenseNumber: '',
    taxNumber: '',

    // Address
    city: '',
    district: '',
    street: '',
    building: '',

    // Zones
    zoneARadius: '10',
    zoneBRadius: '20',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        setError('كلمات المرور غير متطابقة')
        setLoading(false)
        return
      }

      // Validate password length
      if (formData.password.length < 8) {
        setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
        setLoading(false)
        return
      }

      // Validate phone for phone signup
      if (signupMethod === 'phone' && !formData.phone) {
        setError('رقم الهاتف مطلوب')
        setLoading(false)
        return
      }

      const supabase = createClient()

      // Determine email to use
      let emailToUse = formData.email
      if (signupMethod === 'phone') {
        // Generate temp email from phone number
        const phoneDigits = formData.phone.replace(/\D/g, '')
        emailToUse = `${phoneDigits}@contractors-mall.local`
      }

      // 1. Create user account
      // Profile will be auto-created by database trigger
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailToUse,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            role: 'supplier_admin', // Trigger will use this to set role
            signup_method: signupMethod,
          }
        }
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('فشل إنشاء الحساب')
        setLoading(false)
        return
      }

      // Note: Profile is automatically created by database trigger
      // We just need to create the supplier record

      // 2. Create supplier record
      // Combine address fields into single address string
      const addressParts = [
        formData.building,
        formData.street,
        formData.district,
        formData.city
      ].filter(Boolean) // Remove empty values
      const fullAddress = addressParts.join(', ')

      const { error: supplierError } = await supabase
        .from('suppliers')
        .insert({
          owner_id: authData.user.id,
          business_name: formData.businessName,
          business_name_en: formData.businessNameEn || formData.businessName,
          phone: formData.phone,
          email: formData.email,
          // Business details
          license_number: formData.licenseNumber,
          tax_number: formData.taxNumber || null,
          // Combined address for display
          address: fullAddress,
          // Detailed address fields for filtering/searching
          city: formData.city,
          district: formData.district,
          street: formData.street,
          building: formData.building || null,
          // Default location to Amman center (user can update later via profile settings)
          latitude: 31.9539,
          longitude: 35.9106,
          // Delivery zones
          radius_km_zone_a: parseFloat(formData.zoneARadius),
          radius_km_zone_b: parseFloat(formData.zoneBRadius),
          is_verified: false, // Admin must verify
        })

      if (supplierError) {
        console.error('Supplier creation error:', supplierError)
        setError('فشل إنشاء بيانات المورّد')
        setLoading(false)
        return
      }

      // Success - redirect to login with message
      router.push('/auth/login?registered=true')
    } catch (err) {
      console.error('Registration error:', err)
      setError('حدث خطأ غير متوقع')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            تسجيل مورّد جديد
          </h1>
          <p className="text-gray-600">
            انضم إلى منصة المقاول مول وابدأ بيع مواد البناء
          </p>
        </div>

        {/* Signup Method Toggle */}
        <div className="mb-6">
          <div className="flex gap-3 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSignupMethod('email')}
              className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                signupMethod === 'email'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-2xl mr-2">📧</span>
              البريد الإلكتروني
            </button>
            <button
              type="button"
              onClick={() => setSignupMethod('phone')}
              className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                signupMethod === 'phone'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-2xl mr-2">📱</span>
              رقم الهاتف
            </button>
          </div>
          {signupMethod === 'phone' && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                ✨ <strong>مكافأة:</strong> التسجيل بالهاتف + التحقق = شارتي التحقق (البريد والهاتف) معاً!
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-center">{error}</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Owner Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
              معلومات المالك
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="أحمد محمد"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الهاتف *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="07xxxxxxxx"
                />
              </div>

              {signupMethod === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="email@example.com"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="8 أحرف على الأقل"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تأكيد كلمة المرور *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="أعد إدخال كلمة المرور"
                />
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
              معلومات النشاط التجاري
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم النشاط (عربي) *
                </label>
                <input
                  type="text"
                  name="businessName"
                  required
                  value={formData.businessName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="مؤسسة البناء الحديث"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم النشاط (إنجليزي)
                </label>
                <input
                  type="text"
                  name="businessNameEn"
                  value={formData.businessNameEn}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Modern Construction Est."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الترخيص *
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  required
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الرقم الضريبي
                </label>
                <input
                  type="text"
                  name="taxNumber"
                  value={formData.taxNumber}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="987654321"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
              عنوان المنشأة
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المدينة *
                </label>
                <select
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">اختر المدينة</option>
                  <option value="Amman">عمّان</option>
                  <option value="Zarqa">الزرقاء</option>
                  <option value="Irbid">إربد</option>
                  <option value="Aqaba">العقبة</option>
                  <option value="Madaba">مادبا</option>
                  <option value="Jerash">جرش</option>
                  <option value="Ajloun">عجلون</option>
                  <option value="Karak">الكرك</option>
                  <option value="Tafilah">الطفيلة</option>
                  <option value="Maan">معان</option>
                  <option value="Balqa">البلقاء</option>
                  <option value="Mafraq">المفرق</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المنطقة / الحي *
                </label>
                <input
                  type="text"
                  name="district"
                  required
                  value={formData.district}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="الجبيهة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الشارع *
                </label>
                <input
                  type="text"
                  name="street"
                  required
                  value={formData.street}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="شارع الملك عبدالله الثاني"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم المبنى
                </label>
                <input
                  type="text"
                  name="building"
                  value={formData.building}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="مبنى 25"
                />
              </div>
            </div>
          </div>

          {/* Delivery Zones */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
              مناطق التوصيل
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نطاق المنطقة A (كم) *
                </label>
                <input
                  type="number"
                  name="zoneARadius"
                  required
                  min="1"
                  max="50"
                  value={formData.zoneARadius}
                  onChange={handleChange}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  المنطقة القريبة (عادة 10 كم)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نطاق المنطقة B (كم) *
                </label>
                <input
                  type="number"
                  name="zoneBRadius"
                  required
                  min="1"
                  max="100"
                  value={formData.zoneBRadius}
                  onChange={handleChange}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  المنطقة البعيدة (عادة 20 كم)
                </p>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              بالتسجيل، أنت توافق على الشروط والأحكام الخاصة بمنصة المقاول مول.
              سيتم مراجعة طلبك والموافقة عليه من قبل الإدارة قبل تفعيل الحساب.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 text-lg"
          >
            {loading ? 'جاري التسجيل...' : 'تسجيل الحساب'}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            لديك حساب بالفعل؟{' '}
            <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-semibold">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
