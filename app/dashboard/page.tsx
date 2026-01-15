import { redirect } from "next/navigation"
import { UnifiedDashboard } from "@/components/dashboard/unified-dashboard"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Dashboard - Teateret",
  description: "Din personlige dashboard",
}

async function getUserData() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

  const { data: purchases } = await supabase
    .from("purchases")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      show:shows(
        id,
        title,
        show_datetime,
        ensemble:ensembles(title),
        venue:venues(name)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: enrollments } = await supabase
    .from("kurs_enrollments")
    .select(`
      *,
      kurs:courses(
        title,
        description,
        start_date
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: ensembleEnrollments } = await supabase
    .from("ensemble_enrollments")
    .select(`
      *,
      ensemble:ensembles(
        title,
        description,
        slug
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: actor } = await supabase
    .from("actors")
    .select("id")
    .eq("user_id", user.id)
    .single()

  return {
    user,
    profile,
    purchases: purchases || [],
    bookings: bookings || [],
    enrollments: enrollments || [],
    ensembleEnrollments: ensembleEnrollments || [],
    actor,
  }
}

export default async function UserProfilePage() {
  const data = await getUserData()

  if (!data) {
    redirect("/logg-inn?redirect=/dashboard")
  }

  return <UnifiedDashboard initialData={data} />
}