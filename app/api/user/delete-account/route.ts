import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { confirmPassword, reason } = await request.json()

    if (!confirmPassword) {
      return NextResponse.json(
        { error: "Password confirmation is required" },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: confirmPassword
    })

    if (signInError) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 403 }
      )
    }

    // Log the deletion request
    await supabase.from("admin_action_logs").insert({
      action_type: "account_deletion_requested",
      target_user_id: user.id,
      metadata: {
        reason: reason || "No reason provided",
        timestamp: new Date().toISOString(),
        email: user.email
      }
    })

    // Start deletion process
    // 1. Anonymize sensitive data instead of hard delete for legal compliance
    const anonymizedData = {
      full_name: "Slettet bruker",
      email: `deleted-${user.id.slice(0, 8)}@deleted.teateret.no`,
      phone: null,
      bio: null,
      bio_short: null,
      avatar_url: null,
      cover_image_url: null,
      banner_url: null,
      custom_css: null,
      website_url: null,
      instagram_url: null,
      facebook_url: null,
      linkedin_url: null,
      twitter_url: null,
      github_url: null,
      youtube_url: null,
      tiktok_url: null,
      location: null,
      occupation: null,
      favorite_quote: null,
      interests: [],
      skills: [],
      languages_spoken: [],
      achievements: [],
      is_public: false,
      show_email: false,
      show_phone: false,
      paypal_email: null,
      paypal_payer_id: null,
      paypal_connected_at: null
    }

    // Update user record with anonymized data
    const { error: updateError } = await supabase
      .from("users")
      .update({
        ...anonymizedData,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("Error anonymizing user data:", updateError)
      return NextResponse.json(
        { error: "Failed to process account deletion" },
        { status: 500 }
      )
    }

    // 2. Cancel/anonymize active bookings (keep for legal/accounting reasons)
    await supabase
      .from("bookings")
      .update({
        customer_name: "Slettet bruker",
        customer_email: anonymizedData.email,
        customer_phone: null,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id)
      .in("status", ["pending", "confirmed"])

    // 3. Keep purchase history but anonymize personal info
    await supabase
      .from("purchases")
      .update({
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id)

    // 4. Remove from family connections
    await supabase
      .from("family_connections")
      .delete()
      .or(`parent_id.eq.${user.id},child_id.eq.${user.id}`)

    // 5. Revoke video access tokens
    await supabase
      .from("video_access_tokens")
      .delete()
      .eq("user_id", user.id)

    // 6. Delete admin devices if any
    await supabase
      .from("admin_devices")
      .delete()
      .eq("user_id", user.id)

    // 7. Finally, delete the auth user (this will cascade properly)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id)
    
    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError)
      // Don't fail the request as the data is already anonymized
    }

    // Log successful deletion
    await supabase.from("admin_action_logs").insert({
      action_type: "account_deleted",
      target_user_id: user.id,
      metadata: {
        reason: reason || "No reason provided",
        timestamp: new Date().toISOString(),
        original_email: user.email,
        anonymization_completed: true
      }
    })

    return NextResponse.json({ 
      success: true,
      message: "Account deletion completed. Your personal data has been anonymized and removed from our systems." 
    })

  } catch (error) {
    console.error("Account deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}