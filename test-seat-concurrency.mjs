#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1) Create a show
  const showData = {
    title: `Test show ${new Date().toISOString()}`,
    status: 'on_sale',
    show_datetime: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  }

  const { data: show, error: showError } = await supabase.from('shows').insert(showData).select('*').single()
  if (showError) throw showError
  console.log('Created show', show.id)

  // 2) Insert a seat for the show
  const seat = {
    show_id: show.id,
    section: 'Test',
    row: '1',
    number: 1,
    status: 'available',
  }

  const { data: seats, error: seatError } = await supabase.from('seats').insert(seat).select('*')
  if (seatError) throw seatError
  const seatId = seats[0].id
  console.log('Inserted seat', seatId)

  // 3) Attempt two concurrent reservations that race to set status to 'reserved'
  function attemptReserve(clientName) {
    return supabase
      .from('seats')
      .update({ status: 'reserved', reserved_until: new Date(new Date().getTime() + 10 * 60 * 1000).toISOString() })
      .eq('id', seatId)
      .eq('status', 'available')
      .select('*')
  }

  const p1 = attemptReserve('C1')
  const p2 = attemptReserve('C2')
  const [r1, r2] = await Promise.all([p1, p2])

  console.log('Reserve attempt 1:', r1)
  console.log('Reserve attempt 2:', r2)

  const successCount = (r1.data?.length ? 1 : 0) + (r2.data?.length ? 1 : 0)
  console.log('Successful reservations:', successCount)

  // Expect exactly one success
  if (successCount !== 1) {
    console.error('Unexpected concurrency behavior: expected 1 successful reserve, got', successCount)
    process.exit(2)
  }

  // 4) Now complete a booking that marks seat sold (simulate booking flow)
  // Create a booking row
  const bookingPayload = {
    show_id: show.id,
    booking_reference: `TEST-${randomUUID().slice(0, 8)}`,
    status: 'confirmed',
    total_amount_nok: 100,
    customer_name: 'Test User',
  }

  const { data: booking, error: bookingError } = await supabase.from('bookings').insert(bookingPayload).select('*').single()
  if (bookingError) throw bookingError
  console.log('Created booking', booking.id)

  // Mark seat sold by id
  const { data: soldData, error: soldError } = await supabase
    .from('seats')
    .update({ status: 'sold', reserved_until: null })
    .eq('id', seatId)
    .select('*')

  if (soldError) throw soldError
  console.log('Marked sold:', soldData)

  const { data: finalSeat } = await supabase.from('seats').select('*').eq('id', seatId).single()
  console.log('Final seat status:', finalSeat.status)

  if (finalSeat.status !== 'sold') {
    console.error('Seat was not marked sold as expected')
    process.exit(3)
  }

  console.log('Concurrency test passed ✅')
}

main().catch((err) => {
  console.error('Error during test:', err)
  process.exit(1)
})
