import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Create an admin client that can execute SQL
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

    // Call the exec_sql function if it exists
    const { data, error } = await admin.rpc("exec_sql", {
      sql: "ALTER TABLE public.seats DISABLE ROW LEVEL SECURITY;",
    })

    if (error) {
      // If exec_sql doesn't exist, try a different approach
      console.log("exec_sql RPC not available, trying alternative...")

      // Just log that we need to manually run the SQL
      return NextResponse.json(
        {
          message:
            "Please manually execute in Supabase SQL Editor: ALTER TABLE public.seats DISABLE ROW LEVEL SECURITY;",
          error: error.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: "RLS disabled successfully",
      data,
    })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}
