import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the user
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { paypalEmail, payerId } = body

    if (!paypalEmail) {
      return NextResponse.json({ error: "PayPal email is required" }, { status: 400 })
    }

    // Update user with PayPal connection
    const { error: updateError } = await supabase
      .from("users")
      .update({
        paypal_email: paypalEmail,
        paypal_payer_id: payerId || null,
        paypal_connected_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("Error updating user:", updateError)
      return NextResponse.json({ error: "Failed to connect PayPal account" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: "PayPal account connected successfully" 
    })
  } catch (error) {
    console.error("Error in connect-paypal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the user
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Disconnect PayPal
    const { error: updateError } = await supabase
      .from("users")
      .update({
        paypal_email: null,
        paypal_payer_id: null,
        paypal_connected_at: null,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("Error disconnecting PayPal:", updateError)
      return NextResponse.json({ error: "Failed to disconnect PayPal account" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: "PayPal account disconnected successfully" 
    })
  } catch (error) {
    console.error("Error in disconnect-paypal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
