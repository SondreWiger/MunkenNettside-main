import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { verifyQRSignature } from "@/lib/utils/booking"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { qrData, bookingReference } = body

    console.log("[Verify Ticket] Received request with:", { 
      hasQrData: !!qrData, 
      bookingReference,
      qrDataLength: qrData?.length,
      qrDataPreview: qrData?.substring(0, 100)
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
      // Try to parse QR data as JSON with signature first
      let isSignedQR = false
      let bookingId: string | null = null

      try {
        const parsed = JSON.parse(qrData)
        
        // Check if it has signature and booking_id (signed QR format)
        if (parsed.booking_id && parsed.signature) {
          isSignedQR = true
          
          // Verify signature
          const { signature, ...dataWithoutSignature } = parsed
          console.log("[Verify Ticket] Verifying signed QR with:", {
            booking_id: dataWithoutSignature.booking_id,
            reference: dataWithoutSignature.reference,
            hasSignature: !!signature,
            signaturePreview: signature?.substring(0, 16)
          })
          
          if (!verifyQRSignature(dataWithoutSignature, signature)) {
            console.error("[Verify Ticket] Signature verification FAILED for booking:", dataWithoutSignature.booking_id)
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
        console.log("QR data is not JSON, treating as booking reference:", parseError)
      }

      // If not a signed QR, treat it as a booking reference
      if (!isSignedQR) {
        console.log("[Verify Ticket] QR data treated as booking reference:", qrData)
        bookingReference = qrData.trim().toUpperCase()
      }

      // Get booking by ID or reference
      if (bookingId) {
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

        if (error || !data) {
          return NextResponse.json(
            {
              status: "error",
              message: "Bestilling ikke funnet",
            },
            { status: 404 },
          )
        }

        booking = data as BookingData
      }
    } else if (bookingReference) {
      // Look up by reference
      console.log("[Verify Ticket] Looking up booking by reference:", bookingReference)
      
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

      console.log("[Verify Ticket] Query result:", { 
        found: !!data, 
        error: error?.message,
        dataId: data?.id
      })

      if (error || !data) {
        return NextResponse.json(
          {
            status: "error",
            message: "Bestilling ikke funnet",
          },
          { status: 404 },
        )
      }

      booking = data as BookingData
    } else {
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
