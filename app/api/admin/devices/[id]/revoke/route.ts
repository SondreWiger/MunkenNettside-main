import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Ensure device belongs to the current user
    const { data: device } = await supabase.from('admin_devices').select('id, user_id').eq('id', id).single()
    if (!device || device.user_id !== currentUser.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase.from('admin_devices').update({ revoked: true }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error revoking device:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
