import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { verifyQRSignature, generateQRSignature } from "@/lib/utils/booking"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { qrData, bookingReference } = body

    console.log("[Verify Ticket] ========== REQUEST START ==========")
    console.log("[Verify Ticket] Headers User-Agent:", request.headers.get("user-agent")?.substring(0, 100))
    console.log("[Verify Ticket] Received request with:", { 
      hasQrData: !!qrData, 
      bookingReference,
      qrDataLength: qrData?.length,
      qrDataType: typeof qrData,
      qrDataPreview: qrData?.substring(0, 200)
    })

    // Get user from server client (has session context)
    const serverSupabase = await getSupabaseServerClient()
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ status: "error", message: "Ikke autorisert" }, { status: 401 })
    }

    // Check if user is admin
    const adminSupabase = await getSupabaseAdminClient()
    const { data: profile } = await adminSupabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ status: "error", message: "Ikke autorisert" }, { status: 403 })
    }

    // Use admin client for database operations
    const supabase = await getSupabaseAdminClient()

    // Declare booking variable
    interface BookingData {
      id: string
      booking_reference: string
      customer_name: string
      status: string
      checked_in_at?: string
      seat_ids: string[]
      special_requests?: string
      show?: {
        title?: string
        show_datetime: string
        ensemble?: {
          title: string
        }
      }
    }

    let booking: BookingData | null = null

    if (qrData) {
      console.log("[Verify Ticket] Processing QR data, length:", qrData.length)
      // Try to parse QR data as JSON with signature first
      let isSignedQR = false
      let bookingId: string | null = null

      try {
        const parsed = JSON.parse(qrData)
        console.log("[Verify Ticket] QR parsed as JSON, has booking_id:", !!parsed.booking_id, "has signature:", !!parsed.signature)
        
        // Check if it has signature and booking_id (signed QR format)
        if (parsed.booking_id && parsed.signature) {
          isSignedQR = true
          
          // Verify signature
          const { signature, ...dataWithoutSignature } = parsed
          const expectedSignature = generateQRSignature(dataWithoutSignature)
          console.log("[Verify Ticket] Verifying signed QR with:", {
            booking_id: dataWithoutSignature.booking_id,
            reference: dataWithoutSignature.reference,
            receivedSignature: signature?.substring(0, 16),
            expectedSignature: expectedSignature?.substring(0, 16),
            match: signature === expectedSignature
          })
          
          if (!verifyQRSignature(dataWithoutSignature, signature)) {
            console.error("[Verify Ticket] Signature verification FAILED")
            console.error("[Verify Ticket] Data signed:", JSON.stringify(dataWithoutSignature).substring(0, 200))
            console.error("[Verify Ticket] Expected sig:", expectedSignature)
            console.error("[Verify Ticket] Received sig:", signature)
            return NextResponse.json({
              status: "error",
              message: "Ugyldig QR-kode - signaturen stemmer ikke",
            })
          }
          
          console.log("[Verify Ticket] Signature verification SUCCESS")
          bookingId = parsed.booking_id
        }
      } catch (parseError) {
        // Not JSON - treat as plain booking reference
        console.log("[Verify Ticket] QR data is not JSON, treating as booking reference:", parseError)
      }

      // If not a signed QR, treat it as a booking reference
      if (!isSignedQR) {
        console.log("[Verify Ticket] QR data treated as booking reference:", qrData)
        bookingReference = qrData.trim().toUpperCase()
      }

      // Get booking by ID or reference
      if (bookingId) {
        console.log("[Verify Ticket] Looking up booking by ID:", bookingId)
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            *,
            show:shows(
              *,
              ensemble:ensembles(*)
            )
          `,
          )
          .eq("id", bookingId)
          .single()

        if (error) {
          console.error("[Verify Ticket] ID lookup error:", error.message)
          return NextResponse.json(
            {
              status: "error",
              message: "Bestilling ikke funnet",
            },
            { status: 404 },
          )
        }

        if (!data) {
          console.error("[Verify Ticket] No booking found with ID:", bookingId)
          return NextResponse.json(
            {
              status: "error",
              message: "Bestilling ikke funnet",
            },
            { status: 404 },
          )
        }

        console.log("[Verify Ticket] Booking found by ID:", data.id, "reference:", data.booking_reference)
        booking = data as BookingData
      } else if (bookingReference) {
        // QR data was not signed JSON, so look up by reference
        console.log("[Verify Ticket] Looking up booking by reference (from QR data):", bookingReference)
        
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            *,
            show:shows(
              *,
              ensemble:ensembles(*)
            )
          `,
          )
          .eq("booking_reference", bookingReference)
          .single()

        if (error) {
          console.error("[Verify Ticket] Reference lookup error:", error.message, "looking for:", bookingReference)
          return NextResponse.json(
            {
              status: "error",
              message: "Bestilling ikke funnet",
            },
            { status: 404 },
          )
        }

        if (!data) {
          console.error("[Verify Ticket] No booking found with reference:", bookingReference)
          return NextResponse.json(
            {
              status: "error",
              message: "Bestilling ikke funnet",
            },
            { status: 404 },
          )
        }

        console.log("[Verify Ticket] Booking found by reference:", data.id, "reference:", data.booking_reference)
        booking = data as BookingData
      }
    } else if (bookingReference) {
      // Manual entry - look up by reference directly
      console.log("[Verify Ticket] Looking up booking by reference (manual entry):", bookingReference)
      
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          show:shows(
            *,
            ensemble:ensembles(*)
          )
        `,
        )
        .eq("booking_reference", bookingReference)
        .single()

      if (error) {
        console.error("[Verify Ticket] Reference lookup error:", error.message, "looking for:", bookingReference)
        return NextResponse.json(
          {
            status: "error",
            message: "Bestilling ikke funnet",
          },
          { status: 404 },
        )
      }

      if (!data) {
        console.error("[Verify Ticket] No booking found with reference:", bookingReference)
        return NextResponse.json(
          {
            status: "error",
            message: "Bestilling ikke funnet",
          },
          { status: 404 },
        )
      }

      console.log("[Verify Ticket] Booking found by reference:", data.id, "reference:", data.booking_reference)
      booking = data as BookingData
    } else {
      console.error("[Verify Ticket] No QR data or booking reference provided")
      return NextResponse.json(
        {
          status: "error",
          message: "QR-data eller referanse kreves",
        },
        { status: 400 },
      )
    }

    if (!booking) {
      return NextResponse.json(
        {
          status: "error",
          message: "Bestilling ikke funnet",
        },
        { status: 404 },
      )
    }

    // Check booking status
    if (booking.status === "cancelled") {
      return NextResponse.json(
        {
          status: "error",
          message: "Denne billetten er avlyst",
        },
        { status: 400 },
      )
    }

    if (booking.status === "refunded") {
      return NextResponse.json(
        {
          status: "error",
          message: "Denne billetten er refundert",
        },
        { status: 400 },
      )
    }

    // Check if already checked in
    const alreadyCheckedIn = booking.status === "used" || !!booking.checked_in_at

    // If not checked in yet, mark as used now so scans are one-time only
    if (!alreadyCheckedIn) {
      try {
        const { error: updateError } = await supabase
          .from("bookings")
          .update({
            status: "used",
            checked_in_at: new Date().toISOString(),
            checked_in_by: user.id,
          })
          .eq("id", booking.id)

        if (updateError) {
          console.error("[Verify Ticket] Failed to mark booking as used:", updateError)
          return NextResponse.json(
            { status: "error", message: "Kunne ikke sjekke inn billett" },
            { status: 500 },
          )
        }

        // reflect the change locally
        booking.status = "used"
      } catch (err) {
        console.error("[Verify Ticket] Error while marking booking used:", err)
        return NextResponse.json({ status: "error", message: "Intern serverfeil" }, { status: 500 })
      }
    }

    // Get seats - they're stored as JSON objects in seat_ids column, not IDs
    const seats = (booking.seat_ids || []).map((seat: any) => ({
      section: seat.section,
      row: seat.row,
      number: seat.number,
    }))

    // Check show date
    const showDate = new Date(booking.show?.show_datetime || new Date())
    const now = new Date()
    const daysDiff = Math.floor((showDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    let statusResponse: "success" | "warning" | "error" = "success"
    let message = "Gyldig billett"

    if (alreadyCheckedIn) {
      statusResponse = "warning"
      message = "Denne billetten er allerede sjekket inn"
    } else if (daysDiff > 0) {
      statusResponse = "warning"
      message = `Forestillingen er om ${daysDiff} dag(er)`
    } else if (daysDiff < 0) {
      statusResponse = "warning"
      message = "Forestillingen har allerede vært"
    }

    const showTitle =
      booking.show?.title || booking.show?.ensemble?.title || "Forestilling"

    return NextResponse.json({
      status: statusResponse,
      message,
      booking: {
        id: booking.id,
        reference: booking.booking_reference,
        customerName: booking.customer_name,
        showTitle,
        showDatetime: booking.show?.show_datetime,
        seats:
          seats?.map((s) => ({
            section: s.section,
            row: s.row,
            number: s.number,
          })) || [],
        specialRequests: booking.special_requests,
        alreadyCheckedIn,
      },
    })
  } catch (error) {
    console.error("Verify ticket error:", error)
    return NextResponse.json(
      {
        status: "error",
        message: "Intern serverfeil",
      },
      { status: 500 },
    )
  }
}
