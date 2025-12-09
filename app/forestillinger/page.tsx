import Link from "next/link"
import Image from "next/image"
import { Calendar, MapPin, Ticket, Users, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { formatDate, formatTime, formatPrice } from "@/lib/utils/booking"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Forestillinger | Teateret",
  description: "Se alle kommende forestillinger og kjøp billetter",
}

async function getShows() {
  const supabase = await getSupabaseServerClient()

  const { data: shows } = await supabase
    .from("shows")
    .select(`
      *,
      ensemble:ensembles(*),
      kurs:kurs(*),
      venue:venues(*)
    `)
    .in("status", ["scheduled", "on_sale"])
    .gte("show_datetime", new Date().toISOString())
    .order("show_datetime", { ascending: true })

  // Update available seats for each show and calculate early bird pricing
  if (shows) {
    for (const show of shows) {
      // Calculate early bird pricing
      const showDate = new Date(show.show_datetime)
      const now = new Date()
      const oneMonthBeforeShow = new Date(showDate.getTime() - (30 * 24 * 60 * 60 * 1000))
      show.isEarlyBird = now < oneMonthBeforeShow
      show.earlyBirdPrice = show.isEarlyBird ? show.base_price_nok - 100 : show.base_price_nok
      
      // Only recalculate seats if they exist
      const { data: totalSeats } = await supabase
        .from("seats")
        .select("id")
        .eq("show_id", show.id)
      
      if (totalSeats && totalSeats.length > 0) {
        // Seats exist, calculate dynamically
        const { data: unavailableSeats } = await supabase
          .from("seats")
          .select("id")
          .eq("show_id", show.id)
          .in("status", ["sold", "reserved"])
        
        show.available_seats = (totalSeats?.length || 0) - (unavailableSeats?.length || 0)
      } else {
        // No seats created yet, use existing value or default
        show.available_seats = show.available_seats || 50
      }
    }
  }

  return shows || []
}

async function getKurs() {
  const supabase = await getSupabaseServerClient()

  const { data: kurs } = await supabase
    .from("shows")
    .select(`
      *,
      kurs:kurs(*),
      venue:venues(*)
    `)
    .eq("source_type", "kurs")
    .in("status", ["scheduled", "on_sale"])
    .order("show_datetime", { ascending: true })

  return kurs || []
}

