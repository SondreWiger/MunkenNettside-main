import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { generateSeats } from "@/lib/utils/seatMapGenerator"

interface ReservationRequest {
  seats: Array<{ row: number; col: number; section: string }>
  showId: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReservationRequest
    const { seats, showId } = body

    console.log("[v0] Reserve request received:", { seatsCount: seats?.length, showId, sampleSeat: seats?.[0] })

    if (!seats || !Array.isArray(seats) || seats.length === 0 || !showId) {
      return NextResponse.json({ error: "Manglende seats eller showId" }, { status: 400 })
    }

    const supabase = await getSupabaseAdminClient()
    const reservedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    // Get the show to access venue config
    const { data: show, error: showError } = await supabase
      .from("shows")
      .select("venue_id")
      .eq("id", showId)
      .single()

    if (showError || !show) {
      console.error("[v0] Show not found:", { showError, showId })
      return NextResponse.json({ error: "Forestilling ikke funnet" }, { status: 400 })
    }

    // Get the venue to access seat map config
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("seat_map_config")
      .eq("id", show.venue_id)
      .single()

    if (venueError || !venue) {
      return NextResponse.json({ error: "Lokale ikke funnet" }, { status: 400 })
    }

    // Generate seats from config to check which ones exist
    const config = venue.seat_map_config || { rows: 0, cols: 0 }
    console.log("[v0] Venue config:", { rows: config.rows, cols: config.cols })
    const generatedSeats = generateSeats(config)
    console.log("[v0] Generated seats:", { total: generatedSeats.length, blocked: generatedSeats.filter((s) => s.isBlocked).length })

    // Check if all requested seats are valid (not blocked)
    const unavailableSeats: any[] = []
    const validSeats = []

    for (const requestedSeat of seats) {
      const existingSeat = generatedSeats.find(
        (s) =>
          s.row === requestedSeat.row &&
          s.col === requestedSeat.col &&
          s.section === requestedSeat.section,
      )

      if (!existingSeat || existingSeat.isBlocked) {
        unavailableSeats.push(requestedSeat)
      } else {
        validSeats.push(requestedSeat)
      }
    }

    if (validSeats.length === 0) {
      return NextResponse.json(
        { error: "Ingen gyldige seter funnet", unavailableSeats },
        { status: 400 },
      )
    }

    // All seats are valid and not blocked
    // Return success - actual booking is created when user completes checkout

    return NextResponse.json({
      success: true,
      reservedUntil,
      seats: validSeats,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error("[v0] Reserve seats error:", errorMsg, error)
    return NextResponse.json({ error: `Intern serverfeil: ${errorMsg}` }, { status: 500 })
  }
}

