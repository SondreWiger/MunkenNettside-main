import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { generateSeats, parseSeatKey, type SeatMapConfig } from "@/lib/utils/seatMapGenerator"
import { generateSeatsFromConfig } from '@/lib/utils/seat-generation'

export async function POST(request: NextRequest) {
  try {
    let body: any = {}
    let seatIds: string[] | undefined
    let showId: string | undefined

    try {
      body = await request.json()
    } catch (err) {
      // If JSON parsing fails, try to read raw text for debugging
      const raw = await request.text()
      console.warn("[v0] Could not parse JSON body, raw body:", raw)
      try {
        body = JSON.parse(raw || "{}")
      } catch (err2) {
        body = {}
      }
    }

    const seatIdsAny: any = body?.seatIds
    showId = body?.showId

    // Normalize seatIds into an array of strings
    if (typeof seatIdsAny === 'string') {
      seatIds = seatIdsAny.split(',').map((s: string) => s.trim()).filter(Boolean)
    } else if (Array.isArray(seatIdsAny)) {
      seatIds = seatIdsAny as string[]
    } else {
      seatIds = undefined
    }

    console.log("[v0] Reserve seats request", { showId, seatIds, contentType: request.headers.get("content-type") })

    // seatIds is normalized above into a string[] or undefined

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0 || !showId) {
      console.warn("[v0] Invalid reserve request payload", { body })
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

    // Accept optional richer seat objects in the payload to allow
    // the client to provide stable position data when UUIDs are stale.
    // body.seats: [{ id, section, row, number }]
    const seatsFromBody: any[] = Array.isArray(body?.seats) ? body.seats : []

    // Parse seat IDs to extract seat positions. Prefer explicit data from body.seats,
    // then try to parse a seat key like "Section-A-1". Otherwise treat as UUID.
    const seatPositions = seatIds.map(seatId => {
      const found = seatsFromBody.find(s => String(s.id) === String(seatId))
      if (found) {
        return {
          originalId: seatId,
          section: found.section || null,
          row: found.row ? String(found.row) : null,
          number: found.number != null ? Number(found.number) : null,
        }
      }

      // Try seat key format Section-A-1 etc.
      const parsed = parseSeatKey(String(seatId))
      if (parsed) {
        return { originalId: seatId, section: parsed.section, row: String.fromCharCode(65 + parsed.row), number: parsed.col + 1 }
      }

      // Fallback: treat as UUID
      return { originalId: seatId, section: null, row: null, number: null }
    })

    // First, try to find existing seats by UUID or by position
  const existingSeats: any[] = []
  const seatsToCreate: any[] = []
  const missingOriginalIds: string[] = []

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
        // UUID-style ID not found in DB — try fallback strategies before giving up
        // 1) If the client provided position info for this originalId, create the seat
        const bodySeat = seatsFromBody.find(s => String(s.id) === String(position.originalId))
        if (bodySeat && bodySeat.section && bodySeat.row && (bodySeat.number != null)) {
          seatsToCreate.push({
            show_id: showId,
            section: bodySeat.section || 'Sal',
            row: String(bodySeat.row),
            number: Number(bodySeat.number),
            price_nok: show.base_price_nok || 0,
            status: 'available'
          })
        } else {
          // Defer: couldn't find positional info locally - record for later retry (using generator)
          missingOriginalIds.push(position.originalId)
        }
      }
    }

    // Create missing seats
    if (seatsToCreate.length > 0) {
      // Try insert with duplicate handling (unique constraint may race)
      try {
        const { data: createdSeats, error: createError } = await supabase
          .from("seats")
          .insert(seatsToCreate)
          .select("id, section, row, number, status, reserved_until")

        if (createError) {
          // If duplicate error, try a safe retry: delete existing seats for this show and re-insert
          if ((createError as any).code === '23505') {
            console.warn('[v0] Duplicate key error while creating seats, retrying by regenerating seats for show')
            // Try generating seats from venue config which will delete/recreate atomically
            try {
              await generateSeatsFromConfig(showId, supabase)
            } catch (genErr) {
              console.error('[v0] Seat generation failed during retry:', genErr)
            }
          } else {
            console.error("[v0] Failed to create seats:", createError)
            return NextResponse.json({ error: "Could not create seats" }, { status: 500 })
          }
        }

        // Re-query seats that match the created positions to get IDs
        const createdOrFound: any[] = []
        for (const s of seatsToCreate) {
          const { data: seatRec } = await supabase
            .from('seats')
            .select('id, section, row, number, status, reserved_until')
            .eq('show_id', showId)
            .eq('section', s.section)
            .eq('row', s.row)
            .eq('number', s.number)
            .single()
          if (seatRec) createdOrFound.push(seatRec)
        }

        console.log('[v0] Created or found', createdOrFound.length, 'new seats')
        existingSeats.push(...createdOrFound)
      } catch (err) {
        console.error('[v0] Unexpected error creating seats:', err)
        return NextResponse.json({ error: 'Could not create seats' }, { status: 500 })
      }
    }

    // If there are still missing UUIDs (we couldn't map by position), try to generate seats
    // from the venue seat_map_config and re-run a lookup for those IDs by positions
    if (missingOriginalIds.length > 0) {
      console.warn('[v0] Some requested seat UUIDs were not found immediately, will attempt generation fallback:', missingOriginalIds)

      if (show?.venue?.seat_map_config) {
        try {
          await generateSeatsFromConfig(showId, supabase)
        } catch (genErr) {
          console.error('[v0] Seat generation fallback failed:', genErr)
        }

        // Re-run lookup for missing items using any positional info we may have
        for (const originalId of [...missingOriginalIds]) {
          // Try to find in seatsFromBody first
          const bodySeat = seatsFromBody.find(s => String(s.id) === String(originalId))
          if (bodySeat && bodySeat.section && bodySeat.row && (bodySeat.number != null)) {
            const { data: seatRec } = await supabase
              .from('seats')
              .select('id, section, row, number, status, reserved_until')
              .eq('show_id', showId)
              .eq('section', bodySeat.section)
              .eq('row', String(bodySeat.row))
              .eq('number', Number(bodySeat.number))
              .single()
            if (seatRec) {
              existingSeats.push(seatRec)
              missingOriginalIds.splice(missingOriginalIds.indexOf(originalId), 1)
            }
          }
        }
      }

      if (missingOriginalIds.length > 0) {
        console.warn("[v0] Following requested seat UUIDs could not be resolved even after generation:", missingOriginalIds)
        return NextResponse.json({ error: `Følgende seter ble ikke funnet: ${missingOriginalIds.join(', ')}`, missingOriginalIds }, { status: 400 })
      }
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

    console.log('[v0] Attempting to reserve seats:', { actualSeatIds, showId, reservedUntil })
    const { data: reservedSeats, error: updateError } = await supabase
      .from("seats")
      .update({ status: "reserved", reserved_until: reservedUntil })
      .in("id", actualSeatIds)
      .eq("show_id", showId)
      .eq("status", "available")
      .select("id, status, reserved_until")

    if (updateError) {
      console.error("[v0] Update seats error:", updateError)
      console.error("[v0] Update error details:", {
        code: updateError.code,
        message: updateError.message,
        details: (updateError as any).details,
      })
      return NextResponse.json({ error: "Kunne ikke reservere setene", details: updateError.message }, { status: 500 })
    }

    const updatedCount = Array.isArray(reservedSeats) ? reservedSeats.length : 0
    console.log('[v0] Reserve update result:', { updatedCount, reservedSeats })

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

    console.log(`[v0] Successfully reserved ${reservedSeats.length} seats`)
    return NextResponse.json({ success: true, reservedUntil, seatIds: reservedSeats.map((seat) => seat.id) })
  } catch (error) {
    console.error("[v0] Reserve seats error:", error)
    return NextResponse.json({ error: "Intern serverfeil" }, { status: 500 })
  }
}

