import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Proxy runs before every request (Next.js 16+ convention)
 *
 * This proxy handles:
 * - Supabase session refresh and cookie management
 * - Authentication checks for protected routes
 * - Redirects to /login for unauthenticated users on protected routes
 * - Redirects to /dashboard for authenticated users on auth pages
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
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
