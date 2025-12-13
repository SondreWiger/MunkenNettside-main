import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server"
import { sendEnrollmentEmail, sendEnrollmentConfirmationToBothParentAndChild } from "@/lib/email/send-ensemble-enrollment-email"

/**
 * POST /api/enrollments/[enrollmentId]/payment-confirmed
 * Mark payment as confirmed and send notification email to parent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  const { enrollmentId } = await params
  console.log("[enrollment-payment] ========== PAYMENT CONFIRMATION START ==========")
  console.log("[enrollment-payment] Confirming payment for enrollment:", enrollmentId)

  try {
    // Get current user (must be admin or payment webhook)
    const serverClient = await getSupabaseServerClient()
    const { data: { user } } = await serverClient.auth.getUser()

    // Admin check is optional - payment webhooks might not have user context
    if (user?.id) {
      const supabaseTemp = await getSupabaseAdminClient()
      const { data: adminUser } = await supabaseTemp
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (adminUser?.role !== 'admin') {
        console.error("[enrollment-payment] User is not admin")
        return NextResponse.json(
          { error: "Du har ikke tilgang" },
          { status: 403 }
        )
      }
    }

    const supabase = await getSupabaseAdminClient()

    // Get enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('ensemble_enrollments')
      .select(`
        id,
        user_id,
        registered_by_user_id,
        ensemble_id,
        status,
        enrollment_reference,
        amount_paid_nok
      `)
      .eq('id', enrollmentId)
      .single()

    if (enrollmentError || !enrollment) {
      console.error("[enrollment-payment] Enrollment not found:", enrollmentError)
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 })
    }

    console.log("[enrollment-payment] Found enrollment:", enrollment.id)

    // Update enrollment to mark payment as completed and set notification as unread
    const { data: updatedEnrollment, error: updateError } = await supabase
      .from('ensemble_enrollments')
      .update({
        payment_completed_at: new Date().toISOString(),
        notification_read: false,
      })
      .eq('id', enrollmentId)
      .select()
      .single()

    if (updateError || !updatedEnrollment) {
      console.error("[enrollment-payment] Update failed:", updateError)
      return NextResponse.json(
        { error: "Kunne ikke oppdatere betalingsstatus" },
        { status: 500 }
      )
    }

    console.log("[enrollment-payment] Payment marked as completed")

    // Get ensemble and user info
    const { data: ensemble } = await supabase
      .from('ensembles')
      .select('title')
      .eq('id', enrollment.ensemble_id)
      .single()

    const { data: enrolledUser } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', enrollment.user_id)
      .single()

    // Send payment confirmation email
    if (enrollment.registered_by_user_id) {
      // Get parent info
      const { data: parentUser } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', enrollment.registered_by_user_id)
        .single()

      if (parentUser && enrolledUser && ensemble) {
        console.log("[enrollment-payment] Sending payment confirmation to parent:", parentUser.email)

        // Send to parent with info that payment is confirmed
        const emailResult = await sendEnrollmentConfirmationToBothParentAndChild(
          parentUser.email,
          parentUser.full_name,
          enrolledUser.email,
          enrolledUser.full_name,
          ensemble.title,
          enrollment.enrollment_reference,
          'payment_completed'
        )

        if (!emailResult.parentSuccess || !emailResult.childSuccess) {
          console.warn("[enrollment-payment] Email sending had issues:", emailResult.errors)
        }
      }
    } else if (enrolledUser && ensemble) {
      console.log("[enrollment-payment] Sending payment confirmation to user:", enrolledUser.email)

      // Send to user
      const emailResult = await sendEnrollmentEmail({
        recipientEmail: enrolledUser.email,
        recipientName: enrolledUser.full_name,
        ensembleTitle: ensemble.title,
        enrollmentReference: enrollment.enrollment_reference,
        enrollmentStatus: 'payment_completed',
      })

      if (!emailResult.success) {
        console.warn("[enrollment-payment] Email sending failed:", emailResult.error)
      }
    }

    console.log("[enrollment-payment] ========== PAYMENT CONFIRMATION SUCCESS ==========")

    return NextResponse.json({
      success: true,
      enrollment: updatedEnrollment,
    })
  } catch (error) {
    console.error("[enrollment-payment] Error:", error)
    return NextResponse.json(
      { error: "Noe gikk galt ved betalingsbekrefting" },
      { status: 500 }
    )
  }
}
