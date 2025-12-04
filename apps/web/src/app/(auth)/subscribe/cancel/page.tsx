'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react'

/**
 * Subscription Cancel Page
 *
 * Shown when user cancels Stripe checkout
 */
export default function SubscribeCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <Card className="border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-black">
          <CardHeader className="text-center pb-6 pt-8">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-gray-100 dark:bg-gray-900 p-4">
                <XCircle className="h-12 w-12 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-black dark:text-white">
              Checkout Cancelled
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 dark:text-gray-400 mt-2">
              No worries, you can try again anytime
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-black dark:text-white">What happened?</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                You cancelled the checkout process before completing your payment.
                Your subscription has not been activated and no charges were made.
              </p>
            </div>

            <div className="space-y-3">
              <Link href="/subscribe">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-500 dark:hover:bg-purple-600">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="w-full border-gray-300 dark:border-gray-700">
                  Return to Dashboard
                </Button>
              </Link>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-black dark:text-white text-sm">
                    Need help?
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    If you experienced any issues during checkout, please contact us at{' '}
                    <a
                      href="mailto:support@realthor.app"
                      className="text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      support@realthor.app
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
