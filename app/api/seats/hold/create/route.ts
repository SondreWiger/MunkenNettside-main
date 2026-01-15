
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

interface Seat {
  id?: string
  uuid?: string
  section: string
  row: string | number
  col?: number
  number?: number
  status?: string
  reserved_until?: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { show_id, seats, duration_seconds } = body
    if (!show_id || !seats || !Array.isArray(seats) || seats.length === 0) {
      return NextResponse.json({ error: 'show_id and seats[] are required' }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null
    const seatArr: Seat[] = seats

    // Prefer an atomic RPC that acquires an advisory lock and creates the hold server-side.
    // This avoids races under concurrency. Fall back to previous naive insert if RPC unavailable.
    const duration = Number(duration_seconds) || 300 // default 5 minutes

    try {
  const rpcArgs = { p_show_id: show_id, p_seats: seatArr, p_user_id: userId, p_duration_seconds: duration }
  const { data: rpcData, error: rpcErr } = await supabase.rpc('create_seat_hold', rpcArgs)
      if (rpcErr) {
        // Supabase returns error with message 'seats_conflict' for conflicts
        console.error('create_seat_hold rpc error:', rpcErr)
        if (rpcErr.message && rpcErr.message.includes('seats_conflict')) {
          return NextResponse.json({ error: 'One or more seats are already held' }, { status: 409 })
        }
        // otherwise fallthrough to fallback behavior
      } else if (rpcData) {
        // rpcData may be an array or value depending on driver; handle string/uuid
        const token = Array.isArray(rpcData) ? rpcData[0] : rpcData
        return NextResponse.json({ hold_token: token, expires_at: new Date(Date.now() + duration * 1000).toISOString() })
      }
    } catch (rpcException) {
      console.warn('RPC create_seat_hold failed, falling back to insert:', rpcException)
    }

    // Fallback: naive check + insert (less safe under high concurrency)
    const now = new Date().toISOString()
    const { data: existingHolds } = await supabase
      .from('seat_holds')
      .select('id, seats, expires_at, active')
      .filter('active', 'eq', true)
      .gt('expires_at', now)

    if (existingHolds && existingHolds.length > 0) {
      const conflict = existingHolds.some((h: { seats: Seat[] }) => {
        try {
          const hs: Seat[] = h.seats || []
          return seatArr.some((req: Seat) => hs.some((x: Seat) => x.section === req.section && x.row === req.row && x.number === req.number))
        } catch (e) {
          return false
        }
      })
      if (conflict) return NextResponse.json({ error: 'One or more seats are already held' }, { status: 409 })
    }

    const tokenRes = await supabase.rpc('gen_random_uuid')
    const holdToken = tokenRes?.data || crypto.randomUUID()
    const expiresAt = new Date(Date.now() + duration * 1000).toISOString()

    const { error } = await supabase.from('seat_holds').insert({ hold_token: holdToken, show_id, seats, user_id: userId, expires_at: expiresAt, created_by: userId }).select()
    if (error) {
      console.error('Failed to create seat hold (fallback):', error)
      return NextResponse.json({ error: 'Failed to create hold' }, { status: 500 })
    }

    return NextResponse.json({ hold_token: holdToken, expires_at: expiresAt })
  } catch (err) {
    console.error('Create seat hold error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
