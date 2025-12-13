import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server"
import { sendEnrollmentEmail, sendEnrollmentConfirmationToBothParentAndChild } from "@/lib/email/send-ensemble-enrollment-email"

/**
 * PUT /api/enrollments/[enrollmentId]/status
 * Update enrollment status and send appropriate notification emails
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  const { enrollmentId } = await params
  console.log("[enrollment-status] ========== ENROLLMENT STATUS UPDATE START ==========")
  console.log("[enrollment-status] Updating enrollment:", enrollmentId)

  try {
    const body = await request.json()
    const { newStatus } = body

    if (!newStatus) {
      return NextResponse.json({ error: "newStatus is required" }, { status: 400 })
    }

    // Get current user (must be admin)
    const serverClient = await getSupabaseServerClient()
    const { data: { user } } = await serverClient.auth.getUser()

    if (!user?.id) {
      console.log("[enrollment-status] Authentication failed - no user")
      return NextResponse.json(
        { error: "Du må være logget inn" },
        { status: 401 }
      )
    }

    // Use admin client for database operations
    const supabase = await getSupabaseAdminClient()

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminUser?.role !== 'admin') {
      console.error("[enrollment-status] User is not admin")
      return NextResponse.json(
        { error: "Du har ikke tilgang" },
        { status: 403 }
      )
    }

    // Get current enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('ensemble_enrollments')
      .select(`
        id,
        user_id,
        registered_by_user_id,
        ensemble_id,
        status,
        enrollment_reference
      `)
      .eq('id', enrollmentId)
      .single()

    if (enrollmentError || !enrollment) {
      console.error("[enrollment-status] Enrollment not found:", enrollmentError)
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 })
    }

    console.log("[enrollment-status] Current enrollment status:", enrollment.status)
    console.log("[enrollment-status] New enrollment status:", newStatus)

    // Update enrollment status and mark notification unread for recipient
    const { data: updatedEnrollment, error: updateError } = await supabase
      .from('ensemble_enrollments')
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by_id: user.id,
        notification_read: false,
      })
      .eq('id', enrollmentId)
      .select()
      .single()

    if (updateError || !updatedEnrollment) {
      console.error("[enrollment-status] Update failed:", updateError)
      return NextResponse.json(
        { error: "Kunne ikke oppdatere påmelding" },
        { status: 500 }
      )
    }

    // Get ensemble info
    const { data: ensemble } = await supabase
      .from('ensembles')
      .select('title')
      .eq('id', enrollment.ensemble_id)
      .single()

    // Get user info
    const { data: enrolledUser } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', enrollment.user_id)
      .single()

    // Send appropriate email based on new status
    if (newStatus === 'confirmed' || newStatus === 'yellow' || newStatus === 'blue') {
      console.log("[enrollment-status] Sending acceptance email...")

      if (enrollment.registered_by_user_id) {
        // Get parent info
        const { data: parentUser } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', enrollment.registered_by_user_id)
          .single()

        if (parentUser && enrolledUser && ensemble) {
          // Send to both parent and child
          const emailResult = await sendEnrollmentConfirmationToBothParentAndChild(
            parentUser.email,
            parentUser.full_name,
            enrolledUser.email,
            enrolledUser.full_name,
            ensemble.title,
            enrollment.enrollment_reference,
            newStatus
          )

          if (!emailResult.parentSuccess || !emailResult.childSuccess) {
            console.warn("[enrollment-status] Email sending had issues:", emailResult.errors)
          }
        }
      } else if (enrolledUser && ensemble) {
        // Send to user
        const emailResult = await sendEnrollmentEmail({
          recipientEmail: enrolledUser.email,
          recipientName: enrolledUser.full_name,
          ensembleTitle: ensemble.title,
          enrollmentReference: enrollment.enrollment_reference,
          enrollmentStatus: newStatus,
        })

        if (!emailResult.success) {
          console.warn("[enrollment-status] Email sending failed:", emailResult.error)
        }
      }
    } else if (newStatus === 'payment_pending') {
      console.log("[enrollment-status] Payment pending - no email sent")
    }

    console.log("[enrollment-status] ========== ENROLLMENT STATUS UPDATE SUCCESS ==========")

    return NextResponse.json({
      success: true,
      enrollment: updatedEnrollment,
    })
  } catch (error) {
    console.error("[enrollment-status] Error:", error)
    return NextResponse.json(
      { error: "Noe gikk galt ved oppdatering av påmelding" },
      { status: 500 }
    )
  }
}