export default async function ShowsPage() {
  const shows = await getShows()
  const kursShows = await getKurs()

  // Separate shows by ensemble production status
  const inProductionEnsembles = new Map()
  const otherShows = []

  for (const show of shows) {
    if (show.ensemble?.stage === "I produksjon") {
      if (!inProductionEnsembles.has(show.ensemble.id)) {
        inProductionEnsembles.set(show.ensemble.id, {
          ensemble: show.ensemble,
          shows: [],
        })
      }
      inProductionEnsembles.get(show.ensemble.id).shows.push(show)
    } else {
      otherShows.push(show)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Hero */}
        <section className="bg-primary text-primary-foreground py-16">
          <div className="container px-4">
            <h1 className="text-4xl font-bold md:text-5xl">Forestillinger</h1>
            <p className="mt-4 text-xl text-primary-foreground/80">
              Finn og bestill billetter til kommende forestillinger
            </p>
          </div>
        </section>

        {/* Shows by In-Production Ensembles */}
        {inProductionEnsembles.size > 0 && (
          <section className="py-12 border-b">
            <div className="container px-4">
              <h2 className="text-3xl font-bold mb-8">I Produksjon</h2>
              <div className="space-y-12">
                {Array.from(inProductionEnsembles.values()).map(({ ensemble, shows: ensembleShows }) => (
                  <div key={ensemble.id}>
                    {/* Ensemble Header with Better Details */}
                    <div className="mb-8 bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg p-8 border border-slate-700">
                      <div className="grid gap-8 lg:grid-cols-4">
                        {/* Poster */}
                        <div className="lg:col-span-1">
                          <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-lg bg-slate-700 relative">
                            {ensemble.thumbnail_url ? (
                              <Image
                                src={ensemble.thumbnail_url}
                                alt={ensemble.title}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Ticket className="h-12 w-12 text-slate-600" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="lg:col-span-3 text-white space-y-4">
                          <div>
                            <h3 className="text-3xl font-bold mb-2">{ensemble.title}</h3>
                            {ensemble.synopsis_short && (
                              <p className="text-lg text-slate-200 leading-relaxed">{ensemble.synopsis_short}</p>
                            )}
                          </div>

                          {/* Key Info */}
                          <div className="grid gap-4 sm:grid-cols-2">
                            {ensemble.director && (
                              <div>
                                <p className="text-sm uppercase text-slate-400 font-semibold">Regi</p>
                                <p className="text-lg">{ensemble.director}</p>
                              </div>
                            )}
                            {ensemble.year && (
                              <div>
                                <p className="text-sm uppercase text-slate-400 font-semibold">År</p>
                                <p className="text-lg">{ensemble.year}</p>
                              </div>
                            )}
                            {ensemble.duration_minutes && (
                              <div>
                                <p className="text-sm uppercase text-slate-400 font-semibold">Varighet</p>
                                <p className="text-lg flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {ensemble.duration_minutes} min
                                </p>
                              </div>
                            )}
                            {ensemble.age_rating && (
                              <div>
                                <p className="text-sm uppercase text-slate-400 font-semibold">Aldersgrense</p>
                                <p className="text-lg">{ensemble.age_rating}</p>
                              </div>
                            )}
                          </div>

                          {/* Genres */}
                          {ensemble.genre && ensemble.genre.length > 0 && (
                            <div>
                              <p className="text-sm uppercase text-slate-400 font-semibold mb-2">Sjanger</p>
                              <div className="flex flex-wrap gap-2">
                                {ensemble.genre?.map((g: string) => (
                                  <Badge key={g} variant="secondary" className="bg-slate-700 hover:bg-slate-600">
                                    {g}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Link to ensemble page */}
                          <Button asChild className="mt-4">
                            <Link href={`/ensemble/${ensemble.slug}`}>Se mer detaljer</Link>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Shows for this ensemble */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {ensembleShows.map((show: any) => {
                        const seatsLeft = show.available_seats || 0
                        const isLowAvailability = seatsLeft <= 10 && seatsLeft > 0
                        const isSoldOut = seatsLeft === 0
                        
                        return (
                          <Card key={show.id} className={`overflow-hidden transition-all duration-300 hover:shadow-lg ${
                            isSoldOut ? 'opacity-60' : isLowAvailability ? 'ring-2 ring-amber-300' : ''
                          }`}>
                            <CardContent className="p-6">
                              <div className="space-y-3">
                                <div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(show.show_datetime)}
                                  </div>
                                  <div className="text-lg font-semibold">kl. {formatTime(show.show_datetime)}</div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {show.team && ensemble && (
                                    <Badge variant="secondary">
                                      {show.team === "yellow" ? ensemble.yellow_team_name : ensemble.blue_team_name}
                                    </Badge>
                                  )}
                                  {show.isEarlyBird && (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                      Early Bird
                                    </Badge>
                                  )}
                                </div>

                                {show.venue && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    {show.venue.name}
                                  </div>
                                )}

                                {/* Seat availability */}
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="h-4 w-4" />
                                  <span className={
                                    isSoldOut ? 'text-gray-500' : 
                                    isLowAvailability ? 'text-amber-600 font-medium' : 
                                    'text-muted-foreground'
                                  }>
                                    {isSoldOut ? 'Utsolgt' : 
                                     isLowAvailability ? `Kun ${seatsLeft} billetter igjen!` :
                                     `${seatsLeft} billetter tilgjengelig`}
                                  </span>
                                </div>

                                <div className="border-t pt-3 flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-2xl font-bold text-primary">
                                        {formatPrice(show.isEarlyBird ? show.earlyBirdPrice : show.base_price_nok)}
                                      </p>
                                      {show.isEarlyBird && (
                                        <span className="text-sm text-muted-foreground line-through">
                                          {formatPrice(show.base_price_nok)}
                                        </span>
                                      )}
                                    </div>
                                    {show.isEarlyBird && (
                                      <p className="text-xs text-green-600 font-medium">Spar 100 kr!</p>
                                    )}
                                  </div>
                                </div>

                                <Button asChild className="w-full" disabled={isSoldOut}>
                                  <Link href={`/bestill/${show.id}`}>
                                    {isSoldOut ? "Utsolgt" : isLowAvailability ? "Kjøp raskt!" : "Kjøp billetter"}
                                  </Link>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Other Shows */}
        {otherShows.length > 0 && (
          <section className="py-12 border-b">
            <div className="container px-4">
              <h2 className="text-3xl font-bold mb-8">Kommende Forestillinger</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {otherShows.map((show) => {
                  const seatsLeft = show.available_seats || 0
                  const isLowAvailability = seatsLeft <= 10 && seatsLeft > 0
                  const isSoldOut = seatsLeft === 0
                  
                  return (
                    <Card key={show.id} className={`overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col ${
                      isSoldOut ? 'opacity-60' : isLowAvailability ? 'ring-2 ring-amber-300' : ''
                    }`}>
                      <div className="aspect-video relative bg-muted">
                        {show.ensemble?.thumbnail_url ? (
                          <Image
                            src={show.ensemble.thumbnail_url}
                            alt={show.title || show.ensemble?.title || "Forestilling"}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Ticket className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <CardContent className="flex-1 p-6 flex flex-col">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(show.show_datetime)}
                          </div>
                          <div className="text-sm font-medium text-primary">kl. {formatTime(show.show_datetime)}</div>
                        </div>

                        <h3 className="text-xl font-bold mb-2">{show.title || show.ensemble?.title}</h3>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {show.team && show.ensemble && (
                            <Badge variant="secondary">
                              {show.team === "yellow" ? show.ensemble.yellow_team_name : show.ensemble.blue_team_name}
                            </Badge>
                          )}
                          {show.isEarlyBird && (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                              Early Bird
                            </Badge>
                          )}
                        </div>

                        {show.venue && (
                          <p className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <MapPin className="h-4 w-4" />
                            {show.venue.name}
                          </p>
                        )}

                        {/* Seat availability */}
                        <div className="flex items-center gap-2 text-sm mb-4">
                          <Users className="h-4 w-4" />
                          <span className={
                            isSoldOut ? 'text-gray-500' : 
                            isLowAvailability ? 'text-amber-600 font-medium' : 
                            'text-muted-foreground'
                          }>
                            {isSoldOut ? 'Utsolgt' : 
                             isLowAvailability ? `Kun ${seatsLeft} billetter igjen!` :
                             `${seatsLeft} billetter tilgjengelig`}
                          </span>
                        </div>

                        <div className="mt-auto">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xl font-bold text-primary">
                              {formatPrice(show.isEarlyBird ? show.earlyBirdPrice : show.base_price_nok)}
                            </p>
                            {show.isEarlyBird && (
                              <span className="text-sm text-muted-foreground line-through">
                                {formatPrice(show.base_price_nok)}
                              </span>
                            )}
                          </div>
                          {show.isEarlyBird && (
                            <p className="text-xs text-green-600 font-medium mb-3">Spar 100 kr!</p>
                          )}
                          <Button asChild className="w-full" disabled={isSoldOut}>
                            <Link href={`/bestill/${show.id}`}>
                              {isSoldOut ? "Utsolgt" : isLowAvailability ? "Kjøp raskt!" : "Kjøp billetter"}
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* Kurs Shows */}
        {kursShows.length > 0 && (
          <section className="py-12">
            <div className="container px-4">
              <h2 className="text-3xl font-bold mb-8">Kurs Forestillinger</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {kursShows.map((show: any) => (
                  <Card key={show.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                    <div className="aspect-video relative bg-muted">
                      {show.kurs?.thumbnail_url ? (
                        <Image
                          src={show.kurs.thumbnail_url}
                          alt={show.title || show.kurs?.title || "Kurs forestilling"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Users className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <CardContent className="flex-1 p-6 flex flex-col">
                      <h3 className="text-xl font-bold mb-2">{show.title || show.kurs?.title}</h3>

                      {show.kurs?.synopsis_short && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{show.kurs.synopsis_short}</p>
                      )}

                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(show.show_datetime)}
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          kl. {formatTime(show.show_datetime)}
                        </p>
                        {show.venue && (
                          <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {show.venue.name}
                          </p>
                        )}
                      </div>

                      <div className="mt-auto">
                        <p className="text-xl font-bold text-primary mb-3">Fra {formatPrice(show.base_price_nok)}</p>
                        {show.available_seats > 0 && (
                          <p className="text-sm text-muted-foreground mb-3">{show.available_seats} plasser ledige</p>
                        )}
                        <Button asChild className="w-full" disabled={show.status === "sold_out"}>
                          <Link href={`/bestill/${show.id}`}>
                            {show.status === "sold_out" ? "Utsolgt" : "Kjøp billetter"}
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Empty State */}
        {shows.length === 0 && kursShows.length === 0 && (
          <section className="py-16">
            <div className="container px-4">
              <div className="text-center py-16">
                <Ticket className="h-24 w-24 mx-auto text-muted-foreground/50 mb-6" />
                <h2 className="text-2xl font-bold mb-4">Ingen kommende forestillinger</h2>
                <p className="text-lg text-muted-foreground max-w-md mx-auto mb-8">
                  Vi jobber med å planlegge nye forestillinger. Kom tilbake snart!
                </p>
                <Button asChild size="lg">
                  <Link href="/opptak">Se digitale opptak</Link>
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
