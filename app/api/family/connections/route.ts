import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET - Fetch family connections for the current user
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get user's account type
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("account_type, family_connection_code, family_code_expires_at")
      .eq("id", user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let children: any[] = []
    let parents: any[] = []

    // If parent, get connected children
    if (userData.account_type === "parent") {
      const { data: childConnections, error: childError } = await supabaseAdmin
        .from("family_connections")
        .select("id, status, connected_at, child_id")
        .eq("parent_id", user.id)
        .eq("status", "active")

      if (!childError && childConnections) {
        // Fetch child details separately
        for (const conn of childConnections) {
          const { data: childData } = await supabaseAdmin
            .from("users")
            .select("id, full_name, email, avatar_url, date_of_birth")
            .eq("id", conn.child_id)
            .single()

          if (childData) {
            children.push({
              connectionId: conn.id,
              connectedAt: conn.connected_at,
              ...childData,
            })
          }
        }
      }
    }

    // If kid, get connected parents
    if (userData.account_type === "kid") {
      const { data: parentConnections, error: parentError } = await supabaseAdmin
        .from("family_connections")
        .select("id, status, connected_at, parent_id")
        .eq("child_id", user.id)
        .eq("status", "active")

      if (!parentError && parentConnections) {
        // Fetch parent details separately
        for (const conn of parentConnections) {
          const { data: parentData } = await supabaseAdmin
            .from("users")
            .select("id, full_name, email, avatar_url")
            .eq("id", conn.parent_id)
            .single()

          if (parentData) {
            parents.push({
              connectionId: conn.id,
              connectedAt: conn.connected_at,
              ...parentData,
            })
          }
        }
      }
    }

    return NextResponse.json({
      accountType: userData.account_type,
      connectionCode: userData.family_connection_code,
      codeExpiresAt: userData.family_code_expires_at,
      children,
      parents,
    })
  } catch (error) {
    console.error("Error fetching connections:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Remove a family connection
export async function DELETE(request: NextRequest) {
  try {
    // Get connectionId from query params
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get("id")

    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user owns this connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from("family_connections")
      .select("id, parent_id, child_id")
      .eq("id", connectionId)
      .single()

    if (connError || !connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      )
    }

    // Only parent or child can remove the connection
    if (connection.parent_id !== user.id && connection.child_id !== user.id) {
      return NextResponse.json(
        { error: "You cannot remove this connection" },
        { status: 403 }
      )
    }

    // Update status to 'removed' instead of deleting
    const { error: updateError } = await supabaseAdmin
      .from("family_connections")
      .update({
        status: "removed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId)

    if (updateError) {
      console.error("Error removing connection:", updateError)
      return NextResponse.json(
        { error: "Failed to remove connection" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Connection removed successfully",
    })
  } catch (error) {
    console.error("Error removing connection:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}
