import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const kursId = url.searchParams.get('kursId')
    const ensembleId = url.searchParams.get('ensembleId')

    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Allow admins and staff to read
    const { data: currentUserRow } = await supabase.from('users').select('role').eq('id', currentUser.id).single()
    if (!currentUserRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let query = supabase.from('shows').select('*, venue:venues(name)')
    if (kursId) query = query.eq('kurs_id', kursId).eq('type', 'kurs_session')
    if (ensembleId) query = query.eq('ensemble_id', ensembleId)
    query = query.order('show_datetime', { ascending: true })

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ shows: data || [] })
  } catch (err) {
    console.error('Error fetching shows:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, show_datetime, venue_id, ensemble_id, kurs_id, type, team, base_price_nok } = body

    if (!show_datetime) return NextResponse.json({ error: 'show_datetime required' }, { status: 400 })
    if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: currentUserRow } = await supabase.from('users').select('role, admin_verified').eq('id', currentUser.id).single()
    if (!currentUserRow || currentUserRow.role !== 'admin' || currentUserRow.admin_verified !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Basic validation for referenced resources
    if (venue_id) {
      const { data: venue } = await supabase.from('venues').select('id').eq('id', venue_id).single()
      if (!venue) return NextResponse.json({ error: 'Invalid venue_id' }, { status: 400 })
    }

    if (ensemble_id) {
      const { data: ensemble } = await supabase.from('ensembles').select('id').eq('id', ensemble_id).single()
      if (!ensemble) return NextResponse.json({ error: 'Invalid ensemble_id' }, { status: 400 })
    }

    if (kurs_id) {
      const { data: kurs } = await supabase.from('kurs').select('id').eq('id', kurs_id).single()
      if (!kurs) return NextResponse.json({ error: 'Invalid kurs_id' }, { status: 400 })
    }

    const insertPayload: any = {
      title: title || null,
      show_datetime,
      venue_id: venue_id || null,
      ensemble_id: ensemble_id || null,
      kurs_id: kurs_id || null,
      type,
      is_session: body.is_session === true,
      team: team || null,
      base_price_nok: typeof base_price_nok !== 'undefined' ? base_price_nok : 0,
      source_type: kurs_id ? 'kurs' : ensemble_id ? 'ensemble' : 'standalone',
    }

    const { data, error } = await supabase.from('shows').insert(insertPayload).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, show: data })
  } catch (err) {
    console.error('Error creating show:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
