import { notFound, redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { SeatSelector } from "@/components/booking/seat-selector"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { generateSeats, type SeatMapConfig } from "@/lib/utils/seatMapGenerator"
import type { Seat, Show } from "@/lib/types"

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

  const { data: seatRecords, error: seatsError } = await supabase
    .from("seats")
    .select(
      "id, show_id, section, row, number, price_nok, status, reserved_until, created_at, updated_at",
    )
    .eq("show_id", showId)
    .order("section")
    .order("row")
    .order("number")

  if (seatsError) {
    console.error("[v0] Could not fetch seats for show", { showId, seatsError })
  }

  let seats: Seat[] = seatRecords || []

  if (seats.length === 0) {
    const config: SeatMapConfig = (show.venue?.seat_map_config as SeatMapConfig) || {
      rows: 10,
      cols: 10,
      blockedSeats: [],
      handicapSeats: [],
    }

    console.warn("[v0] No seat records found for show, falling back to generated seats", { showId })

    const generatedSeats = generateSeats(config)

      seats = generatedSeats.map((seat) => ({
      id: `fallback-${showId}-${seat.section}-${seat.rowLabel}-${seat.seatNumber}`,
      show_id: showId,
      section: seat.section,
      row: seat.rowLabel,
      number: seat.seatNumber,
      price_nok: show.base_price_nok || 0,
      status: seat.isBlocked ? "blocked" : "available",
        reserved_until: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
  }

  return { show, seats }
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
