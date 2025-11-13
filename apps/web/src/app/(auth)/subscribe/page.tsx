'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Sparkles, Zap } from 'lucide-react'

/**
 * Subscribe / Pricing Page
 *
 * Shown when trial expires or user wants to upgrade
 * Phase C: Displays pricing, Phase D: Will integrate Stripe checkout
 */
export default function SubscribePage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const monthlyPrice = 29
  const yearlyPrice = 290 // ~$24/month
  const yearlyMonthlyPrice = Math.round(yearlyPrice / 12)

  const features = [
    'Unlimited contacts and properties',
    'AI-powered task prioritization',
    'Unified messaging (Email + WhatsApp + SMS)',
    'Document compliance tracking',
    'Social lead capture',
    'Client portal access',
    'Advanced analytics',
    '24/7 email support',
    'Regular feature updates',
  ]

  const handleSubscribe = (planType: 'monthly' | 'yearly') => {
    // TODO Phase D: Integrate Stripe checkout
    alert(`Stripe checkout integration coming in Phase D!\n\nSelected plan: ${planType}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block mb-6">
            <h1 className="text-3xl font-bold text-black dark:text-white">Kairo</h1>
          </Link>
          <h2 className="text-4xl font-bold tracking-tight text-black dark:text-white mb-4">
            Upgrade to Kairo Pro
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Continue using the operating system for real estate professionals
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-white dark:bg-black text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-white dark:bg-black text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
            }`}
          >
            Yearly
            <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
              Save 17%
            </span>
          </button>
        </div>

        {/* Pricing Card */}
        <Card className="border-2 border-purple-600 dark:border-purple-500 bg-white dark:bg-black relative overflow-hidden">
          {/* Popular Badge */}
          <div className="absolute top-4 right-4">
            <div className="bg-purple-600 dark:bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Most Popular
            </div>
          </div>

          <CardHeader className="pb-8 pt-8">
            <CardTitle className="text-3xl font-bold text-black dark:text-white flex items-center gap-2">
              <Zap className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              Kairo Pro
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
              Everything you need to run your real estate business
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Pricing */}
            <div className="space-y-2">
              {billingCycle === 'monthly' ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-black dark:text-white">
                      ${monthlyPrice}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      per month
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Billed monthly • Cancel anytime
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-black dark:text-white">
                      ${yearlyMonthlyPrice}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      per month
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Billed annually at ${yearlyPrice} • Save ${(monthlyPrice * 12) - yearlyPrice}/year
                  </p>
                </>
              )}
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => handleSubscribe(billingCycle)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-500 dark:hover:bg-purple-600 text-lg py-6"
            >
              Subscribe Now
            </Button>

            {/* Features List */}
            <div className="space-y-3 pt-4">
              <p className="font-semibold text-black dark:text-white mb-4">
                Everything included:
              </p>
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            {/* Trust Badge */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                🔒 Secure payment powered by Stripe • Cancel anytime • No hidden fees
              </p>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold text-black dark:text-white">
            Questions?
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Contact us at{' '}
            <a href="mailto:support@kairo.app" className="text-purple-600 dark:text-purple-400 hover:underline">
              support@kairo.app
            </a>
          </p>
          <Link href="/login" className="inline-block">
            <Button variant="outline" className="border-gray-300 dark:border-gray-700">
              Already have an account? Sign in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
