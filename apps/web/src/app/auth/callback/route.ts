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

    // Profile should already exist from database trigger
    // Just fetch it and redirect based on role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single() as { data: any | null, error: any }

    if (profileError || !profile) {
      console.error('Profile not found after auth callback:', profileError)
      // Profile should have been created by trigger
      // If not found, redirect to complete profile as fallback
      return NextResponse.redirect(`${origin}/auth/complete-profile`)
    }

    // Check if this is their first callback after email verification
    // Send welcome email only after verification (type=signup means they just verified)
    const type = requestUrl.searchParams.get('type')

    if (type === 'signup' || type === 'email') {
      // This is the first callback after email verification
      // Send welcome email (non-blocking)
      sendWelcomeEmail(
        user.email || '',
        profile.full_name || 'مستخدم'
      ).catch(err => {
        console.error('Failed to send welcome email:', err)
      })
    }

    // Redirect based on user role
    return redirectBasedOnRole(profile.role, origin)

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