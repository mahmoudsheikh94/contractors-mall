import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers)

  // Add security headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), browsing-topics=()'
  )

  // Content Security Policy for production
  if (process.env.NODE_ENV === 'production') {
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.mapbox.com https://vercel.live;
      style-src 'self' 'unsafe-inline' https://api.mapbox.com;
      img-src 'self' blob: data: https: http:;
      font-src 'self' data:;
      connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://api.mapbox.com https://vercel.live;
      media-src 'self';
      object-src 'none';
      child-src 'self';
      frame-src 'self' https://vercel.live;
      frame-ancestors 'none';
      base-uri 'self';
      form-action 'self';
      manifest-src 'self';
      upgrade-insecure-requests;
    `.replace(/\n/g, ' ').trim()

    response.headers.set('Content-Security-Policy', cspHeader)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth/* (auth endpoints need different handling)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}