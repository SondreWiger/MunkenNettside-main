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
    const { action, enrollmentId, userId, team, role, userFullName } = body

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

    if (action === "quickApprove") {
      // Streamlined approval process that handles everything in one go
      
      // First, update enrollment to approved
      await supabase
        .from("ensemble_enrollments")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by_id: user.id,
        })
        .eq("id", enrollmentId)

      // Check if user already has an actor profile
      let actorId
      const { data: existingActor } = await supabase
        .from("actors")
        .select("id")
        .eq("user_id", userId)
        .single()

      if (existingActor) {
        actorId = existingActor.id
      } else {
        // Create actor profile for user if they don't have one
        const { data: newActor, error: actorError } = await supabase
          .from("actors")
          .insert({
            name: userFullName,
            user_id: userId,
            bio: `Skuespiller i ensemble`,
          })
          .select("id")
          .single()

        if (actorError) {
          console.error("Error creating actor:", actorError)
        } else {
          actorId = newActor.id

          // Update user's actor_id reference
          await supabase
            .from("users")
            .update({ actor_id: actorId })
            .eq("id", userId)
        }
      }

      // Create team member record
      const { data: teamMember, error: teamError } = await supabase
        .from("ensemble_team_members")
        .insert({
          ensemble_id: ensembleId,
          user_id: userId,
          team,
          role,
        })
        .select("id")
        .single()

      if (teamError) {
        return NextResponse.json(
          { error: "Failed to add team member" },
          { status: 500 }
        )
      }

      // If role is a character name (not generic like "Medlem"), create a role entry
      if (role && !["Medlem", "Crew", "Ensemble"].includes(role) && actorId) {
        const { data: existingRole } = await supabase
          .from("roles")
          .select("id, yellow_actor_id, blue_actor_id")
          .eq("ensemble_id", ensembleId)
          .eq("character_name", role)
          .single()

        if (existingRole) {
          // Update existing role with the new actor assignment
          const updateField = team === "yellow" ? "yellow_actor_id" : "blue_actor_id"
          await supabase
            .from("roles")
            .update({ [updateField]: actorId })
            .eq("id", existingRole.id)
        } else {
          // Create new role
          const roleData: any = {
            ensemble_id: ensembleId,
            character_name: role,
            description: `Rolle spillet av ${userFullName}`,
            importance: role.includes("Hovedrolle") ? "lead" : "supporting",
          }
          
          if (team === "yellow") {
            roleData.yellow_actor_id = actorId
          } else {
            roleData.blue_actor_id = actorId
          }

          await supabase
            .from("roles")
            .insert(roleData)
        }
      }

      return NextResponse.json({ 
        success: true, 
        teamMemberId: teamMember.id,
        actorCreated: !existingActor,
      })
    } else if (action === "approve") {
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
