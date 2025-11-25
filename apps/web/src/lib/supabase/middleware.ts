import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { SubscriptionRow } from '@/types/subscription'

/**
 * Public paths that don't require subscription check
 */
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/subscribe',
  '/verify-email',
  '/auth/callback',
  '/',
]

/**
 * API paths that should bypass subscription check
 */
const API_PATHS = [
  '/api',
  '/_next',
  '/favicon.ico',
]

/**
 * Check if a path is public (no subscription check needed)
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => {
    // Exact match for root path to avoid matching everything
    if (path === '/') {
      return pathname === '/'
    }
    // For other paths, allow exact match or startsWith (e.g., /subscribe matches /subscribe/success)
    return pathname === path || pathname.startsWith(path + '/')
  })
}

/**
 * Check if a path is an API path
 */
function isApiPath(pathname: string): boolean {
  return API_PATHS.some(path => pathname.startsWith(path))
}

/**
 * Check if user has active subscription access
 */
async function hasActiveAccess(supabase: ReturnType<typeof createServerClient>, userId: string): Promise<boolean> {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    // If there's an error fetching subscription, log it and deny access
    if (error) {
      console.error('[Middleware] Error fetching subscription for user', userId, ':', error.message)
      // Only fail open for network/timeout errors, not for "not found" errors
      if (error.code === 'PGRST116') {
        // No subscription found - deny access
        console.warn('[Middleware] No subscription found for user', userId)
        return false
      }
      // For other errors (network issues, etc.), fail open to prevent lockout
      console.warn('[Middleware] Database error, failing open for user', userId)
      return true
    }

    if (!subscription) {
      console.warn('[Middleware] No subscription data for user', userId)
      return false
    }

    const sub = subscription as SubscriptionRow
    const now = new Date()

    // Check trial access
    if (sub.status === 'trial') {
      const trialEnd = new Date(sub.trial_ends_at)
      const hasAccess = now < trialEnd
      if (!hasAccess) {
        console.info('[Middleware] Trial expired for user', userId)
      }
      return hasAccess
    }

    // Check active subscription
    if (sub.status === 'active') {
      if (!sub.subscription_end_date) {
        console.warn('[Middleware] Active subscription with no end date for user', userId)
        return true // Active with no end date (shouldn't happen, but safe)
      }
      const subEnd = new Date(sub.subscription_end_date)
      const hasAccess = now < subEnd
      if (!hasAccess) {
        console.info('[Middleware] Active subscription expired for user', userId)
      }
      return hasAccess
    }

    // Explicitly handle cancelled status
    if (sub.status === 'cancelled') {
      console.info('[Middleware] Subscription cancelled for user', userId)
      return false
    }

    // Explicitly handle expired status
    if (sub.status === 'expired') {
      console.info('[Middleware] Subscription expired for user', userId)
      return false
    }

    // Unknown status - deny access by default
    console.warn('[Middleware] Unknown subscription status', sub.status, 'for user', userId)
    return false
  } catch (error) {
    console.error('[Middleware] Unexpected error checking subscription:', error)
    // On unexpected error, fail open to prevent complete lockout
    return true
  }
}

/**
 * Creates a Supabase client for middleware usage
 * Handles cookie-based session management with proper request/response cookie handling
 */
export async function updateSession(request: NextRequest) {
  // Skip middleware entirely for document upload to prevent body lock issues in Next.js 16
  // The upload route handles its own auth via headers/cookies manually
  if (request.nextUrl.pathname === '/api/upload/document') {
    return NextResponse.next()
  }

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
          cookiesToSet.forEach(({ name, value, options }) =>
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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Skip subscription check for public paths and API routes
  if (isPublicPath(pathname) || isApiPath(pathname)) {
    // Still handle auth redirects for login/signup
    const isAuthRoute = ['/login', '/signup'].includes(pathname)

    if (user && isAuthRoute) {
      // User is authenticated, redirect away from auth pages to dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  // All other routes require authentication
  if (!user) {
    // User is not authenticated, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // User is authenticated - check subscription status
  console.log('[Middleware] Checking subscription for user', user.id, 'on path', pathname)
  const hasAccess = await hasActiveAccess(supabase, user.id)
  console.log('[Middleware] hasActiveAccess result:', hasAccess)

  if (!hasAccess) {
    // No active subscription, redirect to subscribe page
    console.log('[Middleware] Redirecting to /subscribe - no active access')
    const url = request.nextUrl.clone()
    url.pathname = '/subscribe'
    return NextResponse.redirect(url)
  }

  // User has active access, allow request
  console.log('[Middleware] Allowing access to', pathname)
  return supabaseResponse
}
