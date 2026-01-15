import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile and related data
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select(`
        id, full_name, email, phone, role, profile_slug, bio, bio_short,
        avatar_url, cover_image_url, banner_url, profile_tint, banner_style,
        theme_preference, profile_border_color, profile_text_color, custom_css,
        website_url, instagram_url, facebook_url, linkedin_url, twitter_url,
        github_url, youtube_url, tiktok_url, location, occupation, favorite_quote,
        interests, skills, languages_spoken, achievements, is_public, show_email,
        show_phone, show_social_links, show_achievements, show_featured_roles,
        paypal_email, paypal_connected_at, account_type, date_of_birth,
        created_at, updated_at
      `)
      .eq("id", user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    // Get bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id, show_id, seat_ids, customer_name, customer_email, customer_phone,
        total_price_nok, discount_applied, status, qr_code_data, created_at,
        shows(title, show_datetime, venue_id, venues(name, address))
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    // Get purchases (recordings)
    const { data: purchases, error: purchasesError } = await supabase
      .from("purchases")
      .select(`
        id, ensemble_id, recording_ids, amount_paid_nok, discount_code, status,
        access_granted_at, access_expires_at, created_at,
        ensembles(title, slug, description)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    // Get ensemble enrollments
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("ensemble_enrollments")
      .select(`
        id, ensemble_id, status, enrollment_type, notes, created_at,
        ensembles(title, slug, description, director)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    // Get family connections if applicable
    const { data: familyConnections, error: familyError } = await supabase
      .from("family_connections")
      .select(`
        id, parent_id, child_id, status, enrollment_permission, connected_at,
        parent_user:users!parent_id(full_name, email),
        child_user:users!child_id(full_name, email, date_of_birth)
      `)
      .or(`parent_id.eq.${user.id},child_id.eq.${user.id}`)

    // Get video access tokens
    const { data: videoTokens, error: videoError } = await supabase
      .from("video_access_tokens")
      .select(`
        id, recording_id, expires_at, created_at,
        recordings(id, ensemble_id, team, description, ensembles(title))
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    // Compile all data
    const exportData = {
      generated_at: new Date().toISOString(),
      data_subject: {
        user_id: user.id,
        email: user.email,
        phone: profile?.phone,
        export_requested_at: new Date().toISOString()
      },
      personal_information: {
        profile,
        auth_metadata: {
          email_verified: user.email_confirmed_at,
          last_sign_in: user.last_sign_in_at,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      },
      booking_history: bookings || [],
      purchase_history: purchases || [],
      ensemble_enrollments: enrollments || [],
      family_connections: familyConnections || [],
      video_access: videoTokens || [],
      data_processing_info: {
        legal_basis: "GDPR Article 6(1)(b) - Contract performance and Article 6(1)(a) - Consent",
        retention_policy: "Data retained as per privacy policy - active accounts indefinitely, booking history 5 years",
        third_party_sharing: [
          {
            service: "PayPal",
            purpose: "Payment processing",
            data_shared: ["email", "name"]
          },
          {
            service: "Supabase",
            purpose: "Database and authentication",
            data_shared: ["all profile data"]
          },
          {
            service: "Vercel",
            purpose: "Hosting and analytics",
            data_shared: ["anonymized usage data"]
          }
        ]
      },
      rights_information: {
        right_to_access: "You can request this data export at any time",
        right_to_rectification: "You can update your profile in dashboard settings",
        right_to_erasure: "You can delete your account in dashboard settings",
        right_to_portability: "This export provides your data in JSON format",
        right_to_object: "You can withdraw consent for marketing in dashboard",
        right_to_restriction: "Contact us to restrict processing",
        right_to_complain: "Contact Datatilsynet.no for complaints"
      }
    }

    // Return as downloadable JSON
    const response = NextResponse.json(exportData)
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="teateret-data-export-${user.id}-${new Date().toISOString().split('T')[0]}.json"`
    )
    
    return response

  } catch (error) {
    console.error("Data export error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}