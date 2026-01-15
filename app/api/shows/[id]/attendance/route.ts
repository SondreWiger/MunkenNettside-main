import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: showId } = await params
    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: show } = await supabase.from('shows').select('id,kurs_id,source_type').eq('id', showId).single()
    if (!show) return NextResponse.json({ error: 'Show not found' }, { status: 404 })

    // If this is a kurs session, only enrolled users or admins can view attendee list
    if (show.source_type === 'kurs') {
      const { data: userRow } = await supabase.from('users').select('role').eq('id', currentUser.id).single()
      if (!userRow || userRow.role !== 'admin') {
        const { data: enrollment } = await supabase.from('kurs_enrollments').select('id').eq('kurs_id', show.kurs_id).eq('user_id', currentUser.id).eq('status', 'confirmed').single()
        if (!enrollment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { data: attendees } = await supabase
      .from('show_attendances')
      .select('user:users(id, full_name, email), status, created_at')
      .eq('show_id', showId)
      .eq('status', 'attending')
      .order('created_at', { ascending: true })

    return NextResponse.json({ attendees: attendees || [] })
  } catch (err) {
    console.error('Error fetching attendees:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: showId } = await params
    const body = await request.json()
    const { action, user_id: targetUserId } = body // action: 'attend' | 'unattend'

    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: show } = await supabase.from('shows').select('id,kurs_id,source_type').eq('id', showId).single()
    if (!show) return NextResponse.json({ error: 'Show not found' }, { status: 404 })

    // Determine target user (defaults to current user). Admins can pass user_id to modify others.
    let target = currentUser.id
    const { data: currentUserRow } = await supabase.from('users').select('role').eq('id', currentUser.id).single()
    const isAdmin = currentUserRow?.role === 'admin'
    if (targetUserId) {
      if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      target = targetUserId
    }

    // For kurs sessions, require the acting user be enrolled (unless admin)
    if (show.source_type === 'kurs' && !isAdmin) {
      const { data: enrollment } = await supabase.from('kurs_enrollments').select('id').eq('kurs_id', show.kurs_id).eq('user_id', currentUser.id).eq('status', 'confirmed').single()
      if (!enrollment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (action === 'attend') {
  const payload = { show_id: showId, user_id: target, status: 'attending' }
  const { data, error } = await supabase.from('show_attendances').upsert(payload, { onConflict: 'show_id,user_id' }).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, attendance: data })
    }

    if (action === 'unattend') {
      const { error } = await supabase.from('show_attendances').delete().eq('show_id', showId).eq('user_id', target)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('Error updating attendance:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
