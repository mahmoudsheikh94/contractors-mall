import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApiErrors, ApiError, ErrorCodes, handleApiError } from '@contractors-mall/shared'
import { z } from 'zod'

/**
 * Zod validation schema for delivery fee estimation
 */
const DeliveryFeeRequestSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID format'),
  deliveryLat: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  deliveryLng: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
})

interface DeliveryFeeEstimate {
  zone: 'zone_a' | 'zone_b'
  delivery_fee_jod: number
  distance_km: number
}

/**
 * POST /api/vehicle-estimate
 *
 * Calculate delivery fee based on supplier location and delivery coordinates.
 * Uses database function fn_calculate_delivery_fee for zone-based pricing.
 *
 * Request body:
 * {
 *   supplierId: string (UUID)
 *   deliveryLat: number (-90 to 90)
 *   deliveryLng: number (-180 to 180)
 * }
 *
 * Response:
 * {
 *   estimate: {
 *     zone: 'zone_a' | 'zone_b'
 *     delivery_fee_jod: number
 *     distance_km: number
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Parse and validate request body
    const rawBody = await request.json()
    const validationResult = DeliveryFeeRequestSchema.safeParse(rawBody)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      const error = ApiErrors.validationError(
        firstError.path.join('.'),
        firstError.message
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    const { supplierId, deliveryLat, deliveryLng } = validationResult.data

    // Call the database function for delivery fee calculation
    const { data, error } = await supabase.rpc('fn_calculate_delivery_fee', {
      p_supplier_id: supplierId,
      p_delivery_lat: deliveryLat,
      p_delivery_lng: deliveryLng,
    })

    if (error) {
      console.error('Delivery fee calculation error:', error)

      // Check for specific error messages from the database function
      if (error.message?.includes('outside service area')) {
        const apiError = new ApiError(
          ErrorCodes.BUSINESS_RULE_VIOLATION,
          'Delivery location is outside the supplier service area',
          422,
          {
            messageAr: 'موقع التوصيل خارج منطقة خدمة المورد',
            details: { error: error.message }
          }
        )
        return NextResponse.json(apiError.toResponseObject(), { status: apiError.status })
      }

      if (error.message?.includes('not configured')) {
        const apiError = new ApiError(
          ErrorCodes.BUSINESS_RULE_VIOLATION,
          'Supplier has not configured delivery fees for this zone',
          422,
          {
            messageAr: 'لم يقم المورد بتكوين رسوم التوصيل لهذه المنطقة',
            details: { error: error.message }
          }
        )
        return NextResponse.json(apiError.toResponseObject(), { status: apiError.status })
      }

      if (error.message?.includes('not found or not verified')) {
        const apiError = new ApiError(
          ErrorCodes.NOT_FOUND,
          'Supplier not found or not verified',
          404,
          {
            messageAr: 'المورد غير موجود أو غير موثق',
            details: { resource: 'Supplier', id: supplierId, error: error.message }
          }
        )
        return NextResponse.json(apiError.toResponseObject(), { status: apiError.status })
      }

      // Generic database error
      const apiError = ApiErrors.databaseError('calculate delivery fee', error)
      return NextResponse.json(apiError.toResponseObject(), { status: apiError.status })
    }

    // The function returns an array with one row
    const estimate = data?.[0] as DeliveryFeeEstimate

    if (!estimate) {
      const error = new ApiError(
        ErrorCodes.INTERNAL_ERROR,
        'No delivery fee estimate returned from database',
        500,
        {
          messageAr: 'لم يتم إرجاع تقدير رسوم التوصيل'
        }
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    // Validate estimate structure
    if (!estimate.zone || typeof estimate.delivery_fee_jod !== 'number' || typeof estimate.distance_km !== 'number') {
      const error = new ApiError(
        ErrorCodes.INTERNAL_ERROR,
        'Invalid delivery fee estimate format',
        500,
        {
          messageAr: 'تنسيق تقدير رسوم التوصيل غير صالح',
          details: { estimate }
        }
      )
      return NextResponse.json(error.toResponseObject(), { status: error.status })
    }

    return NextResponse.json({
      estimate: {
        zone: estimate.zone,
        delivery_fee_jod: estimate.delivery_fee_jod,
        distance_km: estimate.distance_km,
      }
    })
  } catch (error) {
    console.error('Delivery fee API error:', error)
    const apiError = handleApiError(error)
    return NextResponse.json(apiError.toResponseObject(), { status: apiError.status })
  }
}
