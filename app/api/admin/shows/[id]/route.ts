import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: currentUserRow } = await supabase.from('users').select('role, admin_verified').eq('id', currentUser.id).single()
    if (!currentUserRow || currentUserRow.role !== 'admin' || currentUserRow.admin_verified !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: existing } = await supabase.from('shows').select('id').eq('id', id).single()
    if (!existing) return NextResponse.json({ error: 'Show not found' }, { status: 404 })

    const { error } = await supabase.from('shows').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting show:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
