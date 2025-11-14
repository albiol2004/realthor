/**
 * Payment Adapter Interface
 * Abstraction for payment processing (Stripe, PayPal, etc.)
 */

export interface CheckoutSessionParams {
  priceId: string
  userId: string
  userEmail: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

export interface CheckoutSession {
  id: string
  url: string
}

export interface CustomerPortalParams {
  customerId: string
  returnUrl: string
}

export interface CustomerPortalSession {
  url: string
}

export interface WebhookEvent {
  id: string
  type: string
  data: {
    object: any
  }
}

/**
 * Payment adapter interface
 */
export interface PaymentAdapter {
  /**
   * Create a checkout session for subscription payment
   */
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSession>

  /**
   * Create a customer portal session for subscription management
   */
  createCustomerPortalSession(params: CustomerPortalParams): Promise<CustomerPortalSession>

  /**
   * Verify and construct webhook event
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): Promise<WebhookEvent>

  /**
   * Get customer by email
   */
  getCustomerByEmail(email: string): Promise<{ id: string } | null>

  /**
   * Create a customer
   */
  createCustomer(email: string, metadata?: Record<string, string>): Promise<{ id: string }>
}

export {}
