import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Simplified request/response types (no longer need items for delivery fee calculation)
interface DeliveryFeeRequest {
  supplierId: string
  deliveryLat: number
  deliveryLng: number
}

interface DeliveryFeeEstimate {
  zone: 'zone_a' | 'zone_b'
  delivery_fee_jod: number
  distance_km: number
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Parse request body
    const body: DeliveryFeeRequest = await request.json()
    const { supplierId, deliveryLat, deliveryLng } = body

    // Validate required fields
    if (!supplierId || !deliveryLat || !deliveryLng) {
      return NextResponse.json(
        { error: 'Missing required fields: supplierId, deliveryLat, deliveryLng' },
        { status: 400 }
      )
    }

    // Validate coordinates
    if (deliveryLat < -90 || deliveryLat > 90 || deliveryLng < -180 || deliveryLng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    // Call the simplified database function
    const { data, error } = await (supabase.rpc as any)('fn_calculate_delivery_fee', {
      p_supplier_id: supplierId,
      p_delivery_lat: deliveryLat,
      p_delivery_lng: deliveryLng,
    })

    if (error) {
      console.error('Delivery fee calculation error:', error)

      // Check for specific error messages
      if (error.message?.includes('outside service area')) {
        return NextResponse.json(
          {
            error: 'Delivery location is outside the supplier service area',
            details: error.message
          },
          { status: 400 }
        )
      }

      if (error.message?.includes('not configured')) {
        return NextResponse.json(
          {
            error: 'Supplier has not configured delivery fees for this zone',
            details: error.message
          },
          { status: 400 }
        )
      }

      if (error.message?.includes('not found or not verified')) {
        return NextResponse.json(
          {
            error: 'Supplier not found or not verified',
            details: error.message
          },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to calculate delivery fee', details: error.message },
        { status: 500 }
      )
    }

    // The function returns an array with one row
    const estimate = data?.[0] as DeliveryFeeEstimate

    if (!estimate) {
      return NextResponse.json(
        { error: 'No delivery fee estimate returned' },
        { status: 500 }
      )
    }

    return NextResponse.json({ estimate })
  } catch (error) {
    console.error('Delivery fee API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
