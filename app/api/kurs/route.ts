import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (id) {
      // Get single kurs
      const { data, error } = await supabase
        .from("kurs")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    // Get all kurs (only published for non-admins)
    const { data, error } = await supabase
      .from("kurs")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error("Kurs API error:", error)
    return NextResponse.json({ error: "Failed to fetch kurs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // Check if user is authenticated
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
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const body = await request.json()

    const { error } = await supabase
      .from("kurs")
      .insert({
        title: body.title,
        slug: body.slug,
        description: body.description,
        director: body.director,
        level: body.level || "beginner",
        duration_minutes: body.duration_minutes || 60,
        max_participants: body.max_participants,
        thumbnail_url: body.thumbnail_url,
        banner_url: body.banner_url,
        synopsis_short: body.synopsis_short,
        synopsis_long: body.synopsis_long,
        recording_price_nok: body.recording_price_nok || 0,
        is_published: body.is_published || false,
        featured: body.featured || false,
      })

    if (error) throw error

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("Kurs API POST error:", error)
    return NextResponse.json({ error: "Failed to create kurs" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // Check if user is authenticated
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
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Kurs ID required" }, { status: 400 })
    }

    const body = await request.json()

    const { error } = await supabase
      .from("kurs")
      .update({
        title: body.title,
        description: body.description,
        director: body.director,
        level: body.level,
        duration_minutes: body.duration_minutes,
        max_participants: body.max_participants,
        thumbnail_url: body.thumbnail_url,
        banner_url: body.banner_url,
        synopsis_short: body.synopsis_short,
        synopsis_long: body.synopsis_long,
        recording_price_nok: body.recording_price_nok,
        is_published: body.is_published,
        featured: body.featured,
      })
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Kurs API PUT error:", error)
    return NextResponse.json({ error: "Failed to update kurs" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // Check if user is authenticated
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
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Kurs ID required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("kurs")
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Kurs API DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete kurs" }, { status: 500 })
  }
}
