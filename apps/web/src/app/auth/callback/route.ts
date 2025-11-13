import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Auth Callback Route
 *
 * Handles OAuth callbacks and email verification links from Supabase
 * When users click the verification link in their email, they're redirected here
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      // Redirect to error page
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('Failed to verify email. Please try again.')}`, requestUrl.origin)
      )
    }

    // Email verified successfully, redirect to dashboard
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
