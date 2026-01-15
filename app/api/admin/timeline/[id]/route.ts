import { NextResponse } from 'next/server'
import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, notes, event_type, occurred_at } = body

    const serverSupabase = await getSupabaseServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Ikke autorisert' }, { status: 401 })

    const adminSupabase = await getSupabaseAdminClient()
    const { data: profile } = await adminSupabase.from('users').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })

    const updates: Record<string, unknown> = {}
    if (typeof title === 'string') updates.title = title
    if (typeof notes !== 'undefined') updates.notes = notes
    if (typeof event_type === 'string') updates.event_type = event_type
    if (typeof occurred_at !== 'undefined') updates.occurred_at = new Date(occurred_at).toISOString()

  const { data, error } = await adminSupabase.from('admin_timeline').update({ ...updates, created_at: undefined, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('PATCH /admin/timeline/[id] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const serverSupabase = await getSupabaseServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Ikke autorisert' }, { status: 401 })

    const adminSupabase = await getSupabaseAdminClient()
    const { data: profile } = await adminSupabase.from('users').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })

    const { error } = await adminSupabase.from('admin_timeline').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /admin/timeline/[id] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
