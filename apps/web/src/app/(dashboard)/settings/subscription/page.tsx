'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc/client'
import {
  CreditCard,
  Calendar,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { getPlanByPriceId } from '@/lib/config/pricing'

/**
 * Subscription Management Page
 *
 * Shows current subscription status and provides access to Stripe Customer Portal
 */
export default function SubscriptionPage() {
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)

  const { data: subscriptionStatus, isLoading } = trpc.subscription.checkStatus.useQuery()
  const createPortalMutation = trpc.payment.createCustomerPortal.useMutation()

  const handleManageSubscription = async () => {
    try {
      setIsLoadingPortal(true)

      // Create portal session
      const { url } = await createPortalMutation.mutateAsync()

      // Redirect to Stripe Customer Portal
      window.location.href = url
    } catch (error) {
      console.error('Failed to create portal session:', error)
      alert('Failed to open subscription management. Please try again.')
      setIsLoadingPortal(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Subscription Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your plan and billing</p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!subscriptionStatus) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Subscription Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your plan and billing</p>
        </div>
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              No Subscription Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You don't have an active subscription. Subscribe to access all features.
            </p>
            <Link href="/subscribe">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                View Plans
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { subscription, hasAccess, daysRemaining } = subscriptionStatus
  const plan = subscription.planPriceId
    ? getPlanByPriceId(subscription.planPriceId)
    : null

  // Determine status badge
  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'trial':
        return (
          <Badge variant="outline" className="border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400">
            <Clock className="h-3 w-3 mr-1" />
            Trial
          </Badge>
        )
      case 'active':
        return (
          <Badge variant="outline" className="border-green-600 text-green-600 dark:border-green-400 dark:text-green-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case 'expired':
        return (
          <Badge variant="outline" className="border-red-600 text-red-600 dark:border-red-400 dark:text-red-400">
            <AlertCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="outline" className="border-gray-600 text-gray-600 dark:border-gray-400 dark:text-gray-400">
            Cancelled
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
          Subscription Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your plan and billing</p>
      </div>

      {/* Current Subscription Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Subscription</CardTitle>
            {getStatusBadge()}
          </div>
          <CardDescription>
            Your subscription details and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Plan</p>
              <p className="text-lg font-semibold text-black dark:text-white">
                {plan ? plan.name : subscription.status === 'trial' ? '7-Day Free Trial' : 'Unknown'}
              </p>
              {plan && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ${plan.price} {plan.billingCycle === 'monthly' ? 'per month' : plan.billingCycle === 'quarterly' ? 'per 3 months' : 'per year'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <p className="text-lg font-semibold text-black dark:text-white">
                {hasAccess ? 'Active' : 'Expired'}
              </p>
              {subscription.status === 'trial' && daysRemaining !== null && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {daysRemaining} days remaining in trial
                </p>
              )}
            </div>
          </div>

          {/* Dates */}
          {(subscription.subscriptionStartDate || subscription.subscriptionEndDate) && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                {subscription.subscriptionStartDate && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Started
                    </p>
                    <p className="text-sm font-medium text-black dark:text-white">
                      {new Date(subscription.subscriptionStartDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {subscription.subscriptionEndDate && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {subscription.status === 'cancelled' ? 'Ends on' : 'Renews on'}
                    </p>
                    <p className="text-sm font-medium text-black dark:text-white">
                      {new Date(subscription.subscriptionEndDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
            {subscription.status === 'active' && subscription.stripeCustomerId && (
              <Button
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
                className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLoadingPortal ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Subscription
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </>
                )}
              </Button>
            )}

            {(subscription.status === 'trial' || subscription.status === 'expired') && (
              <Link href="/subscribe">
                <Button className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white">
                  Upgrade to Pro
                </Button>
              </Link>
            )}

            <p className="text-sm text-gray-600 dark:text-gray-400">
              {subscription.status === 'active'
                ? 'Manage your payment method, update billing info, or cancel your subscription in the Stripe Customer Portal.'
                : subscription.status === 'trial'
                ? 'Your trial is active. Upgrade anytime to continue accessing all features.'
                : 'Your subscription has expired. Resubscribe to regain access.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-black dark:text-white">Secure Payments</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All payments are processed securely through Stripe
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-black dark:text-white">Cancel Anytime</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No long-term contracts. Cancel or change your plan anytime.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-black dark:text-white">Automatic Billing</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your subscription renews automatically. You'll receive email receipts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
