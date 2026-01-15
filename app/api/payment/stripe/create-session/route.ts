import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

// Minimal skeleton for creating a Stripe checkout session.
// This is a safe stub that can be extended with real Stripe SDK integration.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { purchaseId, amount_nok } = body || {}

    if (!purchaseId || !amount_nok) return NextResponse.json({ error: 'purchaseId and amount_nok required' }, { status: 400 })

    // TODO: integrate with Stripe SDK to create a real checkout session
    // For now return a placeholder response and record an entry in transactions table later
    const supabase = await getSupabaseServerClient()
    // Optionally create a pending transaction record (lightweight)
    await supabase.from('transactions').insert({ purchase_id: purchaseId, processor: 'stripe', amount_nok: Number(amount_nok), status: 'pending' })

    return NextResponse.json({ success: true, sessionUrl: null, message: 'Stripe integration not yet configured; session skeleton created.' })
  } catch (err) {
    console.error('create-session error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
