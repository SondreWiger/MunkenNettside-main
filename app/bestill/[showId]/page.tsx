import { notFound, redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { UnifiedSeatBooking } from "@/components/booking/unified-seat-booking"
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

  // Check if venue has visual grid layout or freeform seat positions
  const hasVisualGrid = (show.venue?.seat_map_config?.gridData && 
                       show.venue.seat_map_config.gridData.grid && 
                       show.venue.seat_map_config.gridData.grid.length > 0) ||
                       (Array.isArray(show.venue?.seat_map_config?.seats) && show.venue.seat_map_config.seats.some((s: any) => typeof s.x === 'number' && typeof s.y === 'number'))

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Page Header */}
        <section className="bg-white shadow-sm border-b">
          <div className="container max-w-7xl mx-auto px-4 py-8 text-center">
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              {show.title || show.ensemble?.title || "Forestilling"}
            </h1>
            {show.team && show.ensemble && (
              <div className="mb-4">
                <span className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  {show.team === "yellow" 
                    ? show.ensemble.yellow_team_name 
                    : show.ensemble.blue_team_name}
                </span>
              </div>
            )}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-slate-600 mb-4">
              <span className="flex items-center gap-2">
                📅 {new Date(show.show_datetime).toLocaleDateString('nb-NO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <span className="flex items-center gap-2">
                🕐 {new Date(show.show_datetime).toLocaleTimeString('nb-NO', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span className="flex items-center gap-2">
                📍 {show.venue?.name || "Sted ikke spesifisert"}
              </span>
            </div>
            
            {isEarlyBird && (
              <div className="inline-block px-4 py-2 bg-green-100 border border-green-300 text-green-800 rounded-lg">
                ⏰ <strong>Early Bird:</strong> Spar {earlyBirdDiscount}kr per billett!
              </div>
            )}
          </div>
        </section>

        <div className="container max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
          <UnifiedSeatBooking 
            show={show} 
            seats={seats} 
            isEarlyBird={isEarlyBird}
            earlyBirdDiscount={earlyBirdDiscount}
            mode="visual"
            seatMapConfig={show.venue?.seat_map_config}
          />
        </div>
        <div className="text-center py-6 text-sm text-slate-600">
          Ved å bestille godtar du våre{' '}
          <a href="/legal/vilkar" target="_blank" className="underline text-slate-700 hover:text-slate-900">Vilkår for kjøp</a>.
        </div>
      </main>

      <Footer />
    </div>
  )
}
