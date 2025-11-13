'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@contractors-mall/ui'
import { CartButton } from '@/components/CartButton'
import { MapView } from '@/components/MapView'

interface Supplier {
  id: string
  business_name: string
  business_name_en: string
  phone: string
  address: string
  latitude: number
  longitude: number
  rating_average: number
  rating_count: number
  distance?: number
  delivery_zone?: 'zone_a' | 'zone_b' | 'out_of_range'
  radius_km_zone_a: number
  radius_km_zone_b: number
  supplier_zone_fees: Array<{
    zone: string
    base_fee_jod: number
    vehicles: {
      name_ar: string
      class_code: string
    }
  }>
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  useEffect(() => {
    // Request user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          console.log('📍 Browser Location:', { lat, lng });
          setUserLocation({ lat, lng });
        },
        (error) => {
          console.error('Error getting location:', error)
          // Continue without location
          fetchSuppliers()
        }
      )
    } else {
      fetchSuppliers()
    }
  }, [])

  useEffect(() => {
    if (userLocation) {
      fetchSuppliers()
    }
  }, [userLocation])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      if (userLocation) {
        params.append('latitude', userLocation.lat.toString())
        params.append('longitude', userLocation.lng.toString())
      }

      const response = await fetch(`/api/suppliers?${params.toString()}`)
      const data = await response.json()

      if (data.suppliers) {
        setSuppliers(data.suppliers)
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchSuppliers()
  }

  const getZoneBadge = (zone?: string) => {
    if (!zone) return null

    switch (zone) {
      case 'zone_a':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            منطقة أ (توصيل قريب)
          </span>
        )
      case 'zone_b':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            منطقة ب (توصيل متوسط)
          </span>
        )
      case 'out_of_range':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            خارج نطاق التوصيل
          </span>
        )
    }
  }

  const getDeliveryFees = (supplier: Supplier) => {
    const zone = supplier.delivery_zone || 'zone_a'
    const fees = supplier.supplier_zone_fees?.filter((fee: any) => fee.zone === zone)

    if (!fees || fees.length === 0) return null

    return (
      <div className="mt-2 text-sm text-gray-600">
        <p className="font-medium mb-1">رسوم التوصيل:</p>
        <ul className="space-y-1">
          {fees.map((fee: any, index: number) => (
            <li key={index} className="flex justify-between">
              <span>{fee.vehicles?.name_ar || 'مركبة'}</span>
              <span className="font-medium">{fee.base_fee_jod.toFixed(2)} دينار</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">الموردين</h1>
            <div className="flex gap-2 items-center">
              <CartButton />
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  العودة للرئيسية
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar and View Toggle */}
          <div className="mt-4 flex gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن مورد..."
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <Button type="submit" variant="primary">
                بحث
              </Button>
            </form>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  قائمة
                </span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'map'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  خريطة
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-gray-600">جاري التحميل...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12">
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              لا يوجد موردين
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              لم يتم العثور على موردين متاحين
            </p>
          </div>
        ) : viewMode === 'map' ? (
          /* Map View */
          <div className="h-[calc(100vh-200px)] min-h-[600px] w-full">
            <MapView
              suppliers={suppliers}
              userLocation={userLocation || undefined}
              onSupplierClick={(supplier) => {
                window.location.href = `/products?supplierId=${supplier.id}`
              }}
            />
          </div>
        ) : (
          /* List View */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {supplier.business_name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {supplier.business_name_en}
                      </p>
                    </div>
                    {supplier.rating_average > 0 && (
                      <div className="flex items-center mr-4">
                        <svg
                          className="h-5 w-5 text-yellow-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="mr-1 text-sm font-medium text-gray-900">
                          {supplier.rating_average.toFixed(1)}
                        </span>
                        <span className="mr-1 text-sm text-gray-500">
                          ({supplier.rating_count})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div className="mt-4 flex items-start text-sm text-gray-600">
                    <svg
                      className="ml-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
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
                    <span className="flex-1">{supplier.address}</span>
                  </div>

                  {/* Distance & Zone */}
                  {supplier.distance !== undefined && (
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">المسافة:</span>{' '}
                        {supplier.distance.toFixed(1)} كم
                      </div>
                      {getZoneBadge(supplier.delivery_zone)}
                    </div>
                  )}

                  {/* Delivery Fees */}
                  {getDeliveryFees(supplier)}

                  {/* Actions */}
                  <div className="mt-6">
                    <Link href={`/products?supplierId=${supplier.id}`}>
                      <Button variant="primary" className="w-full">
                        عرض المنتجات
                      </Button>
                    </Link>
                  </div>

                  {/* Contact */}
                  <div className="mt-3 flex items-center justify-center text-sm text-gray-500">
                    <svg
                      className="ml-1.5 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <span>{supplier.phone}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
