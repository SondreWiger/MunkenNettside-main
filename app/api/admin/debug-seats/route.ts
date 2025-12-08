import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Test 1: Try to count all seats
    const { count: allCount } = await admin.from("seats").select("id", { count: "exact", head: true })
    console.log(`[DEBUG] Total seats in database: ${allCount}`)

    // Test 2: Try to get seats for the specific show
    const { data: showSeats, error: showError, count: showCount } = await admin
      .from("seats")
      .select("*", { count: "exact" })
      .eq("show_id", "f4a42c44-1135-4ec9-9372-ab8684bafa48")
      .limit(1)

    console.log(`[DEBUG] Seats for show: data=${showSeats?.length || 0}, count=${showCount}, error=${showError?.message || 'none'}`)

    // Test 3: Try with regular anon client
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: anonSeats } = await anon
      .from("seats")
      .select("*")
      .eq("show_id", "f4a42c44-1135-4ec9-9372-ab8684bafa48")
      .limit(1)

    console.log(`[DEBUG] Anon client got: ${anonSeats?.length || 0} seats`)

    return NextResponse.json({
      adminTotalCount: allCount,
      adminShowCount: showCount,
      adminShowData: showSeats?.length || 0,
      adminShowError: showError?.message,
      anonCount: anonSeats?.length || 0,
    })
  } catch (err) {
    console.error("[DEBUG] Error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
