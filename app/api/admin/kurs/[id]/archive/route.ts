import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { archived } = body
    if (typeof archived !== 'boolean') return NextResponse.json({ error: 'archived boolean required' }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: currentUserRow } = await supabase.from('users').select('role, admin_verified').eq('id', currentUser.id).single()
    if (!currentUserRow || currentUserRow.role !== 'admin' || currentUserRow.admin_verified !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase.from('kurs').update({ archived }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, archived })
  } catch (err) {
    console.error('Error archiving kurs:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
