import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { full_name, role, preferred_language } = body

    // Validate required fields
    if (!full_name) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Full name is required' },
        { status: 400 }
      )
    }

    // Validate and prepare profile data
    const validLanguage = ['ar', 'en'].includes(preferred_language) ? preferred_language : 'ar'

    const profileData = {
      id: user.id,
      email: user.email || null,
      phone: user.phone || null,
      full_name,
      role: role || 'contractor',
      preferred_language: validLanguage,  // Ensure valid language value
      is_active: true
    }

    // Use upsert (INSERT ... ON CONFLICT) instead of checking first
    // This avoids RLS SELECT issues and race conditions
    let { data: profile, error } = (await supabase
      .from('profiles')
      .upsert({
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any, {  // Type assertion needed due to Supabase inference limitation
        onConflict: 'id',
        ignoreDuplicates: false  // Update if exists
      })
      .select()
      .single()) as { data: Profile | null, error: any }

    if (error) {
      console.error('Profile operation error:', error)

      // If it's an RLS policy error, try using the upsert function
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        const { data: funcResult, error: funcError } = (await supabase
          .rpc('upsert_profile', {
            user_id: user.id,
            user_email: user.email || null,
            user_phone: user.phone || null,
            user_full_name: full_name,
            user_role: role || 'contractor',
            user_language: validLanguage  // Use validated language value
          } as any)) as { data: any, error: any }

        if (funcError) {
          console.error('Upsert function error:', funcError)
          return NextResponse.json(
            {
              error: 'Profile creation failed',
              details: funcError.message,
              hint: 'Please ensure you have run the latest database migration'
            },
            { status: 500 }
          )
        }

        profile = (Array.isArray(funcResult) ? funcResult[0] : funcResult) as Profile | null
      } else {
        return NextResponse.json(
          {
            error: 'Profile operation failed',
            details: error.message,
            code: error.code
          },
          { status: 500 }
        )
      }
    }

    // Return success with redirect URL based on role
    let redirectUrl = '/dashboard'
    if (profile?.role === 'supplier_admin') {
      redirectUrl = '/supplier/dashboard'
    } else if (profile?.role === 'admin') {
      redirectUrl = '/admin/dashboard'
    }

    return NextResponse.json({
      success: true,
      profile,
      redirectUrl
    })

  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check if profile exists
export async function GET() {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Check if profile exists
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single() as { data: Profile | null, error: any }

    if (error && error.code !== 'PGRST116') {
      console.error('Profile fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      exists: !!profile,
      profile: profile || null,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone
      }
    })

  } catch (error) {
    console.error('Profile check error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}