import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server"
import { sendEnrollmentEmail, sendEnrollmentConfirmationToBothParentAndChild } from "@/lib/email/send-ensemble-enrollment-email"

export async function POST(request: NextRequest) {
  console.log("[ensemble-enroll] ========== ENSEMBLE ENROLLMENT START ==========")

  try {
    const body = await request.json()
    const { ensembleId, customerName, customerEmail, customerPhone, totalAmount, childUserId, childUserIds, enrollSelf } = body

    console.log("[ensemble-enroll] Full request body:", JSON.stringify(body, null, 2))
    console.log("[ensemble-enroll] Enrollment request received:")
    console.log("[ensemble-enroll]   ensembleId:", ensembleId)
    console.log("[ensemble-enroll]   customerName:", customerName)
    console.log("[ensemble-enroll]   customerEmail:", customerEmail)
    console.log("[ensemble-enroll]   totalAmount:", totalAmount)
    console.log("[ensemble-enroll]   childUserId:", childUserId)
    console.log("[ensemble-enroll]   childUserIds:", childUserIds)
    console.log("[ensemble-enroll]   enrollSelf:", enrollSelf)

    if (!ensembleId || !customerName || !customerEmail) {
      console.error("[ensemble-enroll] Validation failed - missing required fields")
      return NextResponse.json({ error: "Manglende påkrevde felt" }, { status: 400 })
    }
    
    // Validate and normalize totalAmount
    const normalizedAmount = typeof totalAmount === 'number' ? totalAmount : (totalAmount ? Number(totalAmount) : 0)
    if (isNaN(normalizedAmount) || normalizedAmount < 0) {
      console.error("[ensemble-enroll] Validation failed - invalid amount:", totalAmount)
      return NextResponse.json({ error: "Manglende påkrevde felt" }, { status: 400 })
    }

    // Get current user from regular server client (has session context)
    const serverClient = await getSupabaseServerClient()
    const {
      data: { user },
    } = await serverClient.auth.getUser()

    if (!user?.id) {
      console.log("[ensemble-enroll] Authentication failed - no user")
      return NextResponse.json(
        { error: "Du må være logget inn for å melde deg på ensemble" },
        { status: 401 }
      )
    }

    console.log("[ensemble-enroll] Enrollment for user:", user.id)

    // Use admin client for database operations (bypasses RLS)
    const supabase = await getSupabaseAdminClient()

    // Get ensemble details
    const { data: ensemble, error: ensembleError } = await supabase
      .from("ensembles")
      .select("*")
      .eq("id", ensembleId)
      .single()

    if (ensembleError || !ensemble) {
      console.error("[ensemble-enroll] Ensemble error:", ensembleError)
      return NextResponse.json({ error: "Ensemble ikke funnet" }, { status: 404 })
    }

    console.log("[ensemble-enroll] Ensemble found:", ensemble.id)

    // Check if ensemble is open for enrollment
    if (ensemble.stage !== "Påmelding") {
      console.error("[ensemble-enroll] Ensemble not open for enrollment")
      return NextResponse.json({ error: "Ensemblet er ikke åpent for påmelding" }, { status: 400 })
    }

    // If participation is free, directly confirm enrollment
    const numAmount = normalizedAmount
    const isFree = numAmount === 0
    // TEMPORARY: Using 'pending' status for all enrollments until database constraint is fixed to include 'payment_pending'
    // TODO: Once database is updated with correct constraint, use: const status = isFree ? "pending" : "payment_pending"
    const status = "pending"

    console.log("[ensemble-enroll] Amount check - totalAmount:", totalAmount, "numAmount:", numAmount, "isFree:", isFree, "status:", status)

    // Determine users to enroll (self and/or children)
    const usersToEnroll: Array<{userId: string, isChild: boolean}> = []
    
    // Enroll self if explicitly requested (default true for backward compatibility)
    if (enrollSelf !== false && !childUserIds && !childUserId) {
      usersToEnroll.push({ userId: user.id, isChild: false })
    } else if (enrollSelf === true) {
      usersToEnroll.push({ userId: user.id, isChild: false })
    }
    
    // Add selected children if any
    if (childUserIds && Array.isArray(childUserIds) && childUserIds.length > 0) {
      childUserIds.forEach((childId: string) => {
        usersToEnroll.push({ userId: childId, isChild: true })
      })
    } else if (childUserId) {
      // Backward compatibility for single child
      usersToEnroll.push({ userId: childUserId, isChild: true })
    }

    if (usersToEnroll.length === 0) {
      return NextResponse.json({ error: "Ingen brukere valgt for påmelding" }, { status: 400 })
    }

    console.log("[ensemble-enroll] Enrolling users:", usersToEnroll)

    const createdEnrollments: any[] = []

    // Create enrollment for each user
    for (const enrollee of usersToEnroll) {
      // Check enrollment permission for child accounts
      if (enrollee.isChild) {
        // Get the user's account type and check if they're actually a child
        const { data: childProfile } = await supabase
          .from("users")
          .select("account_type")
          .eq("id", enrollee.userId)
          .single()

        if (childProfile?.account_type === 'kid') {
          // Check the enrollment permission from family_connections
          const { data: familyConnection } = await supabase
            .from("family_connections")
            .select("enrollment_permission")
            .eq("child_id", enrollee.userId)
            .eq("parent_id", user.id)
            .single()

          if (!familyConnection) {
            console.log(`[ensemble-enroll] No family connection found for child ${enrollee.userId}, skipping`)
            continue
          }

          // If permission is 'blocked', deny enrollment
          if (familyConnection.enrollment_permission === 'blocked') {
            console.log(`[ensemble-enroll] Child ${enrollee.userId} is blocked from enrollment, skipping`)
            continue
          }

          // If permission is 'request', they should use the enrollment request system instead
          if (familyConnection.enrollment_permission === 'request') {
            console.log(`[ensemble-enroll] Child ${enrollee.userId} requires approval, skipping direct enrollment`)
            continue
          }

          // Only 'allowed' permission gets through here
        }
      }

      // Check if user enrolling themselves is a child with restricted permissions
      if (!enrollee.isChild && enrollee.userId === user.id) {
        const { data: userProfile } = await supabase
          .from("users")
          .select("account_type")
          .eq("id", user.id)
          .single()

        if (userProfile?.account_type === 'kid') {
          // Child trying to enroll themselves - check their permission
          const { data: familyConnection } = await supabase
            .from("family_connections")
            .select("enrollment_permission, parent_id")
            .eq("child_id", user.id)
            .maybeSingle()

          if (familyConnection) {
            if (familyConnection.enrollment_permission === 'blocked') {
              console.log(`[ensemble-enroll] User ${user.id} is blocked from self-enrollment`)
              return NextResponse.json(
                { error: "Du kan ikke melde deg på selv på grunn av dine foreldretillatelser" },
                { status: 403 }
              )
            }

            if (familyConnection.enrollment_permission === 'request') {
              console.log(`[ensemble-enroll] User ${user.id} needs parental approval for enrollment`)
              return NextResponse.json(
                { error: "Du må be om tillatelse fra din foresatt for å melde deg på" },
                { status: 403 }
              )
            }
          }
        }
      }

      const enrollmentReference = `ENRL-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      
      // Check if this user is already enrolled
      const { data: existingEnrollment } = await supabase
        .from("ensemble_enrollments")
        .select("id")
        .eq("user_id", enrollee.userId)
        .eq("ensemble_id", ensembleId)
        .in("status", ["pending", "confirmed", "yellow", "blue", "payment_pending"])
        .maybeSingle()

      if (existingEnrollment) {
        console.log(`[ensemble-enroll] User ${enrollee.userId} already enrolled, skipping`)
        continue
      }

      // Create enrollment record
      const enrollmentData: any = {
        user_id: enrollee.userId,
        ensemble_id: ensembleId,
        status: status,
        enrollment_reference: enrollmentReference,
      }
      
      // If this is a child enrollment, record the parent ID
      if (enrollee.isChild) {
        enrollmentData.registered_by_user_id = user.id
      }
      
      // Only add amount if greater than 0
      if (totalAmount > 0) {
        enrollmentData.amount_paid_nok = totalAmount
      }

      console.log("[ensemble-enroll] Inserting enrollment with data:", JSON.stringify(enrollmentData, null, 2))

      const { data: enrollment, error: enrollmentError } = await supabase
        .from("ensemble_enrollments")
        .insert([enrollmentData])
        .select()

      if (enrollmentError || !enrollment || enrollment.length === 0) {
        console.error("[ensemble-enroll] Enrollment creation error:", enrollmentError)
        continue
      }

      const createdEnrollment = enrollment[0]
      createdEnrollments.push({...createdEnrollment, isChild: enrollee.isChild, userId: enrollee.userId})
      console.log("[ensemble-enroll] Enrollment created:", createdEnrollment.id)
    }

    if (createdEnrollments.length === 0) {
      return NextResponse.json(
        { error: "Kunne ikke opprette påmelding" },
        { status: 500 }
      )
    }

    // Send confirmation emails
    console.log("[ensemble-enroll] Sending confirmation emails...")
    
    for (const enrollment of createdEnrollments) {
      if (enrollment.isChild) {
        // Parent enrolling child - send to both parent and child
        console.log("[ensemble-enroll] Sending emails for child enrollment:", enrollment.userId)
        
        const { data: parentUser } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', user.id)
          .single()

        const { data: childUser } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', enrollment.userId)
          .single()

        if (parentUser && childUser) {
          await sendEnrollmentConfirmationToBothParentAndChild(
            parentUser.email,
            parentUser.full_name,
            childUser.email,
            childUser.full_name,
            ensemble.title,
            enrollment.enrollment_reference,
            status
          )
        }
      } else {
        // User enrolling themselves
        console.log("[ensemble-enroll] Sending email for self enrollment")
        
        await sendEnrollmentEmail({
          recipientEmail: customerEmail,
          recipientName: customerName,
          ensembleTitle: ensemble.title,
          enrollmentReference: enrollment.enrollment_reference,
          enrollmentStatus: status,
        })
      }
    }

    console.log("[ensemble-enroll] ========== ENSEMBLE ENROLLMENT SUCCESS ==========")
    return NextResponse.json(
      {
        success: true,
        enrollmentId: createdEnrollments[0].id,
        enrollmentReference: createdEnrollments[0].enrollment_reference,
        requiresPayment: !isFree,
        totalEnrollments: createdEnrollments.length,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("[ensemble-enroll] Error:", err)
    return NextResponse.json(
      { error: "Noe gikk galt ved påmelding" },
      { status: 500 }
    )
  }
}
