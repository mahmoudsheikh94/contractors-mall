'use client'

/**
 * MapView Component
 * ==================
 * Interactive Mapbox map showing suppliers with zone overlays
 * Features:
 * - Supplier markers with custom icons
 * - Zone A/B radius circles
 * - User location marker
 * - Click popups with supplier details
 * - RTL-aware and bilingual
 */

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  MAPBOX_ACCESS_TOKEN,
  isMapboxConfigured,
  MAPBOX_DEFAULTS,
  MAPBOX_ERRORS,
  ZONE_COLORS
} from '@/lib/mapbox-config'

// Set Mapbox access token
if (typeof window !== 'undefined' && isMapboxConfigured()) {
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
}

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
}

interface MapViewProps {
  suppliers: Supplier[]
  userLocation?: { lat: number; lng: number }
  onSupplierClick?: (supplier: Supplier) => void
}

export function MapView({ suppliers, userLocation, onSupplierClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if Mapbox is configured
  useEffect(() => {
    if (!isMapboxConfigured()) {
      setError(MAPBOX_ERRORS.missingToken.ar)
      console.error('Mapbox token is not configured. Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your environment variables.');
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !isMapboxConfigured()) return

    try {
      const center: [number, number] = userLocation
        ? [userLocation.lng, userLocation.lat]
        : MAPBOX_DEFAULTS.defaultCenter

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAPBOX_DEFAULTS.style,
        center: center,
        zoom: userLocation ? MAPBOX_DEFAULTS.userLocationZoom : MAPBOX_DEFAULTS.defaultZoom,
        attributionControl: false,
      })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-left')

    // Add geolocation control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-left'
    )

    map.current.on('load', () => {
      setMapLoaded(true)
      console.log('✅ Mapbox map loaded successfully')
    })

    map.current.on('error', (e) => {
      console.error('❌ Mapbox error:', e)
      setError(MAPBOX_ERRORS.loadFailed.ar)
    })
    } catch (err) {
      console.error('Failed to initialize map:', err)
      setError(MAPBOX_ERRORS.loadFailed.ar)
    }

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Add user location marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !userLocation) return

    // Create user location marker
    const el = document.createElement('div')
    el.className = 'user-location-marker'
    el.style.width = '20px'
    el.style.height = '20px'
    el.style.borderRadius = '50%'
    el.style.backgroundColor = '#3B82F6'
    el.style.border = '3px solid white'
    el.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)'

    const marker = new mapboxgl.Marker(el)
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          '<div class="text-center p-2"><strong>📍 موقعك</strong></div>'
        )
      )
      .addTo(map.current)

    return () => {
      marker.remove()
    }
  }, [mapLoaded, userLocation])

  // Add supplier markers and zones
  useEffect(() => {
    if (!map.current || !mapLoaded || !suppliers.length) return

    const markers: mapboxgl.Marker[] = []

    suppliers.forEach((supplier) => {
      if (!supplier.latitude || !supplier.longitude) return

      // Create custom marker element
      const el = document.createElement('div')
      el.className = 'supplier-marker'
      el.innerHTML = `
        <div style="
          background: ${supplier.delivery_zone === 'zone_a' ? '#10B981' : supplier.delivery_zone === 'zone_b' ? '#F59E0B' : '#6B7280'};
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: transform 0.2s;
        ">
          🏪
        </div>
      `

      // Hover effect
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)'
      })
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)'
      })

      // Create popup content
      const popupContent = `
        <div class="p-3 min-w-[250px]" dir="rtl">
          <h3 class="font-bold text-lg mb-2">${supplier.business_name}</h3>
          <p class="text-sm text-gray-600 mb-2">${supplier.address}</p>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-yellow-500">⭐</span>
            <span class="font-semibold">${supplier.rating_average.toFixed(1)}</span>
            <span class="text-gray-500 text-sm">(${supplier.rating_count} تقييم)</span>
          </div>
          ${supplier.distance ? `
            <div class="text-sm text-gray-600 mb-2">
              📏 ${supplier.distance.toFixed(1)} كم
            </div>
          ` : ''}
          <div class="mt-2">
            ${supplier.delivery_zone === 'zone_a' ? '<span class="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">منطقة أ - توصيل مخفض</span>' :
              supplier.delivery_zone === 'zone_b' ? '<span class="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">منطقة ب - توصيل عادي</span>' :
              '<span class="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">خارج نطاق التوصيل</span>'}
          </div>
          <a
            href="/suppliers/${supplier.id}"
            class="mt-3 block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
          >
            عرض المنتجات
          </a>
        </div>
      `

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
      }).setHTML(popupContent)

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([supplier.longitude, supplier.latitude])
        .setPopup(popup)
        .addTo(map.current!)

      // Handle click
      el.addEventListener('click', () => {
        if (onSupplierClick) {
          onSupplierClick(supplier)
        }
      })

      markers.push(marker)

      // Add zone circles
      if (map.current) {
        const sourceIdA = `zone-a-${supplier.id}`
        const sourceIdB = `zone-b-${supplier.id}`

        // Zone A (inner circle)
        if (!map.current.getSource(sourceIdA)) {
          map.current.addSource(sourceIdA, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [supplier.longitude, supplier.latitude],
              },
              properties: {},
            },
          })

          map.current.addLayer({
            id: `${sourceIdA}-layer`,
            type: 'circle',
            source: sourceIdA,
            paint: {
              'circle-radius': {
                stops: [
                  [0, 0],
                  [20, metersToPixelsAtMaxZoom(supplier.radius_km_zone_a * 1000, supplier.latitude)],
                ],
                base: 2,
              },
              'circle-color': ZONE_COLORS.zoneA.fill,
              'circle-opacity': ZONE_COLORS.zoneA.fillOpacity,
              'circle-stroke-width': 2,
              'circle-stroke-color': ZONE_COLORS.zoneA.stroke,
              'circle-stroke-opacity': ZONE_COLORS.zoneA.strokeOpacity,
            },
          })
        }

        // Zone B (outer circle)
        if (!map.current.getSource(sourceIdB)) {
          map.current.addSource(sourceIdB, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [supplier.longitude, supplier.latitude],
              },
              properties: {},
            },
          })

          map.current.addLayer({
            id: `${sourceIdB}-layer`,
            type: 'circle',
            source: sourceIdB,
            paint: {
              'circle-radius': {
                stops: [
                  [0, 0],
                  [20, metersToPixelsAtMaxZoom(supplier.radius_km_zone_b * 1000, supplier.latitude)],
                ],
                base: 2,
              },
              'circle-color': ZONE_COLORS.zoneB.fill,
              'circle-opacity': ZONE_COLORS.zoneB.fillOpacity,
              'circle-stroke-width': 2,
              'circle-stroke-color': ZONE_COLORS.zoneB.stroke,
              'circle-stroke-opacity': ZONE_COLORS.zoneB.strokeOpacity,
            },
          })
        }
      }
    })

    // Fit bounds to show all suppliers
    if (suppliers.length > 0 && map.current) {
      const bounds = new mapboxgl.LngLatBounds()

      suppliers.forEach((supplier) => {
        if (supplier.latitude && supplier.longitude) {
          bounds.extend([supplier.longitude, supplier.latitude])
        }
      })

      if (userLocation) {
        bounds.extend([userLocation.lng, userLocation.lat])
      }

      map.current.fitBounds(bounds, {
        padding: 100,
        maxZoom: 14,
      })
    }

    return () => {
      markers.forEach((marker) => marker.remove())

      // Remove layers and sources
      suppliers.forEach((supplier) => {
        if (map.current) {
          const layerIdA = `zone-a-${supplier.id}-layer`
          const layerIdB = `zone-b-${supplier.id}-layer`
          const sourceIdA = `zone-a-${supplier.id}`
          const sourceIdB = `zone-b-${supplier.id}`

          if (map.current.getLayer(layerIdA)) {
            map.current.removeLayer(layerIdA)
          }
          if (map.current.getLayer(layerIdB)) {
            map.current.removeLayer(layerIdB)
          }
          if (map.current.getSource(sourceIdA)) {
            map.current.removeSource(sourceIdA)
          }
          if (map.current.getSource(sourceIdB)) {
            map.current.removeSource(sourceIdB)
          }
        }
      })
    }
  }, [mapLoaded, suppliers, userLocation, onSupplierClick])

  // Show error message if map can't load
  if (error) {
    return (
      <div className="relative w-full h-full min-h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <svg
            className="mx-auto h-16 w-16 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="text-lg font-medium text-gray-900 mb-2">{error}</p>
          <p className="text-sm text-gray-500">
            يمكنك الاستمرار في تصفح الموردين من القائمة
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full min-h-[600px]">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />

      {/* Loading indicator */}
      {!mapLoaded && !error && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            <p className="mt-2 text-sm text-gray-600">جاري تحميل الخريطة...</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10" dir="rtl">
        <h4 className="font-semibold mb-3 text-sm">دليل الخريطة</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
            <span>منطقة أ - توصيل مخفض</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white"></div>
            <span>منطقة ب - توصيل عادي</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-500 border-2 border-white"></div>
            <span>خارج نطاق التوصيل</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
            <span>موقعك</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to convert meters to pixels at max zoom
function metersToPixelsAtMaxZoom(meters: number, latitude: number): number {
  return meters / 0.075 / Math.cos((latitude * Math.PI) / 180)
}
