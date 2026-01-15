import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

// Minimal webhook skeleton for Stripe. This accepts POST webhooks and records receipt.
// NOTE: Real Stripe verification (signature checking) must be implemented before enabling in production.
export async function POST(request: Request) {
  try {
    // We don't validate signatures here (skeleton only)
    const body = await request.json()
    const eventType = body?.type || 'unknown'

    // Store raw webhook for audit in transactions metadata (non-blocking)
    try {
      const supabase = await getSupabaseServerClient()
      await supabase.from('transactions').insert({ processor: 'stripe', processor_id: body?.data?.object?.id || null, amount_nok: 0, status: 'webhook_received', metadata: { event: eventType, payload: body } })
    } catch (err) {
      console.error('Failed to record webhook in transactions table (non-fatal):', err)
    }

    // Respond quickly
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('stripe webhook error', err)
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
