import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { generateSeats, type SeatMapConfig } from "@/lib/utils/seatMapGenerator"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { seatIds, showId } = body as { seatIds?: string[]; showId?: string }

    console.log("[v0] Reserve seats request", { showId, seatIds })

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0 || !showId) {
      return NextResponse.json({ error: "Manglende seatIds eller showId" }, { status: 400 })
    }

    const supabase = await getSupabaseAdminClient()
    const reservedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[v0] SUPABASE_SERVICE_ROLE_KEY not set - admin operations will fail")
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }

    // Get show details for seat creation if needed
    const { data: show } = await supabase
      .from("shows")
      .select("*, venue:venues(*)")
      .eq("id", showId)
      .single()

    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 })
    }

    // Parse seat IDs to extract seat positions
    const seatPositions = seatIds.map(seatId => {
      // Handle both UUID format and position format
      if (seatId.includes('-') && seatId.split('-').length > 5) {
        // Format: {showId}-{section}-{row}-{number}
        const parts = seatId.split('-')
        return {
          originalId: seatId,
          section: parts[5] || 'Sal',
          row: parts[6] || 'R',
          number: parseInt(parts[7]) || 1
        }
      } else {
        // Assume it's already a UUID - try to find it directly
        return { originalId: seatId, section: null, row: null, number: null }
      }
    })

    // First, try to find existing seats by UUID or by position
    const existingSeats = []
    const seatsToCreate = []

    for (const position of seatPositions) {
      let seat = null
      
      if (position.section && position.row && position.number) {
        // Look up by position
        const { data: seatByPosition } = await supabase
          .from("seats")
          .select("id, status, reserved_until, row, number, section")
          .eq("show_id", showId)
          .eq("section", position.section)
          .eq("row", position.row)
          .eq("number", position.number)
          .single()

        seat = seatByPosition
      } else {
        // Look up by ID
        const { data: seatById } = await supabase
          .from("seats")
          .select("id, status, reserved_until, row, number, section")
          .eq("id", position.originalId)
          .eq("show_id", showId)
          .single()

        seat = seatById
      }

      if (seat) {
        existingSeats.push(seat)
      } else if (position.section && position.row && position.number) {
        // Seat doesn't exist, mark for creation
        seatsToCreate.push({
          show_id: showId,
          section: position.section,
          row: position.row,
          number: position.number,
          price_nok: show.base_price_nok || 0,
          status: 'available'
        })
      } else {
        return NextResponse.json({ error: `Seat with ID ${position.originalId} not found` }, { status: 400 })
      }
    }

    // Create missing seats
    if (seatsToCreate.length > 0) {
      const { data: createdSeats, error: createError } = await supabase
        .from("seats")
        .insert(seatsToCreate)
        .select("id, section, row, number, status, reserved_until")

      if (createError) {
        console.error("[v0] Failed to create seats:", createError)
        return NextResponse.json({ error: "Could not create seats" }, { status: 500 })
      }

      console.log("[v0] Created", createdSeats?.length || 0, "new seats")
      existingSeats.push(...(createdSeats || []))
    }

    const currentSeats = existingSeats
    const actualSeatIds = currentSeats.map(seat => seat.id)
    
    if (currentSeats.length !== seatIds.length) {
      console.warn("[v0] Seat count mismatch after lookup/creation", {
        requested: seatIds.length,
        found: currentSeats.length,
      })
      return NextResponse.json({ error: "Some seats could not be found or created" }, { status: 400 })
    }

    console.log("[v0] Current seat states:", currentSeats.map((seat) => ({
      id: seat.id,
      status: seat.status,
      reserved_until: seat.reserved_until,
    })))

    const now = Date.now()
    const expiredReservedIds: string[] = []
    const unavailableSeats = currentSeats.filter((seat) => {
      const status = (seat.status || "available").toString().toLowerCase()
      if (status === "available") return false
      if (status === "reserved") {
        const reservedUntilTime = seat.reserved_until ? new Date(seat.reserved_until).getTime() : 0
        if (!reservedUntilTime || reservedUntilTime <= now) {
          expiredReservedIds.push(seat.id)
          return false
        }
        return true
      }
      return true
    })

    if (expiredReservedIds.length > 0) {
      console.log("[v0] Cleaning up expired reservations:", expiredReservedIds)
      await supabase
        .from("seats")
        .update({ status: "available", reserved_until: null })
        .in("id", expiredReservedIds)
    }

    if (unavailableSeats.length > 0) {
      const seatList = unavailableSeats
        .map((seat) => `Rad ${seat.row}, Sete ${seat.number}`)
        .join(", ")
      console.log("[v0] Rejecting due to unavailable seats:", {
        seatList,
        ids: unavailableSeats.map((seat) => seat.id),
      })
      return NextResponse.json(
        {
          error: `Følgende seter er ikke tilgjengelige: ${seatList}`,
          unavailableSeatIds: unavailableSeats.map((seat) => seat.id),
        },
        { status: 409 },
      )
    }

    const { data: reservedSeats, error: updateError } = await supabase
      .from("seats")
      .update({ status: "reserved", reserved_until: reservedUntil })
      .in("id", actualSeatIds)
      .eq("show_id", showId)
      .eq("status", "available")
      .select("id")

    if (updateError) {
      console.error("[v0] Update seats error:", updateError)
      console.error("[v0] Update error details:", {
        code: updateError.code,
        message: updateError.message,
        details: (updateError as any).details,
      })
      return NextResponse.json({ error: "Kunne ikke reservere setene", details: updateError.message }, { status: 500 })
    }

    if (!reservedSeats || reservedSeats.length !== seatIds.length) {
      const reservedIds = reservedSeats?.map((seat) => seat.id) || []
      console.log("[v0] Partial update detected", {
        requested: actualSeatIds.length,
        updated: reservedSeats?.length,
        updatedIds: reservedIds,
      })
      if (reservedIds.length > 0) {
        await supabase
          .from("seats")
          .update({ status: "available", reserved_until: null })
          .in("id", reservedIds)
      }
      const failedCount = actualSeatIds.length - (reservedSeats?.length || 0)
      return NextResponse.json({ error: `${failedCount} av setene ble nettopp tatt av noen andre` }, { status: 409 })
    }

    return NextResponse.json({ success: true, reservedUntil, seatIds: reservedSeats.map((seat) => seat.id) })
  } catch (error) {
    console.error("[v0] Reserve seats error:", error)
    return NextResponse.json({ error: "Intern serverfeil" }, { status: 500 })
  }
}

