/**
 * Service Provider
 * SINGLE SOURCE OF TRUTH for all service adapters
 * Change implementations by modifying this file
 */

import { StripePaymentAdapter } from '@/lib/adapters/payment/stripe.adapter'
import type { PaymentAdapter } from '@/lib/adapters/payment'

/**
 * Centralized service provider
 * Swap adapter implementations by changing these methods
 */
export class ServiceProvider {
  private static paymentInstance: PaymentAdapter | null = null

  /**
   * Get payment adapter (Stripe)
   * To swap providers, change the implementation here
   */
  static get payment(): PaymentAdapter {
    if (!this.paymentInstance) {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY

      if (!stripeSecretKey) {
        throw new Error('STRIPE_SECRET_KEY is not configured')
      }

      this.paymentInstance = new StripePaymentAdapter(stripeSecretKey)
    }

    return this.paymentInstance
  }

  /**
   * Reset instances (useful for testing)
   */
  static reset(): void {
    this.paymentInstance = null
  }
}

export {}
