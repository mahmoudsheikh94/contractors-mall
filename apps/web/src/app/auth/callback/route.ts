import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email/resend'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
  }

  try {
    const supabase = await createClient()

    // Exchange code for session
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

    if (sessionError) {
      console.error('Session exchange error:', sessionError)
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(sessionError.message)}`
      )
    }

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('User fetch error:', userError)
      return NextResponse.redirect(`${origin}/auth/login?error=user_not_found`)
    }

    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single() as { data: any | null, error: any }

    // If profile fetch fails (not found is ok), check the error
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError)
    }

    if (!profile) {
      // No profile exists, try to create a basic one using upsert
      // This avoids duplicate key errors and RLS issues
      const { data: newProfile, error: createError } = await (supabase
        .from('profiles')
        .upsert as any)({
          id: user.id,
          email: user.email || null,
          phone: user.phone || null,
          full_name: user.user_metadata?.full_name || '',
          role: user.user_metadata?.role || 'contractor',
          preferred_language: user.user_metadata?.preferred_language || 'ar',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (createError) {
        // If it's an RLS error, try the RPC function
        if (createError.code === '42501' || createError.message?.includes('row-level security')) {
          const { data: rpcProfile, error: rpcError } = await (supabase
            .rpc as any)('upsert_profile', {
              user_id: user.id,
              user_email: user.email || null,
              user_phone: user.phone || null,
              user_full_name: user.user_metadata?.full_name || '',
              user_role: user.user_metadata?.role || 'contractor',
              user_language: user.user_metadata?.preferred_language || 'ar'
            })

          if (!rpcError && rpcProfile) {
            // RPC succeeded, get the profile data
            const profile = Array.isArray(rpcProfile) ? rpcProfile[0] : rpcProfile

            // Send welcome email for new profile
            sendWelcomeEmail(
              user.email || '',
              profile.full_name || 'مستخدم جديد'
            ).catch(err => {
              console.error('Failed to send welcome email:', err)
            })

            return redirectBasedOnRole(profile.role, origin)
          }
        }

        // Profile creation failed, redirect to complete-profile
        console.log('Profile auto-creation failed, redirecting to complete-profile:', createError.message)
        return NextResponse.redirect(`${origin}/auth/complete-profile`)
      }

      // Profile created successfully
      if (newProfile) {
        // Send welcome email (non-blocking) - only for new profiles
        sendWelcomeEmail(
          user.email || '',
          newProfile.full_name || 'مستخدم جديد'
        ).catch(err => {
          console.error('Failed to send welcome email:', err)
        })

        return redirectBasedOnRole(newProfile.role, origin)
      }
    } else {
      // Profile exists - this is a returning user
      // Check if this is their first callback after email verification
      // by checking if they just confirmed their email (type=signup in query params)
      const type = requestUrl.searchParams.get('type')

      if (type === 'signup' || type === 'email') {
        // This is the first callback after email verification
        sendWelcomeEmail(
          user.email || '',
          profile.full_name || 'مستخدم'
        ).catch(err => {
          console.error('Failed to send welcome email:', err)
        })
      }

      // Profile exists, redirect based on role
      return redirectBasedOnRole(profile.role, origin)
    }

    // Fallback to complete profile
    return NextResponse.redirect(`${origin}/auth/complete-profile`)

  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`)
  }
}

// Helper function to redirect based on user role
function redirectBasedOnRole(role: string | null, origin: string): NextResponse {
  switch (role) {
    case 'supplier_admin':
      return NextResponse.redirect(`${origin}/supplier/dashboard`)
    case 'admin':
      return NextResponse.redirect(`${origin}/admin/dashboard`)
    case 'contractor':
    default:
      return NextResponse.redirect(`${origin}/dashboard`)
  }
}