import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/server"

// Debug endpoint to inspect seat map configs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const showId = searchParams.get('showId')

    if (!showId) {
      return NextResponse.json({ error: "showId required" }, { status: 400 })
    }

    const supabase = await getSupabaseAdminClient()

    // Get show and venue details
    const { data: show, error: showError } = await supabase
      .from("shows")
      .select(`
        *,
        venue:venues(*)
      `)
      .eq("id", showId)
      .single()

    if (showError || !show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 })
    }

    return NextResponse.json({
      showId,
      venueId: show.venue?.id,
      venueName: show.venue?.name,
      hasSeatMapConfig: !!show.venue?.seat_map_config,
      seatMapConfigType: typeof show.venue?.seat_map_config,
      seatMapConfig: show.venue?.seat_map_config,
    })

  } catch (error) {
    console.error("Error in debug endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}