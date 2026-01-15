import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

// POST - Handle Vipps payment callback
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, transactionId, status } = body || {}

    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Find transaction by processor_id (vipps order id)
    const { data: transaction } = await supabase
      .from('transactions')
      .select('purchase_id')
      .eq('processor', 'vipps')
      .eq('processor_id', orderId)
      .single()

    if (!transaction) {
      console.error(`No transaction found for Vipps order ${orderId}`)
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const purchaseId = transaction.purchase_id

    // Update based on status
    if (status === 'RESERVED' || status === 'SALE') {
      // Payment successful
      await supabase
        .from('transactions')
        .update({
          status: 'succeeded',
          metadata: { vipps_transaction_id: transactionId, vipps_status: status }
        })
        .eq('processor_id', orderId)
        .eq('processor', 'vipps')

      await supabase
        .from('purchases')
        .update({ status: 'completed' })
        .eq('id', purchaseId)

      console.log(`Vipps payment completed for purchase ${purchaseId}`)
    } else if (status === 'CANCELLED' || status === 'REJECTED') {
      // Payment failed
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          metadata: { vipps_transaction_id: transactionId, vipps_status: status }
        })
        .eq('processor_id', orderId)
        .eq('processor', 'vipps')

      await supabase
        .from('purchases')
        .update({ status: 'failed' })
        .eq('id', purchaseId)

      console.log(`Vipps payment failed for purchase ${purchaseId}: ${status}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Vipps callback error:', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

// GET - Handle Vipps fallback redirect
export async function GET(request: Request) {
  const url = new URL(request.url)
  const orderId = url.searchParams.get('orderId')
  const status = url.searchParams.get('status')

  if (orderId && status === 'success') {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/bekreftelse?vipps_order=${orderId}`)
  } else {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/bestill?payment=failed`)
  }
}
