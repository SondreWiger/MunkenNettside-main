import { getSupabaseServerClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { SeatMapBuilder } from "@/components/admin/seat-map-builder"

export default async function SeatMapBuilderPage() {
  const supabase = await getSupabaseServerClient()

  // Get the venue
  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single()

  if (!venue) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <SeatMapBuilder venue={venue} />
    </div>
  )
}
