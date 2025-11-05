import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { VehicleEstimateRequest, VehicleEstimate } from '@/types/vehicle'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Parse request body
    const body: VehicleEstimateRequest = await request.json()
    const { supplierId, deliveryLat, deliveryLng, items } = body

    // Validate required fields
    if (!supplierId || !deliveryLat || !deliveryLng || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: supplierId, deliveryLat, deliveryLng, items' },
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

    // Call the database function
    const { data, error } = await (supabase.rpc as any)('fn_estimate_vehicle', {
      p_supplier_id: supplierId,
      p_delivery_lat: deliveryLat,
      p_delivery_lng: deliveryLng,
      p_items_json: items,
    })

    if (error) {
      console.error('Vehicle estimation error:', error)

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

      if (error.message?.includes('No suitable vehicle found')) {
        return NextResponse.json(
          {
            error: 'No suitable vehicle available for this order',
            details: error.message
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to estimate vehicle', details: error.message },
        { status: 500 }
      )
    }

    // The function returns an array with one row
    const estimate = data?.[0] as VehicleEstimate

    if (!estimate) {
      return NextResponse.json(
        { error: 'No vehicle estimate returned' },
        { status: 500 }
      )
    }

    return NextResponse.json({ estimate })
  } catch (error) {
    console.error('Vehicle estimate API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
