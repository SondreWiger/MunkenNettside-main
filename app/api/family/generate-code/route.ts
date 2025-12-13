import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Generate a random 8-character alphanumeric code
function generateConnectionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Excluded confusing chars like 0, O, 1, I
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
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

    // Check if user is a parent account
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("account_type, family_connection_code, family_code_expires_at")
      .eq("id", user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (userData.account_type !== "parent") {
      return NextResponse.json(
        { error: "Only parent accounts can generate family connection codes" },
        { status: 403 }
      )
    }

    // Check if there's an existing valid code
    if (
      userData.family_connection_code &&
      userData.family_code_expires_at &&
      new Date(userData.family_code_expires_at) > new Date()
    ) {
      return NextResponse.json({
        code: userData.family_connection_code,
        expiresAt: userData.family_code_expires_at,
        message: "Existing code is still valid",
      })
    }

    // Generate a new unique code
    let code = generateConnectionCode()
    let attempts = 0
    const maxAttempts = 10

    // Ensure code is unique
    while (attempts < maxAttempts) {
      const { data: existingCode } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("family_connection_code", code)
        .single()

      if (!existingCode) break
      code = generateConnectionCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Failed to generate unique code. Please try again." },
        { status: 500 }
      )
    }

    // Set expiry to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Update user with new code
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        family_connection_code: code,
        family_code_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("Error updating code:", updateError)
      return NextResponse.json(
        { error: "Failed to generate code" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      code,
      expiresAt: expiresAt.toISOString(),
      message: "New connection code generated",
    })
  } catch (error) {
    console.error("Error generating family code:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
