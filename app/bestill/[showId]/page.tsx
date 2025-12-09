import { notFound, redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { SeatMapViewer } from "@/components/booking/seat-map-viewer"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { generateSeatsFromConfig } from "@/lib/utils/seat-generation"

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

  console.log("Show venue data:", {
    venueId: show.venue?.id,
    venueName: show.venue?.name,
    hasSeatMapConfig: !!show.venue?.seat_map_config,
    seatMapConfig: show.venue?.seat_map_config
  });

  // Calculate early bird pricing
  const showDate = new Date(show.show_datetime)
  const now = new Date()
  const oneMonthBeforeShow = new Date(showDate.getTime() - (30 * 24 * 60 * 60 * 1000))
  const isEarlyBird = now < oneMonthBeforeShow
  const earlyBirdDiscount = isEarlyBird ? 100 : 0

  // Get seats - use shared utility function
  let seats: any[] = []
  
  try {
    const result = await generateSeatsFromConfig(showId, supabase)
    seats = result.seats
    console.log("Seat generation result:", {
      generated: result.generated,
      seatsCount: result.seats?.length || 0,
      count: result.count
    });
    if (result.generated) {
      console.log(`Generated ${result.count} seats for show ${showId}`)
    }
  } catch (error) {
    console.log('Seat generation failed, falling back to direct database query:', error)
    // Fallback to direct database query
    const { data: seatRecords, error: seatsError } = await supabase
      .from("seats")
      .select("*")
      .eq("show_id", showId)
      .order("section")
      .order("row")
      .order("number")

    if (!seatsError && seatRecords) {
      seats = seatRecords
    }
  }

  return { 
    show, 
    seats, 
    isEarlyBird, 
    earlyBirdDiscount,
    originalPrice: show.base_price_nok,
    currentPrice: show.base_price_nok - earlyBirdDiscount
  }
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

  const { show, seats, isEarlyBird, earlyBirdDiscount, originalPrice, currentPrice } = data

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
        <SeatMapViewer 
          show={show} 
          seats={seats} 
          isEarlyBird={isEarlyBird}
          earlyBirdDiscount={earlyBirdDiscount}
        />
      </main>

      <Footer />
    </div>
  )
}
