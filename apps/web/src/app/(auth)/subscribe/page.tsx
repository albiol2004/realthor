'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Sparkles, Zap, Star } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import {
  PRICING_PLANS,
  getPlansByTier,
  formatBillingCycle,
  type BillingCycle,
} from '@/lib/config/pricing'

/**
 * Subscribe / Pricing Page
 *
 * Displays two tiers (Standard and Professional) with three billing cycles each
 * Integrates with Stripe Checkout for payment processing
 */
export default function SubscribePage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly')
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const createCheckoutMutation = trpc.payment.createCheckoutSession.useMutation()

  const standardPlans = getPlansByTier('standard')
  const professionalPlans = getPlansByTier('professional')

  const standardPlan = standardPlans.find(p => p.billingCycle === billingCycle)!
  const professionalPlan = professionalPlans.find(p => p.billingCycle === billingCycle)!

  const handleSubscribe = async (priceId: string) => {
    try {
      setIsLoading(priceId)

      // Create checkout session
      const { url } = await createCheckoutMutation.mutateAsync({
        priceId,
      })

      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error) {
      console.error('Failed to create checkout session:', error)
      alert('Failed to start checkout. Please try again.')
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block mb-6">
            <h1 className="text-3xl font-bold text-black dark:text-white">Kairo</h1>
          </Link>
          <h2 className="text-4xl font-bold tracking-tight text-black dark:text-white mb-4">
            Choose Your Plan
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            The operating system for real estate professionals
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
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
            onClick={() => setBillingCycle('quarterly')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              billingCycle === 'quarterly'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-white dark:bg-black text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
            }`}
          >
            3 Months
            <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
              Save 12-14%
            </span>
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

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Standard Plan */}
          <Card className="border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-black relative overflow-hidden">
            <CardHeader className="pb-6 pt-8">
              <CardTitle className="text-2xl font-bold text-black dark:text-white flex items-center gap-2">
                <Star className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                {standardPlan.name}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                {standardPlan.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Pricing */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-black dark:text-white">
                    ${standardPlan.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    {formatBillingCycle(standardPlan.billingCycle)}
                  </span>
                </div>
                {standardPlan.savings && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    {standardPlan.savings}
                  </p>
                )}
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handleSubscribe(standardPlan.stripePriceId)}
                disabled={isLoading !== null}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 text-lg py-6"
              >
                {isLoading === standardPlan.stripePriceId ? 'Loading...' : 'Get Started'}
              </Button>

              {/* Features List */}
              <div className="space-y-3 pt-4">
                <p className="font-semibold text-black dark:text-white mb-3">
                  What's included:
                </p>
                {standardPlan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Professional Plan */}
          <Card className="border-2 border-purple-600 dark:border-purple-500 bg-white dark:bg-black relative overflow-hidden">
            {/* Popular Badge */}
            <div className="absolute top-4 right-4">
              <div className="bg-purple-600 dark:bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Most Popular
              </div>
            </div>

            <CardHeader className="pb-6 pt-8">
              <CardTitle className="text-2xl font-bold text-black dark:text-white flex items-center gap-2">
                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                {professionalPlan.name}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                {professionalPlan.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Pricing */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-black dark:text-white">
                    ${professionalPlan.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    {formatBillingCycle(professionalPlan.billingCycle)}
                  </span>
                </div>
                {professionalPlan.savings && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    {professionalPlan.savings}
                  </p>
                )}
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handleSubscribe(professionalPlan.stripePriceId)}
                disabled={isLoading !== null}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-500 dark:hover:bg-purple-600 text-lg py-6"
              >
                {isLoading === professionalPlan.stripePriceId ? 'Loading...' : 'Get Started'}
              </Button>

              {/* Features List */}
              <div className="space-y-3 pt-4">
                <p className="font-semibold text-black dark:text-white mb-3">
                  Everything in Standard, plus:
                </p>
                {professionalPlan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trust Badge */}
        <div className="text-center pt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            🔒 Secure payment powered by Stripe • Cancel anytime • No hidden fees
          </p>
        </div>

        {/* FAQ */}
        <div className="text-center space-y-4 pt-4">
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
