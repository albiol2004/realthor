/**
 * Stripe Webhook Handler
 * Processes webhook events from Stripe (payments, subscription changes, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/server/services/payment.service'

/**
 * POST handler for Stripe webhooks
 * Must be at /api/webhooks/stripe for Stripe to send events
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text
    const body = await request.text()

    // Get the Stripe signature header
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Process the webhook event
    await paymentService.handleWebhookEvent(body, signature)

    // Return success response
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
