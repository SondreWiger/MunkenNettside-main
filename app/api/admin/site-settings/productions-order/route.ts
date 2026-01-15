import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Require admin role
    const { data: userRow } = await supabase.from('users').select('role').eq('id', currentUser.id).single()
    if (!userRow || userRow.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data } = await supabase.from('site_settings').select('value').eq('key', 'productions_order').single()
    const value = data?.value || null
    return NextResponse.json({ value })
  } catch (err) {
    console.error('GET productions-order error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { order } = body
    if (!Array.isArray(order)) return NextResponse.json({ error: 'Order must be an array' }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userRow } = await supabase.from('users').select('role').eq('id', currentUser.id).single()
    if (!userRow || userRow.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Upsert into site_settings
    const payload = { key: 'productions_order', value: JSON.stringify(order) }
    // Using SQL via supabase client: try update then insert
    const { error: updateError } = await supabase.from('site_settings').update({ value: order, updated_by: currentUser.id }).eq('key', 'productions_order')
    if (updateError) {
      // Try insert
      const { error: insertError } = await supabase.from('site_settings').insert({ key: 'productions_order', value: order, updated_by: currentUser.id })
      if (insertError) {
        console.error('Failed to upsert productions_order:', insertError)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST productions-order error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
