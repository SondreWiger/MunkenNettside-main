import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Calendar, Clock, Film, Play, Ticket, Users, Star, Quote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { EnsembleSignupCard } from "@/components/booking/ensemble-signup-card"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { formatDate, formatPrice } from "@/lib/utils/booking"
import type { Ensemble, Recording, Show, CastMember } from "@/lib/types"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getEnsembleData(slug: string) {
  const supabase = await getSupabaseServerClient()

  const { data: ensemble } = await supabase
    .from("ensembles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single()

  if (!ensemble) return null

  const { data: recordings } = await supabase.from("recordings").select("*").eq("ensemble_id", ensemble.id)

  const { data: shows } = await supabase
    .from("shows")
    .select(`
      *,
      venue:venues(*)
    `)
    .eq("ensemble_id", ensemble.id)
    .in("status", ["scheduled", "on_sale"])
    .gte("show_datetime", new Date().toISOString())
    .order("show_datetime", { ascending: true })

  // Get team members
  const { data: teamMembers } = await supabase
    .from("ensemble_team_members")
    .select(`
      *,
      users:users(full_name, slug, avatar_url)
    `)
    .eq("ensemble_id", ensemble.id)
    .order("team")
    .order("position_order")

  // Increment view count
  await supabase
    .from("ensembles")
    .update({ view_count: (ensemble.view_count || 0) + 1 })
    .eq("id", ensemble.id)

  return {
    ensemble: ensemble as Ensemble,
    recordings: (recordings || []) as Recording[],
    shows: (shows || []) as Show[],
    teamMembers: teamMembers || [],
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const data = await getEnsembleData(slug)

  if (!data) {
    return { title: "Ikke funnet | Teateret" }
  }

  return {
    title: `${data.ensemble.title} | Teateret`,
    description: data.ensemble.synopsis_short || data.ensemble.description,
  }
}

function CastGrid({ cast, title }: { cast: CastMember[]; title: string }) {
  if (!cast || cast.length === 0) return null

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cast.map((member, index) => {
          const hasProfile = (member as any)?.profile_slug
          const Card_content = (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center gap-4 p-4">
                <div className="w-20 h-20 rounded-full bg-muted shrink-0 overflow-hidden">
                  {member.photo_url ? (
                    <Image
                      src={member.photo_url || "/placeholder.svg"}
                      alt={member.name}
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              </div>
            </Card>
          )

          if (hasProfile) {
            return (
              <Link key={index} href={`/profile/${(member as any).profile_slug}`}>
                {Card_content}
              </Link>
            )
          }

          return Card_content
        })}
      </div>
    </div>
  )
}

export default async function EnsemblePage({ params }: PageProps) {
  const { slug } = await params
  const data = await getEnsembleData(slug)

  if (!data) {
    notFound()
  }

  const { ensemble, recordings, shows, teamMembers } = data
  const yellowRecordings = recordings.filter((r) => r.team === "yellow")
  const blueRecordings = recordings.filter((r) => r.team === "blue")
  const yellowTeamMembers = teamMembers.filter((m: any) => m.team === "yellow")
  const blueTeamMembers = teamMembers.filter((m: any) => m.team === "blue")
  const hasRecordings = recordings.length > 0

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Show production layout first if in production */}
        {ensemble.stage === "I produksjon" && (
          /* IMDB Style Layout for Productions in Progress */
          <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
            {/* Hero Image Banner */}
            {ensemble.thumbnail_url && (
              <div className="relative h-96 sm:h-[500px] md:h-[600px] w-full overflow-hidden">
                <Image
                  src={ensemble.thumbnail_url}
                  alt={ensemble.title}
                  fill
                  className="object-cover brightness-50"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950"></div>
              </div>
            )}
            
            <div className="container px-4 -mt-32 relative z-10">
              {/* Hero Section - Poster + Main Info */}
              <div className="grid gap-12 mb-16 lg:grid-cols-5">
                {/* Poster - Sticky */}
                <div className="lg:col-span-1">
                  <div className="sticky top-24">
                    <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700">
                      {ensemble.thumbnail_url ? (
                        <Image
                          src={ensemble.thumbnail_url}
                          alt={ensemble.title}
                          fill
                          className="object-cover hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                          <Film className="h-16 w-16 text-slate-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Info */}
                <div className="lg:col-span-4 space-y-8">
                  {/* Title & Basic Info */}
                  <div>
                    <h1 className="text-5xl md:text-6xl font-black mb-4 text-white leading-tight">{ensemble.title}</h1>
                    
                    {ensemble.year && (
                      <p className="text-2xl text-slate-300 font-semibold mb-6">{ensemble.year}</p>
                    )}

                    {/* Key Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-slate-700">
                      {ensemble.director && (
                        <div>
                          <p className="text-xs uppercase text-slate-400 font-semibold tracking-widest">Regi</p>
                          <p className="text-lg font-semibold text-white mt-2">{ensemble.director}</p>
                        </div>
                      )}
                      {ensemble.duration_minutes && (
                        <div>
                          <p className="text-xs uppercase text-slate-400 font-semibold tracking-widest">Varighet</p>
                          <p className="text-lg font-semibold text-white mt-2 flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            {ensemble.duration_minutes} min
                          </p>
                        </div>
                      )}
                      {ensemble.age_rating && (
                        <div>
                          <p className="text-xs uppercase text-slate-400 font-semibold tracking-widest">Aldersgrense</p>
                          <p className="text-lg font-semibold text-white mt-2">{ensemble.age_rating}</p>
                        </div>
                      )}
                    </div>

                    {/* Synopsis */}
                    {ensemble.synopsis_short && (
                      <p className="text-xl text-slate-300 leading-relaxed">{ensemble.synopsis_short}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Gallery */}
              {ensemble.gallery_images && ensemble.gallery_images.length > 0 && (
                <section className="mb-16 relative z-1000">
                  <h2 className="text-3xl font-bold mb-8 text-white">Galeri</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {ensemble.gallery_images.map((image: any, index: number) => (
                      <div
                        key={index}
                        className="group relative aspect-[4/3] rounded-lg overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 bg-slate-800 border border-slate-700 hover:border-slate-600"
                      >
                        <Image
                          src={typeof image === "string" ? image : image.url}
                          alt={typeof image === "string" ? `Gallery ${index + 1}` : image.caption || `Gallery ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Yellow Team Cast */}
              {ensemble.yellow_cast && ensemble.yellow_cast.length > 0 && (
                <section className="mb-16">
                  <h2 className="text-3xl font-bold mb-2 text-white">{ensemble.yellow_team_name}</h2>
                  <p className="text-slate-400 mb-8 text-lg font-semibold">Rollebesetning</p>
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                    {ensemble.yellow_cast.map((member: CastMember, index: number) => (
                      <div
                        key={index}
                        className="group bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden border border-slate-700 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/20"
                      >
                        <div className="aspect-[3/4] relative bg-slate-700 overflow-hidden">
                          {member.photo_url ? (
                            <Image
                              src={member.photo_url}
                              alt={member.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Users className="h-12 w-12 text-slate-600" />
                            </div>
                          )}
                        </div>
                        <div className="p-4 text-center">
                          <p className="text-xl font-semibold text-white">{member.name}</p>
                          <p className="text-sm text-slate-400">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Blue Team Cast */}
              {ensemble.blue_cast && ensemble.blue_cast.length > 0 && (
                <section className="mb-16">
                  <h2 className="text-3xl font-bold mb-2 text-white">{ensemble.blue_team_name}</h2>
                  <p className="text-slate-400 mb-8 text-lg font-semibold">Rollebesetning</p>
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                    {ensemble.blue_cast.map((member: CastMember, index: number) => (
                      <div
                        key={index}
                        className="group bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
                      >
                        <div className="aspect-[3/4] relative bg-slate-700 overflow-hidden">
                          {member.photo_url ? (
                            <Image
                              src={member.photo_url}
                              alt={member.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Users className="h-12 w-12 text-slate-600" />
                            </div>
                          )}
                        </div>
                        <div className="p-4 text-center">
                          <p className="text-xl font-semibold text-white">{member.name}</p>
                          <p className="text-sm text-slate-400">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Press Quotes */}
              {ensemble.press_quotes && ensemble.press_quotes.length > 0 && (
                <section className="mb-16">
                  <h2 className="text-3xl font-bold mb-8 text-white">Presseomtaler</h2>
                  <div className="grid gap-6">
                    {ensemble.press_quotes.map((quote: any, index: number) => (
                      <div key={index} className="bg-slate-800/50 rounded-lg p-8 border border-slate-700 border-l-4 border-l-blue-500">
                        <Quote className="h-8 w-8 text-blue-500 mb-4" />
                        <blockquote className="text-lg italic mb-4 text-slate-100">&ldquo;{quote.quote}&rdquo;</blockquote>
                        <cite className="text-slate-400 not-italic">— {quote.source}</cite>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Awards */}
              {ensemble.awards && ensemble.awards.length > 0 && (
                <section className="mb-16">
                  <h2 className="text-3xl font-bold mb-8 text-white">Priser</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {ensemble.awards.map((award: any, index: number) => (
                      <div key={index} className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-lg p-6 flex items-start gap-4 border border-yellow-700/30">
                        <Star className="h-8 w-8 text-yellow-500 flex-shrink-0 mt-1" />
                        <div>
                          <p className="font-bold text-lg text-white">{award.title}</p>
                          <p className="text-sm text-slate-400">{award.year}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Upcoming Shows */}
              {shows.length > 0 && (
                <section className="mb-16">
                  <h2 className="text-3xl font-bold mb-8 text-white">Kommende forestillinger</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {shows.map((show) => (
                      <div key={show.id} className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg p-6 border border-blue-700/30 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20">
                        <div className="flex items-start gap-3 mb-4">
                          <Calendar className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-white text-lg">{formatDate(show.show_datetime)}</p>
                            <p className="text-sm text-slate-400">{show.venue?.name || "Sted ubestemt"}</p>
                          </div>
                        </div>
                        <Button asChild size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                          <Link href={`/bestill/${show.id}`}>
                            <Ticket className="h-4 w-4 mr-2" />
                            Kjøp billetter
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recordings/Videos for Sale */}
              {hasRecordings && (
                <section className="mb-16">
                  <h2 className="text-3xl font-bold mb-8 text-white">Opptak for salg</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {yellowRecordings.length > 0 && (
                      <Button asChild size="lg" className="h-20 bg-gradient-to-br from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600">
                        <Link href={`/kasse?ensemble=${ensemble.id}&team=yellow`}>
                          <div className="flex flex-col items-start">
                            <Play className="h-5 w-5 mb-1" />
                            <span className="text-sm font-semibold">Opptak - {ensemble.yellow_team_name}</span>
                            <span className="text-xs opacity-90">{formatPrice(ensemble.recording_price_nok)}</span>
                          </div>
                        </Link>
                      </Button>
                    )}
                    {blueRecordings.length > 0 && (
                      <Button asChild size="lg" className="h-20 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600">
                        <Link href={`/kasse?ensemble=${ensemble.id}&team=blue`}>
                          <div className="flex flex-col items-start">
                            <Play className="h-5 w-5 mb-1" />
                            <span className="text-sm font-semibold">Opptak - {ensemble.blue_team_name}</span>
                            <span className="text-xs opacity-90">{formatPrice(ensemble.recording_price_nok)}</span>
                          </div>
                        </Link>
                      </Button>
                    )}
                    {yellowRecordings.length > 0 && blueRecordings.length > 0 && (
                      <Button asChild size="lg" className="h-20 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600">
                        <Link href={`/kasse?ensemble=${ensemble.id}&team=both`}>
                          <div className="flex flex-col items-start">
                            <Film className="h-5 w-5 mb-1" />
                            <span className="text-sm font-semibold">Begge lag (20% rabatt)</span>
                            <span className="text-xs opacity-90">{formatPrice(ensemble.recording_price_nok * 2 * 0.8)}</span>
                          </div>
                        </Link>
                      </Button>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {/* Regular Hero Section - Only show if NOT in production */}
        {ensemble.stage !== "I produksjon" && (
        <section className="relative bg-primary text-primary-foreground">
          <div className="absolute inset-0">
            {ensemble.banner_url ? (
              <Image
                src={ensemble.banner_url || "/placeholder.svg"}
                alt=""
                fill
                className="object-cover opacity-30"
                priority
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
            )}
          </div>
          <div className="container relative px-4 py-16 md:py-24">
            <div className="max-w-3xl">
              {ensemble.genre && ensemble.genre.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {ensemble.genre.map((g) => (
                    <Badge key={g} variant="secondary" className="text-sm">
                      {g}
                    </Badge>
                  ))}
                </div>
              )}

              <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl text-balance">{ensemble.title}</h1>

              <div className="flex flex-wrap items-center gap-4 mt-6 text-lg text-primary-foreground/80">
                {ensemble.year && <span>{ensemble.year}</span>}
                {ensemble.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {ensemble.duration_minutes} min
                  </span>
                )}
                {ensemble.age_rating && (
                  <Badge variant="outline" className="border-primary-foreground/30">
                    {ensemble.age_rating}
                  </Badge>
                )}
                {ensemble.director && <span>Regi: {ensemble.director}</span>}
              </div>

              {ensemble.synopsis_short && (
                <p className="mt-6 text-xl text-primary-foreground/90 leading-relaxed">{ensemble.synopsis_short}</p>
              )}
            </div>
          </div>
        </section>
        )}

        {/* Action Buttons */}
        <section className="border-b bg-card">
          <div className="container px-4 py-8">
            <div className="flex flex-wrap gap-4">
              {hasRecordings && (
                <>
                  {yellowRecordings.length > 0 && (
                    <Button asChild size="lg" className="h-14 px-8 text-lg">
                      <Link href={`/kasse?ensemble=${ensemble.id}&team=yellow`}>
                        <Play className="mr-2 h-5 w-5" />
                        Kjøp opptak - {ensemble.yellow_team_name}
                      </Link>
                    </Button>
                  )}
                  {blueRecordings.length > 0 && (
                    <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg bg-transparent">
                      <Link href={`/kasse?ensemble=${ensemble.id}&team=blue`}>
                        <Play className="mr-2 h-5 w-5" />
                        Kjøp opptak - {ensemble.blue_team_name}
                      </Link>
                    </Button>
                  )}
                  {yellowRecordings.length > 0 && blueRecordings.length > 0 && (
                    <Button asChild size="lg" variant="secondary" className="h-14 px-8 text-lg">
                      <Link href={`/kasse?ensemble=${ensemble.id}&team=both`}>
                        <Film className="mr-2 h-5 w-5" />
                        Kjøp begge lag (spar 20%)
                      </Link>
                    </Button>
                  )}
                </>
              )}
              {shows.length > 0 && (
                <Button asChild size="lg" variant={hasRecordings ? "outline" : "default"} className="h-14 px-8 text-lg">
                  <Link href="#forestillinger">
                    <Ticket className="mr-2 h-5 w-5" />
                    Se forestillinger ({shows.length})
                  </Link>
                </Button>
              )}
            </div>

            {hasRecordings && (
              <p className="mt-4 text-lg font-semibold text-primary">
                Opptak fra {formatPrice(ensemble.recording_price_nok)} per lag
              </p>
            )}
          </div>
        </section>

        {/* Standard Layout - shown when NOT in production */}
        {ensemble.stage !== "I produksjon" && (
          <div className="container px-4 py-16">
            <div className="grid gap-12 mb-16 lg:grid-cols-3">
              {/* Left Column - Content */}
              <div className="lg:col-span-2 space-y-12">
                {/* Synopsis */}
                {ensemble.synopsis_long && (
                  <section>
                    <h2 className="text-2xl font-bold mb-4">Om forestillingen</h2>
                    <div className="prose prose-lg max-w-none text-muted-foreground">
                      <p className="whitespace-pre-wrap">{ensemble.synopsis_long}</p>
                    </div>
                  </section>
                )}

                {/* Trailer */}
                {ensemble.trailer_url && (
                  <section>
                    <h2 className="text-2xl font-bold mb-4">Trailer</h2>
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <iframe src={ensemble.trailer_url} title="Trailer" className="w-full h-full" allowFullScreen />
                    </div>
                  </section>
                )}

                {/* Cast Tabs */}
                {(ensemble.yellow_cast?.length > 0 || ensemble.blue_cast?.length > 0) && (
                  <section>
                    <h2 className="text-2xl font-bold mb-4">Rollebesetning</h2>
                    <Tabs defaultValue="yellow" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 h-14">
                        <TabsTrigger value="yellow" className="text-base h-12">
                          {ensemble.yellow_team_name}
                        </TabsTrigger>
                        <TabsTrigger value="blue" className="text-base h-12">
                          {ensemble.blue_team_name}
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="yellow" className="mt-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                          {ensemble.yellow_cast?.map((member: CastMember, index: number) => (
                            <CastGrid cast={[member]} key={index} title="" />
                          ))}
                        </div>
                      </TabsContent>
                      <TabsContent value="blue" className="mt-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                          {ensemble.blue_cast?.map((member: CastMember, index: number) => (
                            <CastGrid cast={[member]} key={index} title="" />
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </section>
                )}

                {/* Crew */}
                {ensemble.crew && ensemble.crew.length > 0 && (
                  <section>
                    <h2 className="text-2xl font-bold mb-4">Filmteamet</h2>
                    <div className="space-y-4">
                      {ensemble.crew.map((member: any, index: number) => (
                        <Card key={index}>
                          <CardContent className="pt-6">
                            <p className="text-sm uppercase text-muted-foreground mb-1">{member.role}</p>
                            <p className="font-semibold">{member.name}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Right Column - Info & Shows */}
              <div className="space-y-8">
                {/* Quick Info */}
                <Card>
                  <CardContent className="pt-6">
                    <dl className="space-y-4">
                      {ensemble.year && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">År</dt>
                          <dd className="font-medium">{ensemble.year}</dd>
                        </div>
                      )}
                      {ensemble.director && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Regi</dt>
                          <dd className="font-medium">{ensemble.director}</dd>
                        </div>
                      )}
                      {ensemble.duration_minutes && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Varighet</dt>
                          <dd className="font-medium">{ensemble.duration_minutes} min</dd>
                        </div>
                      )}
                      {ensemble.age_rating && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Aldersgrense</dt>
                          <dd className="font-medium">{ensemble.age_rating}</dd>
                        </div>
                      )}
                      {ensemble.premiere_date && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Premiere</dt>
                          <dd className="font-medium">{formatDate(ensemble.premiere_date)}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                {/* Upcoming Shows */}
                {shows.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Kommende forestillinger</h3>
                      <div className="space-y-3">
                        {shows.map((show) => (
                          <div key={show.id} className="p-3 rounded-lg bg-muted">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Calendar className="h-4 w-4" />
                              {formatDate(show.show_datetime)}
                            </div>
                            <p className="text-sm font-medium mb-2">{show.venue?.name}</p>
                            <Button asChild size="sm" className="w-full">
                              <Link href={`/bestill/${show.id}`}>Kjøp billetter</Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recordings */}
                {recordings.length > 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-4">Opptak</h3>
                      <div className="space-y-2">
                        {recordings.map((recording) => (
                          <Link key={recording.id} href={`/se/${recording.id}`} className="block">
                            <Button variant="outline" className="w-full justify-start">
                              <Play className="h-4 w-4 mr-2" />
                              {recording.description || `Opptak - ${recording.quality}`}
                            </Button>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

