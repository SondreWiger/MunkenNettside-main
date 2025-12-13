import { NextResponse } from "next/server"
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const showId = url.searchParams.get('showId')
    if (!showId) return NextResponse.json({ error: 'Missing showId' }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: seats, error } = await supabase
      .from('seats')
      .select('id, show_id, section, row, number, status, reserved_until')
      .eq('show_id', showId)

    if (error) {
      console.error('[v0] Error listing seats:', error)
      return NextResponse.json({ error: 'Could not fetch seats' }, { status: 500 })
    }

    return NextResponse.json({ seats: seats || [] })
  } catch (err) {
    console.error('[v0] Seats list error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
