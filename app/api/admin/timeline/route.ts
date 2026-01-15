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
      .from('admin_timeline')
      .select('*')
      .order('occurred_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ items: data || [] })
  } catch (err) {
    console.error('GET /admin/timeline error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, notes, event_type = 'note', occurred_at } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Tittel kreves' }, { status: 400 })
    }

    const serverSupabase = await getSupabaseServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Ikke autorisert' }, { status: 401 })

    const adminSupabase = await getSupabaseAdminClient()
    const { data: profile } = await adminSupabase.from('users').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })

    const occurredAtValue = occurred_at ? new Date(occurred_at).toISOString() : new Date().toISOString()

    const { data, error } = await adminSupabase.from('admin_timeline').insert([{ title, notes: notes || null, event_type, occurred_at: occurredAtValue, created_by: user.id }]).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('POST /admin/timeline error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
