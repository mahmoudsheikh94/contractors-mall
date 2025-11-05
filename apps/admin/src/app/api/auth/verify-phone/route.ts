import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, code } = await request.json()

    if (!userId || !code) {
      return NextResponse.json(
        { error: 'User ID and verification code are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Call the Supabase function to verify phone
    const { data, error } = await supabase.rpc('verify_phone_number', {
      p_user_id: userId,
      p_verification_code: code
    })

    if (error) {
      console.error('Error verifying phone:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Check if verification was successful
    if (!data || !data.success) {
      return NextResponse.json(
        { error: data?.error || 'Verification failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: data.message,
      badges: data.badges
    })
  } catch (error: any) {
    console.error('Verify phone error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify phone' },
      { status: 500 }
    )
  }
}
