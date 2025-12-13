import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
  const supabase = await getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { ensembleId, parentId, message } = body

    if (!ensembleId || !parentId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify the relationship exists
    const { data: connection, error: connError } = await supabase
      .from("family_connections")
      .select("enrollment_permission")
      .eq("parent_id", parentId)
      .eq("child_id", user.id)
      .eq("status", "active")
      .single()

    if (connError || !connection) {
      return NextResponse.json(
        { error: "Family connection not found" },
        { status: 404 }
      )
    }

    // Check if blocked
    if (connection.enrollment_permission === "blocked") {
      return NextResponse.json(
        { error: "Enrollment is blocked by parent" },
        { status: 403 }
      )
    }

    // Check for existing request
    const { data: existingRequest } = await supabase
      .from("enrollment_requests")
      .select("id, status")
      .eq("child_id", user.id)
      .eq("parent_id", parentId)
      .eq("ensemble_id", ensembleId)
      .single()

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return NextResponse.json(
          { error: "Request already pending" },
          { status: 400 }
        )
      }
      
      // Update existing rejected request
      const { error: updateError } = await supabase
        .from("enrollment_requests")
        .update({
          status: "pending",
          request_message: message,
          reviewed_at: null,
          reviewed_by_id: null,
        })
        .eq("id", existingRequest.id)

      if (updateError) throw updateError

      return NextResponse.json({
        success: true,
        requestId: existingRequest.id,
      })
    }

    // Create new request
    const { data: newRequest, error: insertError } = await supabase
      .from("enrollment_requests")
      .insert({
        child_id: user.id,
        parent_id: parentId,
        ensemble_id: ensembleId,
        request_message: message,
        status: "pending",
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      requestId: newRequest.id,
    })
  } catch (error: any) {
    console.error("Error creating enrollment request:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// Approve or reject a request
export async function PATCH(request: NextRequest) {
  try {
  const supabase = await getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { requestId, action } = body // action: 'approve' or 'reject'

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Get the request
    const { data: enrollmentRequest, error: fetchError } = await supabase
      .from("enrollment_requests")
      .select("*, child:users!enrollment_requests_child_id_fkey(full_name, email)")
      .eq("id", requestId)
      .eq("parent_id", user.id)
      .single()

    if (fetchError || !enrollmentRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    if (action === "approve") {
      // Create ensemble enrollment for the child
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/ensemble/enroll`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({
            ensembleId: enrollmentRequest.ensemble_id,
            childUserIds: [enrollmentRequest.child_id],
            enrollSelf: false,
            customerName: enrollmentRequest.child.full_name,
            customerEmail: enrollmentRequest.child.email,
            registeredByParent: true,
          }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to create enrollment")
      }

      // Update request status
      await supabase
        .from("enrollment_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by_id: user.id,
        })
        .eq("id", requestId)

      return NextResponse.json({ success: true, action: "approved" })
    } else if (action === "reject") {
      // Just update the status
      await supabase
        .from("enrollment_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by_id: user.id,
        })
        .eq("id", requestId)

      return NextResponse.json({ success: true, action: "rejected" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Error processing enrollment request:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
