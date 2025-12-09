import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { seatIds, showId } = body as { seatIds?: string[]; showId?: string }

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0 || !showId) {
      return NextResponse.json({ error: "Manglende seatIds eller showId" }, { status: 400 })
    }

    const supabase = await getSupabaseAdminClient()
    const reservedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Check if seats exist and are available
    const { data: existingSeats, error: fetchError } = await supabase
      .from("seats")
      .select("*")
      .eq("show_id", showId)
      .in("id", seatIds)

    if (fetchError) {
      console.error("Error fetching seats:", fetchError)
      return NextResponse.json({ error: "Could not fetch seats" }, { status: 500 })
    }

    // Check if we found all requested seats
    if (!existingSeats || existingSeats.length !== seatIds.length) {
      const foundIds = existingSeats?.map(s => s.id) || []
      const missingIds = seatIds.filter(id => !foundIds.includes(id))
      return NextResponse.json({ 
        error: "Some seats not found", 
        missingSeats: missingIds 
      }, { status: 404 })
    }

    // Check if any seats are unavailable
    const unavailableSeats = existingSeats.filter(seat => {
      if (seat.status === 'sold' || seat.status === 'blocked') {
        return true
      }
      if (seat.status === 'reserved' && seat.reserved_until && new Date(seat.reserved_until) > new Date()) {
        return true
      }
      return false
    })

    if (unavailableSeats.length > 0) {
      return NextResponse.json({ 
        error: "Some seats are unavailable", 
        unavailableSeats: unavailableSeats.map(s => ({
          id: s.id,
          section: s.section,
          row: s.row,
          number: s.number,
          status: s.status,
          reserved_until: s.reserved_until
        }))
      }, { status: 409 })
    }

    // Reserve all seats
    const { data: reservedSeats, error: reserveError } = await supabase
      .from("seats")
      .update({
        status: 'reserved',
        reserved_until: reservedUntil,
        updated_at: new Date().toISOString()
      })
      .eq("show_id", showId)
      .in("id", seatIds)
      .select()

    if (reserveError) {
      console.error("Error reserving seats:", reserveError)
      return NextResponse.json({ error: "Could not reserve seats" }, { status: 500 })
    }

    console.log(`Successfully reserved ${reservedSeats?.length} seats for show ${showId}`)

    return NextResponse.json({
      message: "Seats reserved successfully",
      reservedSeats: reservedSeats?.map(seat => ({
        id: seat.id,
        section: seat.section,
        row: seat.row,
        number: seat.number,
        price_nok: seat.price_nok,
        reserved_until: seat.reserved_until
      })),
      reservedUntil
    })

  } catch (error) {
    console.error("Error in seat reservation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Release reservation
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { seatIds, showId } = body as { seatIds?: string[]; showId?: string }

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0 || !showId) {
      return NextResponse.json({ error: "Manglende seatIds eller showId" }, { status: 400 })
    }

    const supabase = await getSupabaseAdminClient()

    // Release seats by setting status back to available
    const { data: releasedSeats, error: releaseError } = await supabase
      .from("seats")
      .update({
        status: 'available',
        reserved_until: null,
        updated_at: new Date().toISOString()
      })
      .eq("show_id", showId)
      .in("id", seatIds)
      .select()

    if (releaseError) {
      console.error("Error releasing seats:", releaseError)
      return NextResponse.json({ error: "Could not release seats" }, { status: 500 })
    }

    console.log(`Successfully released ${releasedSeats?.length} seats for show ${showId}`)

    return NextResponse.json({
      message: "Seats released successfully",
      releasedSeats: releasedSeats?.map(seat => ({
        id: seat.id,
        section: seat.section,
        row: seat.row,
        number: seat.number
      }))
    })

  } catch (error) {
    console.error("Error in seat release:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}