/**
 * Stripe Pricing Configuration
 * Centralized pricing plans for Kairo OS subscriptions
 */

export type PricingTier = 'standard' | 'professional'
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly'

export interface PricingPlan {
  tier: PricingTier
  name: string
  description: string
  billingCycle: BillingCycle
  price: number
  stripePriceId: string
  features: string[]
  popular?: boolean
  savings?: string
}

/**
 * All available pricing plans
 */
export const PRICING_PLANS: PricingPlan[] = [
  // Standard - Monthly
  {
    tier: 'standard',
    name: 'Kairo OS Standard',
    description: 'Essential tools for real estate professionals',
    billingCycle: 'monthly',
    price: 99,
    stripePriceId: 'price_1ST0iUALz1CYSn4I4a5gXYS0',
    features: [
      'Unlimited contacts and properties',
      'Basic CRM features',
      'Document management',
      'Email integration',
      'Mobile app access',
      'Email support',
    ],
  },
  // Standard - Quarterly
  {
    tier: 'standard',
    name: 'Kairo OS Standard',
    description: 'Essential tools for real estate professionals',
    billingCycle: 'quarterly',
    price: 270,
    stripePriceId: 'price_1STLesALz1CYSn4IV6EW0GP9',
    savings: 'Save 9%',
    features: [
      'Unlimited contacts and properties',
      'Basic CRM features',
      'Document management',
      'Email integration',
      'Mobile app access',
      'Email support',
    ],
  },
  // Standard - Yearly
  {
    tier: 'standard',
    name: 'Kairo OS Standard',
    description: 'Essential tools for real estate professionals',
    billingCycle: 'yearly',
    price: 999.98,
    stripePriceId: 'price_1STLcQALz1CYSn4ICkt2Sm1P',
    savings: 'Save 16%',
    features: [
      'Unlimited contacts and properties',
      'Basic CRM features',
      'Document management',
      'Email integration',
      'Mobile app access',
      'Email support',
    ],
  },
  // Professional - Monthly
  {
    tier: 'professional',
    name: 'Kairo OS Professional',
    description: 'Advanced features for power users',
    billingCycle: 'monthly',
    price: 199,
    stripePriceId: 'price_1STLkfALz1CYSn4IaUxpWzqt',
    popular: true,
    features: [
      'Everything in Standard',
      'AI-powered task prioritization',
      'Unified messaging (Email + WhatsApp + SMS)',
      'Advanced compliance tracking',
      'Social lead capture',
      'Client portal access',
      'Advanced analytics & reports',
      'Priority support',
      'Custom integrations',
    ],
  },
  // Professional - Quarterly
  {
    tier: 'professional',
    name: 'Kairo OS Professional',
    description: 'Advanced features for power users',
    billingCycle: 'quarterly',
    price: 540,
    stripePriceId: 'price_1STLolALz1CYSn4IYQjrWKld',
    popular: true,
    savings: 'Save 10%',
    features: [
      'Everything in Standard',
      'AI-powered task prioritization',
      'Unified messaging (Email + WhatsApp + SMS)',
      'Advanced compliance tracking',
      'Social lead capture',
      'Client portal access',
      'Advanced analytics & reports',
      'Priority support',
      'Custom integrations',
    ],
  },
  // Professional - Yearly
  {
    tier: 'professional',
    name: 'Kairo OS Professional',
    description: 'Advanced features for power users',
    billingCycle: 'yearly',
    price: 1999,
    stripePriceId: 'price_1STLnlALz1CYSn4I0FTWciyG',
    popular: true,
    savings: 'Save 17%',
    features: [
      'Everything in Standard',
      'AI-powered task prioritization',
      'Unified messaging (Email + WhatsApp + SMS)',
      'Advanced compliance tracking',
      'Social lead capture',
      'Client portal access',
      'Advanced analytics & reports',
      'Priority support',
      'Custom integrations',
    ],
  },
]

/**
 * Get plans by tier
 */
export function getPlansByTier(tier: PricingTier): PricingPlan[] {
  return PRICING_PLANS.filter(plan => plan.tier === tier)
}

/**
 * Get plan by price ID
 */
export function getPlanByPriceId(priceId: string): PricingPlan | undefined {
  return PRICING_PLANS.find(plan => plan.stripePriceId === priceId)
}

/**
 * Format billing cycle for display
 */
export function formatBillingCycle(cycle: BillingCycle): string {
  switch (cycle) {
    case 'monthly':
      return 'per month'
    case 'quarterly':
      return 'per 3 months'
    case 'yearly':
      return 'per year'
  }
}
