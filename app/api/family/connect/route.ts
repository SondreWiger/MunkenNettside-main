import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== "string" || code.length !== 8) {
      return NextResponse.json(
        { error: "Invalid connection code format" },
        { status: 400 }
      )
    }

    // Get the user's session
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

    // Use service role for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Check if the current user is a kid account
    const { data: childUser, error: childError } = await supabaseAdmin
      .from("users")
      .select("id, account_type, full_name")
      .eq("id", user.id)
      .single()

    if (childError || !childUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (childUser.account_type !== "kid") {
      return NextResponse.json(
        { error: "Only kid accounts can connect to parent accounts" },
        { status: 403 }
      )
    }

    // Find the parent with this code
    const { data: parentUser, error: parentError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, family_connection_code, family_code_expires_at, account_type")
      .eq("family_connection_code", code.toUpperCase())
      .single()

    if (parentError || !parentUser) {
      return NextResponse.json(
        { error: "Invalid connection code" },
        { status: 404 }
      )
    }

    // Check if code is expired
    if (
      parentUser.family_code_expires_at &&
      new Date(parentUser.family_code_expires_at) < new Date()
    ) {
      return NextResponse.json(
        { error: "This connection code has expired" },
        { status: 400 }
      )
    }

    // Check that the code belongs to a parent account
    if (parentUser.account_type !== "parent") {
      return NextResponse.json(
        { error: "Invalid connection code" },
        { status: 400 }
      )
    }

    // Check if connection already exists
    const { data: existingConnection, error: connCheckError } = await supabaseAdmin
      .from("family_connections")
      .select("id, status")
      .eq("parent_id", parentUser.id)
      .eq("child_id", user.id)
      .maybeSingle()

    if (existingConnection) {
      if (existingConnection.status === "active") {
        return NextResponse.json(
          { error: "You are already connected to this parent" },
          { status: 400 }
        )
      } else {
        // Reactivate the connection
        const { error: updateError } = await supabaseAdmin
          .from("family_connections")
          .update({
            status: "active",
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingConnection.id)

        if (updateError) {
          console.error("Error reactivating connection:", updateError)
          return NextResponse.json(
            { error: "Failed to reconnect" },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          parentName: parentUser.full_name,
          message: "Successfully reconnected to parent account",
        })
      }
    }

    // Create new connection
    const { error: insertError } = await supabaseAdmin
      .from("family_connections")
      .insert({
        parent_id: parentUser.id,
        child_id: user.id,
        status: "active",
        connected_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error("Error creating connection:", insertError)
      return NextResponse.json(
        { error: "Failed to create connection" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      parentName: parentUser.full_name,
      message: "Successfully connected to parent account",
    })
  } catch (error) {
    console.error("Error connecting to parent:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
