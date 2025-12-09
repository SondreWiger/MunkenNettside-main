import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { userId, fullName, phone, email } = await request.json()
    
    if (!userId || !email) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Generate profile slug
    let slugBase = fullName
      ? fullName.toLowerCase()
          .trim()
          .replace(/[^a-zA-ZæøåÆØÅ0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .replace(/æ/g, 'ae')
          .replace(/ø/g, 'o')
          .replace(/å/g, 'a')
      : 'bruker'

    if (!slugBase) slugBase = 'bruker'

    // Find unique slug
    let finalSlug = slugBase
    let slugCount = 0
    while (true) {
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("profile_slug", finalSlug)
        .single()

      if (!existing) break

      slugCount++
      finalSlug = `${slugBase}-${slugCount}`
    }

    // Create user profile
    const { data, error } = await supabase
      .from("users")
      .upsert({
        id: userId,
        email,
        full_name: fullName || "Ukjent",
        phone: phone || null,
        role: "customer",
        profile_slug: finalSlug,
      })
      .select()
      .single()

    if (error) {
      console.error("Profile creation error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      profile: data,
      slug: finalSlug 
    })
    
  } catch (error) {
    console.error("Setup profile error:", error)
    return NextResponse.json(
      { error: "Failed to setup profile" },
      { status: 500 }
    )
  }
}