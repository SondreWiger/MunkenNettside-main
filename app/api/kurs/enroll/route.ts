import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server"
import { generateBookingReference } from "@/lib/utils/booking"

export async function POST(request: NextRequest) {
  console.log("[kurs-enroll] ========== KURS ENROLLMENT START ==========")

  try {
    const body = await request.json()
    const { kursId, customerName, customerEmail, customerPhone, specialRequests, totalAmount, discountCode } = body

    console.log("[kurs-enroll] Full request body:", JSON.stringify(body, null, 2))
    console.log("[kurs-enroll] Enrollment request received:")
    console.log("[kurs-enroll]   kursId:", kursId)
    console.log("[kurs-enroll]   customerName:", customerName)
    console.log("[kurs-enroll]   customerEmail:", customerEmail)
    console.log("[kurs-enroll]   totalAmount:", totalAmount)
    console.log("[kurs-enroll]   discountCode:", discountCode)

    if (!kursId || !customerName || !customerEmail || typeof totalAmount !== "number" || totalAmount < 0) {
      console.error("[kurs-enroll] Validation failed:")
      console.error("[kurs-enroll]   kursId:", kursId, "truthy:", !!kursId, "type:", typeof kursId)
      console.error("[kurs-enroll]   customerName:", customerName, "truthy:", !!customerName, "type:", typeof customerName)
      console.error("[kurs-enroll]   customerEmail:", customerEmail, "truthy:", !!customerEmail, "type:", typeof customerEmail)
      console.error("[kurs-enroll]   totalAmount:", totalAmount, "is number:", typeof totalAmount === "number", "gte 0:", totalAmount >= 0)
      return NextResponse.json({ error: "Manglende påkrevde felt" }, { status: 400 })
    }

    // Get current user from regular server client (has session context)
    const serverClient = await getSupabaseServerClient()
    const {
      data: { user },
    } = await serverClient.auth.getUser()

    if (!user?.id) {
      console.log("[kurs-enroll] Authentication failed - no user")
      return NextResponse.json(
        { error: "Du må være logget inn for å melde deg på kurs" },
        { status: 401 }
      )
    }

    console.log("[kurs-enroll] Enrollment for user:", user.id)

    // Use admin client for database operations (bypasses RLS)
    const supabase = await getSupabaseAdminClient()

    // Get kurs details
    const { data: kurs, error: kursError } = await supabase
      .from("kurs")
      .select("*")
      .eq("id", kursId)
      .single()

    if (kursError || !kurs) {
      console.error("[kurs-enroll] Kurs error:", kursError)
      return NextResponse.json({ error: "Kurs ikke funnet" }, { status: 404 })
    }

    console.log("[kurs-enroll] Kurs found:", kurs.id)

    // Check if kurs is full
    if (kurs.current_participants >= kurs.max_participants) {
      console.error("[kurs-enroll] Kurs is full")
      return NextResponse.json({ error: "Kurset er fullt" }, { status: 400 })
    }

    // Check if user is already enrolled
    const { data: existingEnrollment } = await supabase
      .from("kurs_enrollments")
      .select("*")
      .eq("user_id", user.id)
      .eq("kurs_id", kursId)
      .eq("status", "confirmed")
      .single()

    if (existingEnrollment) {
      console.error("[kurs-enroll] User already enrolled")
      return NextResponse.json({ error: "Du er allerede påmeldt dette kurset" }, { status: 400 })
    }

    // Generate enrollment reference
    const enrollmentReference = generateBookingReference()
    console.log("[kurs-enroll] Generated enrollment reference:", enrollmentReference)

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

    // Create enrollment record
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("kurs_enrollments")
      .insert({
        user_id: user.id,
        kurs_id: kursId,
        amount_paid_nok: totalAmount,
        enrollment_reference: enrollmentReference,
        status: "confirmed", // Mock payment - directly confirmed
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (enrollmentError || !enrollment) {
      console.error("[kurs-enroll] Enrollment creation error:", enrollmentError)
      return NextResponse.json(
        { error: "Kunne ikke opprette påmelding" },
        { status: 500 }
      )
    }

    console.log("[kurs-enroll] Enrollment created:", enrollment.id)

    // Increment current_participants count
    await supabase
      .from("kurs")
      .update({ current_participants: kurs.current_participants + 1 })
      .eq("id", kursId)

    console.log("[kurs-enroll] Updated participant count")

    // TODO: Send confirmation email
    console.log("[kurs-enroll] TODO: Send confirmation email to", customerEmail)

    console.log("[kurs-enroll] ========== KURS ENROLLMENT SUCCESS ==========")
    return NextResponse.json(
      {
        success: true,
        enrollmentId: enrollment.id,
        enrollmentReference: enrollmentReference,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("[kurs-enroll] Error:", err)
    return NextResponse.json(
      { error: "Noe gikk galt ved påmelding" },
      { status: 500 }
    )
  }
}
