import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { seatIds, showId } = body as { seatIds?: string[]; showId?: string }

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

    const { data: currentSeats, error: checkError } = await supabase
      .from("seats")
      .select("id, status, reserved_until, row, number, section")
      .in("id", seatIds)
      .eq("show_id", showId)

    if (checkError) {
      console.error("[v0] Check seats error:", checkError)
      return NextResponse.json({ error: "Kunne ikke sjekke sete-status" }, { status: 500 })
    }

    if (!currentSeats || currentSeats.length !== seatIds.length) {
      console.warn("[v0] Seat count mismatch", {
        requested: seatIds.length,
        found: currentSeats?.length,
        currentSeats,
      })
      return NextResponse.json({ error: "Noen av setene finnes ikke" }, { status: 400 })
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
      .in("id", seatIds)
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
        requested: seatIds.length,
        updated: reservedSeats?.length,
        updatedIds: reservedIds,
      })
      if (reservedIds.length > 0) {
        await supabase
          .from("seats")
          .update({ status: "available", reserved_until: null })
          .in("id", reservedIds)
      }
      const failedCount = seatIds.length - (reservedSeats?.length || 0)
      return NextResponse.json({ error: `${failedCount} av setene ble nettopp tatt av noen andre` }, { status: 409 })
    }

    return NextResponse.json({ success: true, reservedUntil, seatIds: reservedSeats.map((seat) => seat.id) })
  } catch (error) {
    console.error("[v0] Reserve seats error:", error)
    return NextResponse.json({ error: "Intern serverfeil" }, { status: 500 })
  }
}

