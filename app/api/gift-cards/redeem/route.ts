import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, purchase_id, amount_nok } = body
    if (!code || !purchase_id || !amount_nok) return NextResponse.json({ error: 'code, purchase_id and amount_nok are required' }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Find valid gift card
    const { data: cards, error: findErr } = await supabase.from('gift_cards').select('*').eq('code', code).limit(1).single()
    if (findErr || !cards) return NextResponse.json({ error: 'Gift card not found' }, { status: 404 })

    if (!cards.active) return NextResponse.json({ error: 'Gift card inactive' }, { status: 400 })
    if (cards.expires_at && new Date(cards.expires_at) < new Date()) return NextResponse.json({ error: 'Gift card expired' }, { status: 400 })
    if (Number(cards.remaining_value_nok) <= 0) return NextResponse.json({ error: 'No remaining value' }, { status: 400 })

    const redeemAmount = Math.min(Number(amount_nok), Number(cards.remaining_value_nok))

    // Transactional updates: reduce remaining_value and insert redemption
    const { error: updErr } = await supabase.from('gift_cards').update({ remaining_value_nok: Number(cards.remaining_value_nok) - redeemAmount }).eq('id', cards.id)
    if (updErr) {
      console.error('Failed to update gift card remaining:', updErr)
      return NextResponse.json({ error: 'Failed to redeem' }, { status: 500 })
    }

    const { error: insErr } = await supabase.from('gift_card_redemptions').insert({ gift_card_id: cards.id, user_id: user.id, purchase_id, amount_nok: redeemAmount }).select()
    if (insErr) {
      console.error('Failed to insert redemption:', insErr)
      return NextResponse.json({ error: 'Failed to record redemption' }, { status: 500 })
    }

    return NextResponse.json({ success: true, redeemed: redeemAmount })
  } catch (err) {
    console.error('Redeem gift card error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
