/**
 * Stripe Payment Adapter
 * Implementation of PaymentAdapter using Stripe
 */

import Stripe from 'stripe'
import type {
  PaymentAdapter,
  CheckoutSessionParams,
  CheckoutSession,
  CustomerPortalParams,
  CustomerPortalSession,
  WebhookEvent,
} from './index'

export class StripePaymentAdapter implements PaymentAdapter {
  private stripe: Stripe

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    })
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSession> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer_email: params.userEmail,
      client_reference_id: params.userId,
      metadata: params.metadata,
      subscription_data: {
        metadata: {
          userId: params.userId,
        },
      },
    })

    if (!session.url) {
      throw new Error('Failed to create checkout session: no URL returned')
    }

    return {
      id: session.id,
      url: session.url,
    }
  }

  async createCustomerPortalSession(params: CustomerPortalParams): Promise<CustomerPortalSession> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    })

    return {
      url: session.url,
    }
  }

  async constructWebhookEvent(payload: string | Buffer, signature: string): Promise<WebhookEvent> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
    }

    const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret)

    return {
      id: event.id,
      type: event.type,
      data: {
        object: event.data.object,
      },
    }
  }

  async getCustomerByEmail(email: string): Promise<{ id: string } | null> {
    const customers = await this.stripe.customers.list({
      email,
      limit: 1,
    })

    if (customers.data.length === 0) {
      return null
    }

    return { id: customers.data[0].id }
  }

  async createCustomer(email: string, metadata?: Record<string, string>): Promise<{ id: string }> {
    const customer = await this.stripe.customers.create({
      email,
      metadata,
    })

    return { id: customer.id }
  }
}
