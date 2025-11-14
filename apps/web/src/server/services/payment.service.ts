/**
 * Payment Service
 * Business logic for payment processing and subscription management
 */

import { ServiceProvider } from '@/lib/providers'
import { getPlanByPriceId } from '@/lib/config/pricing'
import { subscriptionRepository } from '@/server/repositories/subscription.repository'

interface CreateCheckoutSessionInput {
  priceId: string
  userId: string
  userEmail: string
}

interface CreateCustomerPortalInput {
  userId: string
}

class PaymentService {
  /**
   * Get payment adapter (lazy-loaded to avoid build-time initialization)
   */
  private get payment() {
    return ServiceProvider.payment
  }

  /**
   * Create a Stripe Checkout session
   */
  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{ url: string }> {
    const { priceId, userId, userEmail } = input

    // Validate the price ID exists in our config
    const plan = getPlanByPriceId(priceId)
    if (!plan) {
      throw new Error(`Invalid price ID: ${priceId}`)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create checkout session
    const session = await this.payment.createCheckoutSession({
      priceId,
      userId,
      userEmail,
      successUrl: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/subscribe/cancel`,
      metadata: {
        userId,
        tier: plan.tier,
        billingCycle: plan.billingCycle,
      },
    })

    return { url: session.url }
  }

  /**
   * Create a Stripe Customer Portal session
   */
  async createCustomerPortal(input: CreateCustomerPortalInput): Promise<{ url: string }> {
    const { userId } = input

    // Get user's subscription to find Stripe customer ID
    const subscription = await subscriptionRepository.getByUserId(userId)

    if (!subscription) {
      throw new Error('No subscription found')
    }

    if (!subscription.stripeCustomerId) {
      throw new Error('No Stripe customer ID found')
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create portal session
    const portal = await this.payment.createCustomerPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${appUrl}/settings/subscription`,
    })

    return { url: portal.url }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(payload: string | Buffer, signature: string): Promise<void> {
    // Verify and construct the event
    const event = await this.payment.constructWebhookEvent(payload, signature)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object)
        break

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object)
        break

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object)
        break

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object)
        break

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  }

  /**
   * Handle checkout session completed
   */
  private async handleCheckoutCompleted(session: any): Promise<void> {
    const userId = session.client_reference_id || session.metadata?.userId

    if (!userId) {
      console.error('No user ID in checkout session')
      return
    }

    const customerId = session.customer
    const subscriptionId = session.subscription

    // Update subscription record with Stripe IDs
    await subscriptionRepository.update(userId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: 'active',
      subscriptionStartDate: new Date(),
    })

    console.log(`Subscription activated for user ${userId}`)
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const userId = subscription.metadata?.userId

    if (!userId) {
      console.error('No user ID in subscription metadata')
      return
    }

    // Update subscription status
    const status = subscription.status === 'active' ? 'active' : 'expired'
    const subscriptionEndDate = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : undefined

    await subscriptionRepository.update(userId, {
      status,
      subscriptionEndDate,
    })

    console.log(`Subscription updated for user ${userId}: ${status}`)
  }

  /**
   * Handle subscription deleted/cancelled
   */
  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const userId = subscription.metadata?.userId

    if (!userId) {
      console.error('No user ID in subscription metadata')
      return
    }

    await subscriptionRepository.update(userId, {
      status: 'cancelled',
    })

    console.log(`Subscription cancelled for user ${userId}`)
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(invoice: any): Promise<void> {
    const subscriptionId = invoice.subscription

    if (!subscriptionId) {
      return
    }

    console.log(`Payment succeeded for subscription ${subscriptionId}`)
    // Additional logic if needed (e.g., send receipt email)
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: any): Promise<void> {
    const subscriptionId = invoice.subscription

    if (!subscriptionId) {
      return
    }

    console.log(`Payment failed for subscription ${subscriptionId}`)
    // Additional logic if needed (e.g., send notification email)
  }
}

export const paymentService = new PaymentService()
