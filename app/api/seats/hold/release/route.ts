import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { hold_token } = body
    if (!hold_token) return NextResponse.json({ error: 'hold_token is required' }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Only owner or admin may release
    const { data: hold } = await supabase.from('seat_holds').select('*').eq('hold_token', hold_token).maybeSingle()
    if (!hold) return NextResponse.json({ error: 'Hold not found' }, { status: 404 })

    if (hold.user_id && user?.id && hold.user_id !== user.id) {
      // check admin
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase.from('seat_holds').update({ active: false, expires_at: new Date().toISOString() }).eq('hold_token', hold_token)
    if (error) {
      console.error('Failed to release hold:', error)
      return NextResponse.json({ error: 'Failed to release' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Release seat hold error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
