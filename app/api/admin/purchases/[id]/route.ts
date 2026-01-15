import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getSupabaseServerClient()

    // Check admin authorization
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 })
    }

    const { data: userData, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (roleError || !userData || !["admin", "superadmin"].includes(userData.role)) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 403 })
    }

    // Fetch purchase with all related data
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .select(`
        *,
        user:user_id (
          id,
          name,
          email,
          phone
        ),
        ensemble:ensemble_id (
          id,
          title,
          slug
        ),
        transactions:payment_transactions (
          id,
          processor,
          transaction_id,
          amount_nok,
          status,
          metadata,
          created_at
        )
      `)
      .eq("id", params.id)
      .single()

    if (purchaseError) {
      console.error("Error fetching purchase:", purchaseError)
      return NextResponse.json({ error: "Kunne ikke hente kjøp" }, { status: 500 })
    }

    if (!purchase) {
      return NextResponse.json({ error: "Kjøp ikke funnet" }, { status: 404 })
    }

    return NextResponse.json(purchase)
  } catch (error) {
    console.error("Error in GET /api/admin/purchases/[id]:", error)
    return NextResponse.json({ error: "Intern serverfeil" }, { status: 500 })
  }
}
