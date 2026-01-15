import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const show_id = url.searchParams.get('show_id')
    if (!show_id) return NextResponse.json({ error: 'show_id required' }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const now = new Date().toISOString()
    const { data } = await supabase.from('seat_holds').select('hold_token, seats, expires_at, user_id, created_at').eq('show_id', show_id).filter('active','eq',true).gt('expires_at', now)

    return NextResponse.json({ holds: data || [] })
  } catch (err) {
    console.error('Get seat holds error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
