import { CreditCard } from 'lucide-react'

/**
 * Subscription Management Page (Placeholder)
 *
 * Will include: Current plan, Billing cycle, Cancel/Update subscription, Stripe portal
 * Phase 3/4: Full subscription management with Stripe
 */
export default function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
          Subscription Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your plan and billing
        </p>
      </div>

      <div className="flex items-center justify-center min-h-[400px] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center">
          <CreditCard className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
            Subscription Management Coming Soon
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Phase 3/4: Stripe Integration, Plan Management, Billing Portal
          </p>
        </div>
      </div>
    </div>
  )
}
