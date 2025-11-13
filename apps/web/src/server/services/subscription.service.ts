import { subscriptionRepository } from '../repositories/subscription.repository'
import type {
  Subscription,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  SubscriptionStatusCheck,
} from '@/types/subscription'
import { hasActiveAccess, getDaysRemaining, isTrialExpired } from '@/types/subscription'
import { TRPCError } from '@trpc/server'

/**
 * Subscription Service
 * Business logic for subscription management, trials, and payments
 */
class SubscriptionService {
  /**
   * Create a new 7-day trial subscription (typically on signup)
   */
  async createTrialSubscription(userId: string): Promise<Subscription> {
    // Check if subscription already exists
    const existing = await subscriptionRepository.getByUserId(userId)
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Subscription already exists for this user',
      })
    }

    // Calculate trial end date (7 days from now)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)

    const input: CreateSubscriptionInput = {
      userId,
      trialEndsAt,
    }

    try {
      const subscription = await subscriptionRepository.create(input)
      return subscription
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create trial subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  /**
   * Get subscription by user ID
   */
  async getSubscription(userId: string): Promise<Subscription | null> {
    try {
      return await subscriptionRepository.getByUserId(userId)
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to get subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  /**
   * Get subscription by Stripe customer ID (for webhook processing)
   */
  async getSubscriptionByStripeCustomerId(
    stripeCustomerId: string
  ): Promise<Subscription | null> {
    try {
      return await subscriptionRepository.getByStripeCustomerId(stripeCustomerId)
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to get subscription by Stripe customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  /**
   * Check if user has active access (trial or paid)
   */
  async checkSubscriptionStatus(userId: string): Promise<SubscriptionStatusCheck> {
    const subscription = await this.getSubscription(userId)

    if (!subscription) {
      return {
        hasAccess: false,
        subscription: subscription!,
        reason: 'No subscription found',
      }
    }

    const access = hasActiveAccess(subscription)
    const daysRemaining = getDaysRemaining(subscription)

    if (!access) {
      if (subscription.status === 'trial' && isTrialExpired(subscription)) {
        return {
          hasAccess: false,
          subscription,
          reason: 'Trial has expired',
          daysRemaining: 0,
        }
      }

      return {
        hasAccess: false,
        subscription,
        reason: `Subscription ${subscription.status}`,
        daysRemaining: 0,
      }
    }

    return {
      hasAccess: true,
      subscription,
      daysRemaining,
    }
  }

  /**
   * Activate paid subscription (after Stripe payment)
   */
  async activatePaidSubscription(
    userId: string,
    options: {
      stripeCustomerId: string
      stripeSubscriptionId: string
      planType: 'monthly' | 'yearly'
      planPriceId: string
    }
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(userId)

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found for user',
      })
    }

    // Calculate subscription end date based on plan type
    const subscriptionStartDate = new Date()
    const subscriptionEndDate = new Date()

    if (options.planType === 'monthly') {
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1)
    } else if (options.planType === 'yearly') {
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1)
    }

    const updates: UpdateSubscriptionInput = {
      status: 'active',
      subscriptionStartDate,
      subscriptionEndDate,
      stripeCustomerId: options.stripeCustomerId,
      stripeSubscriptionId: options.stripeSubscriptionId,
      planType: options.planType,
      planPriceId: options.planPriceId,
    }

    try {
      return await subscriptionRepository.update(userId, updates)
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to activate subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  /**
   * Cancel subscription (mark as cancelled, but may still have access until end date)
   */
  async cancelSubscription(userId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(userId)

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found for user',
      })
    }

    if (subscription.status !== 'active') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only active subscriptions can be cancelled',
      })
    }

    const updates: UpdateSubscriptionInput = {
      status: 'cancelled',
    }

    try {
      return await subscriptionRepository.update(userId, updates)
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  /**
   * Expire subscription (used by cron job or when subscription end date passes)
   */
  async expireSubscription(userId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(userId)

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found for user',
      })
    }

    const updates: UpdateSubscriptionInput = {
      status: 'expired',
    }

    try {
      return await subscriptionRepository.update(userId, updates)
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to expire subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  /**
   * Renew subscription (extend end date after payment)
   */
  async renewSubscription(userId: string, planType: 'monthly' | 'yearly'): Promise<Subscription> {
    const subscription = await this.getSubscription(userId)

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found for user',
      })
    }

    // Calculate new end date based on plan type
    const now = new Date()
    const newEndDate = new Date(subscription.subscriptionEndDate || now)

    if (newEndDate < now) {
      // If expired, start from now
      newEndDate.setTime(now.getTime())
    }

    if (planType === 'monthly') {
      newEndDate.setMonth(newEndDate.getMonth() + 1)
    } else if (planType === 'yearly') {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1)
    }

    const updates: UpdateSubscriptionInput = {
      status: 'active',
      subscriptionEndDate: newEndDate,
    }

    try {
      return await subscriptionRepository.update(userId, updates)
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to renew subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }
}

export const subscriptionService = new SubscriptionService()
