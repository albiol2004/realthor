'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  // Check if user is already verified
  useEffect(() => {
    const checkVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        // Already verified, redirect to dashboard
        router.push('/dashboard')
      }
    }
    checkVerification()
  }, [router])

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsVerifying(true)

    try {
      // For now, Supabase uses token-based verification via email link
      // A custom OTP system would require additional backend setup
      setError('Please use the verification link sent to your email.')
    } catch (err: any) {
      setError(err.message || 'Failed to verify code')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendEmail = async () => {
    if (!email) {
      setError('Email address not found')
      return
    }

    setIsResending(true)
    setError(null)
    setResendSuccess(false)

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (resendError) throw resendError

      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-black dark:text-white">Kairo</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Real Estate CRM
          </p>
        </div>

        {/* Verification Card */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-8 shadow-sm">
          <div className="space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="rounded-full bg-gray-100 dark:bg-gray-900 p-4">
                <svg
                  className="h-12 w-12 text-black dark:text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>

            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-black dark:text-white">
                Check Your Email
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We've sent a verification link to:
              </p>
              <p className="text-sm font-medium text-black dark:text-white">
                {email || 'your email address'}
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {resendSuccess && (
              <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Verification email sent! Check your inbox.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4 space-y-2">
                <p className="text-sm font-medium text-black dark:text-white">
                  Next steps:
                </p>
                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Open the email from Kairo</li>
                  <li>Click the verification link</li>
                  <li>You'll be automatically redirected to your dashboard</li>
                </ol>
              </div>

              {/* Resend Button */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleResendEmail}
                  disabled={isResending}
                  variant="outline"
                  className="w-full"
                >
                  {isResending ? 'Sending...' : 'Resend Verification Email'}
                </Button>

                <p className="text-xs text-center text-gray-500 dark:text-gray-500">
                  Didn't receive the email? Check your spam folder.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <div className="text-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Wrong email?{' '}
                </span>
                <Link href="/signup" className="font-medium underline">
                  Sign up again
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Help */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-500">
          <p>Having trouble? Contact support@kairo.com</p>
        </div>
      </div>
    </div>
  )
}
