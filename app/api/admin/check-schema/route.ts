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

    // Try listing all tables
    const { data: tables } = await admin.rpc("get_tables") // might not exist

    return NextResponse.json({
      message: "Testing table access",
      tables: tables,
    })
  } catch (err) {
    // Try direct approach
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
