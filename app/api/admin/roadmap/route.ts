import { NextResponse } from 'next/server'
import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const serverSupabase = await getSupabaseServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Ikke autorisert' }, { status: 401 })

    const adminSupabase = await getSupabaseAdminClient()
    const { data: profile } = await adminSupabase.from('users').select('role').eq('id', user.id).single()
    if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
      return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })
    }

    const { data, error } = await adminSupabase
      .from('admin_roadmap')
      .select('*')
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: data || [] })
  } catch (err) {
    console.error('GET /admin/roadmap error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, notes, done = false, priority = 0, category, subcategory, due_date } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Tittel kreves' }, { status: 400 })
    }

    const serverSupabase = await getSupabaseServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Ikke autorisert' }, { status: 401 })

    const adminSupabase = await getSupabaseAdminClient()
    const { data: profile } = await adminSupabase.from('users').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })
    }

  const insert: Record<string, unknown> = { title, notes: notes || null, done, priority, created_by: user.id }
  if (category) insert.category = category
  if (subcategory) insert.subcategory = subcategory
  if (due_date) insert.due_date = due_date

  if (done) insert.completed_at = new Date().toISOString()

  const { data, error } = await adminSupabase.from('admin_roadmap').insert([insert]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('POST /admin/roadmap error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
