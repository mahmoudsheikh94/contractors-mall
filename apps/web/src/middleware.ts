import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh user's session
  const { data: { user }, error } = await supabase.auth.getUser()

  // If there's an error refreshing the session, clear cookies and redirect to login
  if (error && !request.nextUrl.pathname.startsWith('/auth/')) {
    console.log('Session refresh error:', error.message)
    // Clear auth cookies
    supabaseResponse.cookies.delete('sb-access-token')
    supabaseResponse.cookies.delete('sb-refresh-token')
  }

  // Define route categories
  const protectedPaths = ['/dashboard', '/profile', '/orders', '/supplier', '/admin']
  const authPaths = ['/auth/login', '/auth/register', '/auth/verify']
  const callbackPath = '/auth/callback'
  const completeProfilePath = '/auth/complete-profile'
  const apiPaths = ['/api/']

  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )
  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )
  const isCallbackPath = request.nextUrl.pathname.startsWith(callbackPath)
  const isCompleteProfilePath = request.nextUrl.pathname.startsWith(completeProfilePath)
  const isApiPath = apiPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Allow API routes to proceed (they handle their own auth)
  if (isApiPath) {
    return supabaseResponse
  }

  // Allow callback to proceed regardless of auth state
  if (isCallbackPath) {
    return supabaseResponse
  }

  // Complete profile page requires authentication
  if (isCompleteProfilePath && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and on complete-profile, check if profile already exists
  if (isCompleteProfilePath && user) {
    try {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // If profile exists, redirect based on role
      if (profile) {
        const redirectUrl = request.nextUrl.clone()
        switch (profile.role) {
          case 'supplier_admin':
            redirectUrl.pathname = '/supplier/dashboard'
            break
          case 'admin':
            redirectUrl.pathname = '/admin/dashboard'
            break
          default:
            redirectUrl.pathname = '/dashboard'
        }
        return NextResponse.redirect(redirectUrl)
      }
    } catch (error) {
      // Profile doesn't exist, allow access to complete-profile
      console.log('Profile check error or not found, allowing complete-profile access')
    }
    return supabaseResponse
  }

  // Redirect to login if accessing protected route without auth
  if (!user && isProtectedPath) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if accessing auth pages while logged in
  // But check if profile exists first
  if (user && isAuthPath) {
    try {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // No profile, redirect to complete-profile
        return NextResponse.redirect(new URL('/auth/complete-profile', request.url))
      }

      // Profile exists, redirect based on role
      const redirectUrl = request.nextUrl.clone()
      switch (profile.role) {
        case 'supplier_admin':
          redirectUrl.pathname = '/supplier/dashboard'
          break
        case 'admin':
          redirectUrl.pathname = '/admin/dashboard'
          break
        default:
          redirectUrl.pathname = '/dashboard'
      }
      return NextResponse.redirect(redirectUrl)
    } catch (error) {
      // Error checking profile, redirect to complete-profile to be safe
      return NextResponse.redirect(new URL('/auth/complete-profile', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}