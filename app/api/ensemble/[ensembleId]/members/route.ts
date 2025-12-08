import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ensembleId: string }> }
) {
  try {
    const { ensembleId } = await params
    const supabase = await getSupabaseServerClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get pending enrollments
    const { data: pendingEnrollments } = await supabase
      .from("ensemble_enrollments")
      .select("id, user_id, ensemble_id, status, enrolled_at, users(full_name, email, slug)")
      .eq("ensemble_id", ensembleId)
      .order("enrolled_at", { ascending: false })

    // Get approved team members
    const { data: teamMembers } = await supabase
      .from("ensemble_team_members")
      .select("id, user_id, team, role, position_order, users(full_name, slug)")
      .eq("ensemble_id", ensembleId)
      .order("team")
      .order("position_order")

    return NextResponse.json({
      pendingEnrollments,
      teamMembers,
    })
  } catch (error) {
    console.error("Error fetching enrollments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ensembleId: string }> }
) {
  try {
    const { ensembleId } = await params
    const body = await request.json()
    const { action, enrollmentId, userId, team, role } = body

    const supabase = await getSupabaseServerClient()

    // Get authenticated user and check if admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (action === "approve") {
      // Move user to team member
      // First update enrollment to approved
      await supabase
        .from("ensemble_enrollments")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by_id: user.id,
        })
        .eq("id", enrollmentId)

      // Create team member record if team and role provided
      if (team && role) {
        const { error } = await supabase
          .from("ensemble_team_members")
          .insert({
            ensemble_id: ensembleId,
            user_id: userId,
            team,
            role,
          })

        if (error) {
          return NextResponse.json(
            { error: "Failed to add team member" },
            { status: 500 }
          )
        }
      }

      return NextResponse.json({ success: true })
    } else if (action === "reject") {
      // Reject enrollment
      await supabase
        .from("ensemble_enrollments")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by_id: user.id,
        })
        .eq("id", enrollmentId)

      return NextResponse.json({ success: true })
    } else if (action === "updateTeamMember") {
      // Update team member (role, team, position)
      const { teamMemberId, newTeam, newRole, newPosition } = body

      const updateData: any = {}
      if (newRole) updateData.role = newRole
      if (newTeam) updateData.team = newTeam
      if (newPosition !== undefined) updateData.position_order = newPosition

      const { error } = await supabase
        .from("ensemble_team_members")
        .update(updateData)
        .eq("id", teamMemberId)

      if (error) {
        return NextResponse.json(
          { error: "Failed to update team member" },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    } else if (action === "removeTeamMember") {
      // Remove team member
      const { teamMemberId } = body

      await supabase
        .from("ensemble_team_members")
        .delete()
        .eq("id", teamMemberId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error managing enrollments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
