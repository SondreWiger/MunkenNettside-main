import { notFound, redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { SeatSelector } from "@/components/booking/seat-selector"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { generateSeats, type SeatMapConfig } from "@/lib/utils/seatMapGenerator"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ showId: string }>
}

async function getShowData(showId: string) {
  const supabase = await getSupabaseServerClient()

  const { data: show } = await supabase
    .from("shows")
    .select(`
      *,
      ensemble:ensembles(*),
      venue:venues(*)
    `)
    .eq("id", showId)
    .single()

  if (!show) return null

  // Generate seats from venue config
  // The venue's seat_map_config contains rows, cols, blockedSeats, handicapSeats
  const config: SeatMapConfig = (show.venue?.seat_map_config as SeatMapConfig) || {
    rows: 10,
    cols: 10,
    blockedSeats: [],
    handicapSeats: [],
  }

  console.log("[debug] Booking page config:", {
    rows: config.rows,
    cols: config.cols,
    blockedSeats: config.blockedSeats,
    handicapSeats: config.handicapSeats,
    fullConfig: JSON.stringify(config)
  })

  const generatedSeats = generateSeats(config)
  
  console.log("[debug] Generated seats:", {
    total: generatedSeats.length,
    blocked: generatedSeats.filter(s => s.isBlocked).length,
    handicap: generatedSeats.filter(s => s.isHandicap).length,
  })

  return { show, seats: generatedSeats }
}

export async function generateMetadata({ params }: PageProps) {
  const { showId } = await params
  const data = await getShowData(showId)

  if (!data) {
    return { title: "Forestilling ikke funnet | Teateret" }
  }

  const title = data.show.title || data.show.ensemble?.title || "Forestilling"
  return {
    title: `Bestill billetter - ${title} | Teateret`,
    description: `Velg seter og bestill billetter til ${title}`,
  }
}

export default async function BookingPage({ params }: PageProps) {
  const { showId } = await params
  const data = await getShowData(showId)

  if (!data) {
    notFound()
  }

  const { show, seats } = data

  console.log(`[v0] Rendering page with ${seats?.length || 0} seats`)

  // Check if show is available for booking
  if (show.status === "cancelled") {
    redirect("/forestillinger?message=cancelled")
  }

  if (show.status === "sold_out") {
    redirect("/forestillinger?message=soldout")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        <SeatSelector show={show} seats={seats} />
      </main>

      <Footer />
    </div>
  )
}
