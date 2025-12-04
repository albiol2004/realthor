'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Loader2 } from 'lucide-react'

/**
 * Subscription Success Page
 *
 * Shown after successful Stripe checkout
 * Webhook will handle subscription activation in the background
 */
export default function SubscribeSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!sessionId) {
      // No session ID means user navigated here directly
      router.push('/dashboard')
      return
    }

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/dashboard')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [sessionId, router])

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Redirecting...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <Card className="border-2 border-green-600 dark:border-green-500 bg-white dark:bg-black">
          <CardHeader className="text-center pb-6 pt-8">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-4">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-black dark:text-white">
              Welcome to Realthor!
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 dark:text-gray-400 mt-2">
              Your subscription is now active
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-black dark:text-white">What happens next?</h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Your payment has been processed successfully</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>You now have full access to all features</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>A receipt has been sent to your email</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>You can manage your subscription anytime in Settings</span>
                </li>
              </ul>
            </div>

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Redirecting to dashboard in {countdown} seconds...
              </p>
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-500 dark:hover:bg-purple-600"
              >
                Go to Dashboard Now
              </Button>
              <Link href="/settings/subscription">
                <Button variant="outline" className="w-full border-gray-300 dark:border-gray-700">
                  Manage Subscription
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
