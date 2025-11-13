import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type {
  Subscription,
  SubscriptionRow,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
} from '@/types/subscription'

/**
 * Create a Supabase client with service role key for admin operations
 * Used to bypass RLS when creating/updating subscriptions
 */
function createAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Convert database row to Subscription object (snake_case → camelCase)
 */
function rowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    trialEndsAt: new Date(row.trial_ends_at),
    subscriptionStartDate: row.subscription_start_date
      ? new Date(row.subscription_start_date)
      : undefined,
    subscriptionEndDate: row.subscription_end_date
      ? new Date(row.subscription_end_date)
      : undefined,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    planType: row.plan_type,
    planPriceId: row.plan_price_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

/**
 * Subscription Repository
 * Handles all database operations for subscriptions
 */
class SubscriptionRepository {
  /**
   * Create a new subscription (typically on signup)
   * Uses admin client to bypass RLS
   */
  async create(input: CreateSubscriptionInput): Promise<Subscription> {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('subscriptions')
      .insert({
        user_id: input.userId,
        status: 'trial',
        trial_ends_at: input.trialEndsAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create subscription: ${error.message}`)
    }

    if (!data) {
      throw new Error('Failed to create subscription: No data returned')
    }

    return rowToSubscription(data as SubscriptionRow)
  }

  /**
   * Get subscription by user ID
   */
  async getByUserId(userId: string): Promise<Subscription | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      throw new Error(`Failed to get subscription: ${error.message}`)
    }

    if (!data) {
      return null
    }

    return rowToSubscription(data as SubscriptionRow)
  }

  /**
   * Get subscription by Stripe customer ID
   * Uses admin client for webhook processing
   */
  async getByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | null> {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('subscriptions')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get subscription by Stripe customer ID: ${error.message}`)
    }

    if (!data) {
      return null
    }

    return rowToSubscription(data as SubscriptionRow)
  }

  /**
   * Update subscription
   * Uses admin client to bypass RLS (needed for webhook processing)
   */
  async update(userId: string, updates: UpdateSubscriptionInput): Promise<Subscription> {
    const adminClient = createAdminClient()

    const updateData: Record<string, unknown> = {}

    if (updates.status !== undefined) {
      updateData.status = updates.status
    }
    if (updates.subscriptionStartDate !== undefined) {
      updateData.subscription_start_date = updates.subscriptionStartDate.toISOString()
    }
    if (updates.subscriptionEndDate !== undefined) {
      updateData.subscription_end_date = updates.subscriptionEndDate.toISOString()
    }
    if (updates.stripeCustomerId !== undefined) {
      updateData.stripe_customer_id = updates.stripeCustomerId
    }
    if (updates.stripeSubscriptionId !== undefined) {
      updateData.stripe_subscription_id = updates.stripeSubscriptionId
    }
    if (updates.planType !== undefined) {
      updateData.plan_type = updates.planType
    }
    if (updates.planPriceId !== undefined) {
      updateData.plan_price_id = updates.planPriceId
    }

    const { data, error } = await adminClient
      .from('subscriptions')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update subscription: ${error.message}`)
    }

    if (!data) {
      throw new Error('Failed to update subscription: No data returned')
    }

    return rowToSubscription(data as SubscriptionRow)
  }

  /**
   * Delete subscription (for testing or cleanup)
   * Uses admin client to bypass RLS
   */
  async delete(userId: string): Promise<void> {
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('subscriptions')
      .delete()
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete subscription: ${error.message}`)
    }
  }
}

export const subscriptionRepository = new SubscriptionRepository()
