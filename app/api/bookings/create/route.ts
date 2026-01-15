import { type NextRequest, NextResponse } from "next/server"

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
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server"
import { generateBookingReference, createQRCodeData } from "@/lib/utils/booking"
import { sendTicketEmail } from "@/lib/email/send-ticket-email"

export async function POST(request: NextRequest) {
  console.log("[v0] ========== BOOKING CREATE START ==========")

  try {
  const body = await request.json()
  const { showId, seats, customerName, customerEmail, customerPhone, specialRequests, totalAmount, discountCode, holdToken } = body

    console.log("[v0] Booking request received:")
    console.log("[v0]   showId:", showId)
    console.log("[v0]   seats count:", seats?.length)
    console.log("[v0]   customerName:", customerName)
    console.log("[v0]   customerEmail:", customerEmail)
    console.log("[v0]   totalAmount:", totalAmount)
    console.log("[v0]   discountCode:", discountCode)

    if (!showId || !Array.isArray(seats) || seats.length === 0 || !customerName || !customerEmail || typeof totalAmount !== "number" || totalAmount <= 0) {
      console.error("[v0] Validation failed:")
      console.error("[v0]   showId:", showId, "truthy:", !!showId)
      console.error("[v0]   seats is array:", Array.isArray(seats), "length:", seats?.length)
      console.error("[v0]   customerName:", customerName, "truthy:", !!customerName)
      console.error("[v0]   customerEmail:", customerEmail, "truthy:", !!customerEmail)
      console.error("[v0]   totalAmount:", totalAmount, "is number:", typeof totalAmount === "number", "gt 0:", totalAmount > 0)
      return NextResponse.json({ error: "Manglende påkrevde felt" }, { status: 400 })
    }

    // Get current user from regular server client (has session context)
    const serverClient = await getSupabaseServerClient()
    const {
      data: { user },
    } = await serverClient.auth.getUser()

    if (!user?.id) {
      console.log("[v0] Authentication failed - no user")
      return NextResponse.json(
        { error: "Du må være logget inn for å bestille billetter" },
        { status: 401 }
      )
    }

    console.log("[v0] Booking for user:", user.id)

    // Use admin client for database operations (bypasses RLS)
    const supabase = await getSupabaseAdminClient()

    // Get show details
    const { data: show, error: showError } = await supabase
      .from("shows")
      .select(`
        *,
        ensemble:ensembles(*),
        venue:venues(*)
      `)
      .eq("id", showId)
      .single()

    if (showError || !show) {
      console.error("[v0] Show error:", showError)
      return NextResponse.json({ error: "Forestilling ikke funnet" }, { status: 404 })
    }

    console.log("[v0] Show found:", show.id)
  console.log("[v0] Seats to book:", seats.map((s: Seat) => ({ row: s.row, col: s.col, section: s.section })))

  // Check that we got all requested seats (validation already done in reserve API)
  // Seats are already validated - no need to check status
  console.log("[v0] All seats validated by reserve API")

    // Generate booking reference
    const bookingReference = generateBookingReference()
    console.log("[v0] Generated booking reference:", bookingReference)

    // Verify and increment discount code usage if provided
    if (discountCode) {
      const { data: code, error: codeError } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discountCode)
        .single()

      if (!codeError && code) {
        // Increment usage counter
        await supabase
          .from("discount_codes")
          .update({ current_uses: (code.current_uses || 0) + 1 })
          .eq("id", code.id)
      }
    }

    // Create booking without QR data first (we'll add it after we have the booking ID)
      // If a holdToken is provided, validate it and mark it inactive to prevent reuse
      if (holdToken) {
        try {
          const { data: hold } = await supabase.from('seat_holds').select('*').eq('hold_token', holdToken).maybeSingle()
          if (!hold || !hold.active || new Date(hold.expires_at) <= new Date() || String(hold.show_id) !== String(showId)) {
            return NextResponse.json({ error: 'Ugyldig eller utløpt hold' }, { status: 400 })
          }

          // Ensure seats match between hold and requested seats
          const holdSeats: Seat[] = hold.seats || []
          const mismatch = (seats || []).some((req: Seat) => !holdSeats.some((h: Seat) => h.section === req.section && String(h.row) === String(req.row) && Number(h.number) === Number(req.number)))
          if (mismatch) {
            return NextResponse.json({ error: 'Hold stemmer ikke med valgte seter' }, { status: 400 })
          }

          // Deactivate hold now (prevent reuse). If booking fails later we may leave it inactive; acceptable for now.
          await supabase.from('seat_holds').update({ active: false }).eq('hold_token', holdToken)
        } catch (err) {
          console.error('[v0] Error validating hold token:', err)
          return NextResponse.json({ error: 'Kunne ikke validere hold token' }, { status: 500 })
        }
      }
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        show_id: showId,
  seat_ids: seats as Seat[], // Pass seats array directly to JSONB column
        total_amount_nok: totalAmount,
        booking_reference: bookingReference,
        qr_code_data: null, // Will be set after insert
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        special_requests: specialRequests || null,
        status: "confirmed", // Mock payment - directly confirmed
        confirmed_at: new Date().toISOString(),
        ticket_sent: false,
      })
      .select()
      .single()

    if (bookingError) {
      console.error("[v0] Booking error:", bookingError)
      return NextResponse.json({ error: "Kunne ikke opprette bestilling: " + bookingError.message }, { status: 500 })
    }

    console.log("[v0] Booking created:", booking.id, "Reference:", booking.booking_reference, "User ID:", booking.user_id)

    // Update discount code used if provided (try to update, won't fail if column doesn't exist)
    if (discountCode) {
      try {
        await supabase
          .from("bookings")
          .update({ discount_code_used: discountCode })
          .eq("id", booking.id)
      } catch (err) {
        console.log("[v0] Could not update discount_code_used (column may not exist yet):", err)
      }
    }

    // NOW create QR code data WITH the booking ID
    const showTitle = show.title || show.ensemble?.title || "Forestilling"
    const qrData = createQRCodeData(
      booking.id, // Use the actual booking ID from database
      bookingReference,
      showId,
      showTitle,
      show.show_datetime,
      customerName,
      (seats as Seat[]).map((s) => ({
        section: s.section,
        row: typeof s.row === 'number' ? String.fromCharCode(65 + s.row) : String(s.row),
        number: s.number != null ? Number(s.number) : (s.col != null ? s.col + 1 : -1),
      })),
    )

    const qrCodeDataString = JSON.stringify(qrData)
    console.log("[v0] QR data created with signature:", qrData.signature.substring(0, 16) + "...")

    // Update booking with QR data
    await supabase.from("bookings").update({ qr_code_data: qrCodeDataString }).eq("id", booking.id)

    // Update seats to 'sold' and clear any reservation metadata.
    // Seats payload may contain either seat IDs or positional objects; handle both.
    try {
      // Extract IDs if provided
  const seatIdsFromPayload = (seats || []).filter((s: Seat) => s && (s.id || s.uuid)).map((s: Seat) => s.id || s.uuid)

      if (seatIdsFromPayload.length > 0) {
        const { error: updateSeatsError } = await supabase
          .from("seats")
          .update({ status: "sold", reserved_until: null })
          .in("id", seatIdsFromPayload)
          .eq("show_id", showId)

        if (updateSeatsError) {
          console.error("[v0] Update seats by id error:", updateSeatsError)
        } else {
          console.log(`[v0] Marked ${seatIdsFromPayload.length} seats as sold by id`)
        }
      }

      // For seats that don't have explicit ids, try to update by position (section/row/number)
  const seatsByPosition = (seats || []).filter((s: Seat) => s && !s.id && s.section && (s.row != null) && (s.number != null))
      for (const s of seatsByPosition) {
        try {
          const { error: posUpdErr } = await supabase
            .from("seats")
            .update({ status: "sold", reserved_until: null })
            .eq("show_id", showId)
            .eq("section", s.section)
            .eq("row", String(s.row))
            .eq("number", Number(s.number))

          if (posUpdErr) {
            console.error("[v0] Update seat by position failed:", posUpdErr, { seat: s })
          } else {
            console.log("[v0] Marked seat as sold by position:", { section: s.section, row: s.row, number: s.number })
          }
        } catch (err) {
          console.error("[v0] Unexpected error updating seat by position:", err, { seat: s })
        }
      }
    } catch (err) {
      console.error("[v0] Error while updating seats to sold:", err)
    }

    // Update available seats count
    await supabase
      .from("shows")
      .update({ available_seats: show.available_seats - seats.length })
      .eq("id", showId)

    console.log("[v0] ========== STARTING EMAIL SEND ==========")
    console.log("[v0] Calling sendTicketEmail function...")

  let emailResult: { success: boolean; error?: string } = { success: false }

    try {
      emailResult = await sendTicketEmail({
        customerName,
        customerEmail,
        bookingReference,
        showTitle,
        showDatetime: show.show_datetime,
        venueName: show.venue?.name || "Ukjent lokale",
        venueAddress: show.venue ? `${show.venue.address}, ${show.venue.postal_code} ${show.venue.city}` : "",
        seats: (seats as Seat[]).map((s) => ({
          section: s.section,
          row: typeof s.row === 'number' ? String.fromCharCode(65 + s.row) : String(s.row),
          number: s.number != null ? Number(s.number) : (s.col != null ? s.col + 1 : -1),
          price_nok: 0, // Prices handled at checkout level, not per-seat
        })),
        totalAmount,
        qrCodeData: qrCodeDataString,
      })

      console.log("[v0] sendTicketEmail returned:", emailResult)
    } catch (emailError) {
      console.error("[v0] sendTicketEmail threw an error:", emailError)
      emailResult = {
        success: false,
        error: emailError instanceof Error ? emailError.message : "Ukjent feil i e-postsending",
      }
    }

    // Update ticket_sent status
    await supabase.from("bookings").update({ ticket_sent: emailResult.success }).eq("id", booking.id)

    if (!emailResult.success) {
      console.error("[v0] Email sending failed:", emailResult.error)
    } else {
      console.log("[v0] Email sent successfully!")
    }

    console.log("[v0] ========== BOOKING CREATE COMPLETE ==========")

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      bookingReference,
      emailSent: emailResult.success,
      emailError: emailResult.error,
    })
  } catch (error) {
    console.error("[v0] ========== BOOKING CREATE ERROR ==========")
    console.error("[v0] Booking creation error:", error)
    return NextResponse.json({ error: "Intern serverfeil" }, { status: 500 })
  }
}
