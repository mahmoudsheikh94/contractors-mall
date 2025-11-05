import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Get query parameters
    const search = searchParams.get('search')
    const latitude = searchParams.get('latitude')
    const longitude = searchParams.get('longitude')
    const maxDistance = searchParams.get('maxDistance') // in km

    // Build query
    let query = supabase
      .from('suppliers')
      .select(`
        *,
        supplier_zone_fees (
          id,
          zone,
          vehicle_class_id,
          base_fee_jod,
          vehicles (
            id,
            name_ar,
            name_en,
            class_code
          )
        )
      `)
      .eq('is_verified', true)
      .order('rating_average', { ascending: false })

    // Apply text search if provided
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,business_name_en.ilike.%${search}%`)
    }

    const { data: suppliers, error } = await query as { data: any[] | null, error: any }

    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch suppliers' },
        { status: 500 }
      )
    }

    // If location provided, calculate distances and filter
    let suppliersWithDistance = suppliers || []

    if (latitude && longitude && suppliers) {
      const userLat = parseFloat(latitude)
      const userLng = parseFloat(longitude)

      suppliersWithDistance = suppliers.map((supplier: any) => {
        // Calculate distance using Haversine formula
        const R = 6371 // Earth's radius in km
        const dLat = (supplier.latitude - userLat) * Math.PI / 180
        const dLon = (supplier.longitude - userLng) * Math.PI / 180
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(userLat * Math.PI / 180) *
          Math.cos(supplier.latitude * Math.PI / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c

        // Determine zone based on supplier's radius settings
        let zone: 'zone_a' | 'zone_b' | 'out_of_range' = 'out_of_range'
        if (distance <= supplier.radius_km_zone_a) {
          zone = 'zone_a'
        } else if (distance <= supplier.radius_km_zone_b) {
          zone = 'zone_b'
        }

        return {
          ...supplier,
          distance,
          delivery_zone: zone,
        }
      })

      // Filter by max distance if provided
      if (maxDistance) {
        const maxDist = parseFloat(maxDistance)
        suppliersWithDistance = suppliersWithDistance.filter(
          (s: any) => s.distance <= maxDist
        )
      }

      // Sort by distance
      suppliersWithDistance.sort((a: any, b: any) => a.distance - b.distance)
    }

    return NextResponse.json({
      suppliers: suppliersWithDistance,
      count: suppliersWithDistance.length,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
