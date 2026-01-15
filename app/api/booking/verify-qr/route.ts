import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const VerifyQRSchema = z.object({
  booking_reference: z.string(),
  qr_code_data: z.string(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { booking_reference, qr_code_data } = VerifyQRSchema.parse(body)

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only admins or staff can verify tickets
    const { data: userRow } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!userRow || (userRow.role !== 'admin' && userRow.role !== 'staff')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Find booking by reference
    const { data: booking, error } = await supabase.from('bookings').select('*').eq('booking_reference', booking_reference).single()
    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check QR code matches
    if (booking.qr_code_data !== qr_code_data) {
      return NextResponse.json({ error: 'Invalid QR code' }, { status: 400 })
    }

    // Check if already used
    if (booking.status === 'used') {
      return NextResponse.json({ error: 'Ticket already used' }, { status: 409 })
    }

    // Mark as used
    const { error: updateErr } = await supabase.from('bookings').update({ status: 'used', checked_in_at: new Date().toISOString(), checked_in_by: user.id }).eq('id', booking.id)
    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    }

    return NextResponse.json({ success: true, booking })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
