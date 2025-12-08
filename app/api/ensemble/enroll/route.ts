import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { ensembleId } = body

    // Get authenticated user
    const supabase = await getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate ensemble exists and is in "Påmelding" stage
    const { data: ensemble, error: ensembleError } = await supabase
      .from("ensembles")
      .select("id, title, stage")
      .eq("id", ensembleId)
      .single()

    if (ensembleError || !ensemble) {
      return NextResponse.json({ error: "Ensemble not found" }, { status: 404 })
    }

    if (ensemble.stage !== "Påmelding") {
      return NextResponse.json(
        { error: "Ensemble is not open for enrollment" },
        { status: 400 }
      )
    }

    // Check if user already enrolled
    const { data: existingEnrollment } = await supabase
      .from("ensemble_enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("ensemble_id", ensembleId)
      .single()

    if (existingEnrollment) {
      return NextResponse.json(
        { error: "Already enrolled in this ensemble" },
        { status: 400 }
      )
    }

    // Create enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from("ensemble_enrollments")
      .insert({
        user_id: user.id,
        ensemble_id: ensembleId,
        status: "pending",
      })
      .select()
      .single()

    if (enrollError) {
      return NextResponse.json(
        { error: "Failed to create enrollment" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      enrollment,
    })
  } catch (error) {
    console.error("Enrollment error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
