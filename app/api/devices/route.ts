import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('admin_devices')
      .select('id, device_name, device_info, device_token, last_seen, created_at, revoked')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('GET devices error:', error)
      return NextResponse.json({ error: 'Failed to list devices' }, { status: 500 })
    }

    const sanitized = (data || []).map((d: any) => ({
      id: d.id,
      device_name: d.device_name,
      device_info: d.device_info,
      last_seen: d.last_seen,
      created_at: d.created_at,
      revoked: d.revoked,
      device_token: process.env.NODE_ENV !== 'production' ? d.device_token : undefined
    }))

    return NextResponse.json({ devices: sanitized })
  } catch (err) {
    console.error('Error listing devices:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('admin_devices').update({ revoked: true }).eq('id', id).eq('user_id', currentUser.id)
    if (error) {
      console.error('Failed to revoke device:', error)
      return NextResponse.json({ error: 'Failed to revoke' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST revoke device error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
