import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${origin}/auth/login?error=verification_failed`)
    }

    if (data.user) {
      // Update the profile's email verification status
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            email_verified: true,
            email_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.user.id)

        if (updateError) {
          console.error('Error updating email verification:', updateError)
          // Don't fail the redirect - user is still authenticated
        }
      } catch (err) {
        console.error('Exception updating email verification:', err)
        // Don't fail the redirect - user is still authenticated
      }

      // Supplier record will be created automatically by database trigger
      // (see migration: 20250115000002_auto_create_supplier_on_signup.sql)

      // Redirect to supplier dashboard with success message
      return NextResponse.redirect(`${origin}/supplier?verified=true`)
    }
  }

  // If no code or something went wrong, redirect to login
  return NextResponse.redirect(`${origin}/auth/login`)
}
