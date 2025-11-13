/**
 * Subscription Types
 *
 * Types for subscription management, trials, and payment integration
 */

/**
 * Subscription status
 */
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

/**
 * Plan type for paid subscriptions
 */
export type PlanType = 'monthly' | 'yearly'

/**
 * Main subscription interface matching database schema
 */
export interface Subscription {
  id: string
  userId: string

  // Status
  status: SubscriptionStatus

  // Trial tracking
  trialEndsAt: Date

  // Paid subscription tracking
  subscriptionStartDate?: Date
  subscriptionEndDate?: Date

  // Stripe integration
  stripeCustomerId?: string
  stripeSubscriptionId?: string

  // Plan details
  planType?: PlanType
  planPriceId?: string

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

/**
 * Database row format (snake_case) for raw queries
 */
export interface SubscriptionRow {
  id: string
  user_id: string
  status: SubscriptionStatus
  trial_ends_at: string
  subscription_start_date?: string
  subscription_end_date?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  plan_type?: PlanType
  plan_price_id?: string
  created_at: string
  updated_at: string
}

/**
 * Input for creating a new subscription (on signup)
 */
export interface CreateSubscriptionInput {
  userId: string
  trialEndsAt: Date
}

/**
 * Input for updating subscription (e.g., after Stripe payment)
 */
export interface UpdateSubscriptionInput {
  status?: SubscriptionStatus
  subscriptionStartDate?: Date
  subscriptionEndDate?: Date
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  planType?: PlanType
  planPriceId?: string
}

/**
 * Subscription status check result
 */
export interface SubscriptionStatusCheck {
  hasAccess: boolean
  subscription: Subscription
  reason?: string
  daysRemaining?: number
}

/**
 * Helper to check if user has active access
 */
export function hasActiveAccess(subscription: Subscription): boolean {
  const now = new Date()

  // Check trial access
  if (subscription.status === 'trial') {
    return now < new Date(subscription.trialEndsAt)
  }

  // Check active subscription
  if (subscription.status === 'active') {
    if (!subscription.subscriptionEndDate) {
      return true // Active subscription with no end date (shouldn't happen, but safe)
    }
    return now < new Date(subscription.subscriptionEndDate)
  }

  // Expired or cancelled = no access
  return false
}

/**
 * Helper to get days remaining in trial or subscription
 */
export function getDaysRemaining(subscription: Subscription): number {
  const now = new Date()
  let endDate: Date

  if (subscription.status === 'trial') {
    endDate = new Date(subscription.trialEndsAt)
  } else if (subscription.status === 'active' && subscription.subscriptionEndDate) {
    endDate = new Date(subscription.subscriptionEndDate)
  } else {
    return 0
  }

  const diffTime = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * Helper to check if trial has expired
 */
export function isTrialExpired(subscription: Subscription): boolean {
  if (subscription.status !== 'trial') {
    return false
  }

  const now = new Date()
  return now >= new Date(subscription.trialEndsAt)
}
