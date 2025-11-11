import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Proxy runs before every request (Next.js 16+ convention)
 *
 * Phase 1: Basic setup (current) - Placeholder for auth
 * Phase 2: Will add Supabase auth check
 *
 * NOTE: Migrated from middleware.ts to proxy.ts (Next.js 16 convention).
 * The proxy pattern provides a network boundary in front of the app.
 *
 * This proxy will:
 * - Check if user is authenticated (when auth is implemented)
 * - Redirect to /login if not authenticated
 * - Allow access to public routes (auth pages, landing page)
 */
export function proxy(request: NextRequest) {
  // For now, allow all requests through
  // We'll add Supabase authentication logic here in Phase 1
  // See: apps/web/src/lib/supabase/middleware.ts for Supabase-specific helpers

  return NextResponse.next()
}

/**
 * Configure which routes this proxy runs on
 *
 * Current: Runs on dashboard routes only
 * Public routes (/, /login, /signup) are excluded
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
