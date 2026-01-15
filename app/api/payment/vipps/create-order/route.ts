import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

// POST - Create a Vipps payment order
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { purchaseId, amount_nok, description, successUrl, cancelUrl } = body || {}

    if (!purchaseId || !amount_nok) {
      return NextResponse.json({ error: 'purchaseId and amount_nok required' }, { status: 400 })
    }

    const vippsApiKey = process.env.VIPPS_API_KEY
    const vippsMerchantSerialNumber = process.env.VIPPS_MERCHANT_SERIAL_NUMBER
    const vippsSubscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY

    if (!vippsApiKey || !vippsMerchantSerialNumber || !vippsSubscriptionKey) {
      return NextResponse.json({ error: 'Vipps not configured' }, { status: 500 })
    }

    const supabase = await getSupabaseServerClient()

    // Create Vipps order
    const vippsOrderId = `TEATERET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const vippsResponse = await fetch('https://api.vipps.no/ecomm/v2/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${vippsApiKey}`,
        'Ocp-Apim-Subscription-Key': vippsSubscriptionKey,
        'Merchant-Serial-Number': vippsMerchantSerialNumber,
      },
      body: JSON.stringify({
        customerInfo: {},
        merchantInfo: {
          merchantSerialNumber: vippsMerchantSerialNumber,
          callbackPrefix: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/vipps/callback`,
          fallBack: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/bestill`,
        },
        transaction: {
          orderId: vippsOrderId,
          amount: Math.round(amount_nok * 100), // Vipps uses øre
          transactionText: description || 'Teateret kjøp',
        },
      }),
    })

    if (!vippsResponse.ok) {
      const errorText = await vippsResponse.text()
      console.error('Vipps API error:', errorText)
      return NextResponse.json({ error: 'Failed to create Vipps payment' }, { status: 500 })
    }

    const vippsData = await vippsResponse.json()

    // Record transaction
    const { error: transactionError } = await supabase.from('transactions').insert({
      purchase_id: purchaseId,
      processor: 'vipps',
      processor_id: vippsOrderId,
      amount_nok: Number(amount_nok),
      status: 'pending',
      metadata: { vipps_url: vippsData.url }
    })

    // Update purchase with vipps_order_id
    await supabase
      .from('purchases')
      .update({ vipps_order_id: vippsOrderId })
      .eq('id', purchaseId)

    if (transactionError) {
      console.error('Failed to record transaction:', transactionError)
    }

    return NextResponse.json({
      success: true,
      orderId: vippsOrderId,
      url: vippsData.url,
    })
  } catch (err: any) {
    console.error('Vipps order creation error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to create Vipps payment' },
      { status: 500 }
    )
  }
}
