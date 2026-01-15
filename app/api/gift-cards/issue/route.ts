import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

function generateCode() {
  return 'GC-' + Math.random().toString(36).slice(2, 10).toUpperCase()
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code: providedCode, initial_value_nok, issued_to_email } = body

    const code = providedCode || generateCode()
    const initial = Number(initial_value_nok) || 0

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Only admin users can issue gift cards
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: userRow } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!userRow || userRow.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase.from('gift_cards').insert({ code, initial_value_nok: initial, remaining_value_nok: initial, issued_by: user.id, issued_to_email }).select()
    if (error) {
      console.error('Failed to create gift card:', error)
      return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
    }

    return NextResponse.json({ success: true, code })
  } catch (err) {
    console.error('Issue gift card error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
