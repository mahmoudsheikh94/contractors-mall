'use client'

/**
 * Contractor Profile Page
 * ========================
 * Account management for contractors including:
 * - Personal information
 * - Delivery addresses
 * - Order history summary
 * - Account settings
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@contractors-mall/ui'

interface Profile {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: string | null
}

interface Address {
  id: string
  address_line: string
  city: string
  area: string
  latitude: number | null
  longitude: number | null
  is_default: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form states
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    loadProfile()
    loadAddresses()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setProfile({ ...profileData, email: user.email! })
      setFullName(profileData.full_name || '')
      setPhone(profileData.phone || '')
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAddresses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // @ts-ignore - delivery_addresses table not in generated types
      const { data, error } = await supabase
        // @ts-ignore
        .from('delivery_addresses')
        .select('*')
        .eq('contractor_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setAddresses((data as any) || [])
    } catch (error) {
      console.error('Error loading addresses:', error)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({ ...profile, full_name: fullName, phone })
      setEditMode(false)
      alert('تم حفظ التغييرات بنجاح')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('حدث خطأ أثناء حفظ التغييرات')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">الملف الشخصي</h1>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-blue-600">
                    {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  {profile.full_name || 'مستخدم'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{profile.email}</p>
              </div>

              <nav className="mt-8 space-y-2">
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="w-full text-right px-4 py-2 text-sm font-medium rounded-md bg-blue-50 text-blue-700"
                >
                  📝 معلومات الحساب
                </button>
                <Link href="/orders">
                  <button className="w-full text-right px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-50 text-gray-700">
                    📦 الطلبات
                  </button>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full text-right px-4 py-2 text-sm font-medium rounded-md hover:bg-red-50 text-red-600"
                >
                  🚪 تسجيل الخروج
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">معلومات الحساب</h3>
              </div>
              <div className="px-6 py-6">
                {editMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        الاسم الكامل
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        البريد الإلكتروني
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        لا يمكن تغيير البريد الإلكتروني
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        رقم الهاتف
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+962 7X XXX XXXX"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        variant="primary"
                        disabled={saving}
                      >
                        {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                      </Button>
                      <Button
                        onClick={() => {
                          setEditMode(false)
                          setFullName(profile.full_name || '')
                          setPhone(profile.phone || '')
                        }}
                        variant="outline"
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">الاسم الكامل</label>
                      <p className="mt-1 text-base text-gray-900">{profile.full_name || '-'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500">البريد الإلكتروني</label>
                      <p className="mt-1 text-base text-gray-900">{profile.email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500">رقم الهاتف</label>
                      <p className="mt-1 text-base text-gray-900">{profile.phone || '-'}</p>
                    </div>

                    <div className="pt-4">
                      <Button onClick={() => setEditMode(true)} variant="outline">
                        تعديل المعلومات
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Addresses */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">عناوين التوصيل</h3>
                <Link href="/checkout/address">
                  <Button variant="outline" size="sm">
                    + إضافة عنوان
                  </Button>
                </Link>
              </div>
              <div className="px-6 py-6">
                {addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">
                      لا توجد عناوين توصيل محفوظة
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{address.city}</h4>
                              {address.is_default && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  افتراضي
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{address.area}</p>
                            <p className="mt-1 text-sm text-gray-500">{address.address_line}</p>
                          </div>
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">إحصائيات سريعة</h3>
              </div>
              <div className="px-6 py-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">-</p>
                    <p className="text-sm text-gray-600 mt-1">إجمالي الطلبات</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">-</p>
                    <p className="text-sm text-gray-600 mt-1">الطلبات المكتملة</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/orders">
                    <Button variant="outline" className="w-full">
                      عرض كل الطلبات
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
