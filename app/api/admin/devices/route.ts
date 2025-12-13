import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: rows } = await supabase.from('admin_devices').select('id, device_name, device_info, revoked, last_seen, created_at').eq('user_id', currentUser.id)
    return NextResponse.json({ devices: rows || [] })
  } catch (err) {
    console.error('Error listing devices:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
