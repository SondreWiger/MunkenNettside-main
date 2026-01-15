import { NextResponse } from 'next/server'
import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
  const { title, notes, done, priority, category, subcategory, due_date } = body

    const serverSupabase = await getSupabaseServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Ikke autorisert' }, { status: 401 })

    const adminSupabase = await getSupabaseAdminClient()
    const { data: profile } = await adminSupabase.from('users').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })

    const updates: Record<string, unknown> = {}
    if (typeof title === 'string') updates.title = title
    if (typeof notes !== 'undefined') updates.notes = notes
    if (typeof done === 'boolean') {
      updates.done = done
      updates.completed_at = done ? new Date().toISOString() : null
    }
    if (typeof priority === 'number') updates.priority = priority
    if (typeof category === 'string') updates.category = category
    if (typeof subcategory === 'string') updates.subcategory = subcategory
    if (typeof due_date !== 'undefined') updates.due_date = due_date

    const { data, error } = await adminSupabase.from('admin_roadmap').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('PATCH /admin/roadmap/[id] error', err)
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

    const { error } = await adminSupabase.from('admin_roadmap').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /admin/roadmap/[id] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
