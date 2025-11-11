import { NextResponse } from 'next/server'

/**
 * Webhooks API Route
 *
 * Phase 1: Placeholder
 * Phase 4: Will handle external webhooks (email, WhatsApp, etc.)
 *
 * TODO: Implement webhook handlers for:
 * - Email providers (inbound emails)
 * - WhatsApp Business API (incoming messages)
 * - Other integrations
 */
export async function POST(request: Request) {
  return NextResponse.json(
    { error: 'Webhooks not yet implemented' },
    { status: 501 }
  )
}
