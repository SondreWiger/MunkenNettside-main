import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, BookOpen, Ticket, Users, Shield, Crown, Theater, Star, Award, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

function getUserBadges(user: any, ensembleTeams: any[], enrollments: any[]) {
  const badges = []

  // Role badges
  if (user.role === 'admin') {
    badges.push({
      label: 'Administrator',
      variant: 'destructive' as const,
      icon: Crown,
      description: 'Systemadministrator'
    })
  } else if (user.role === 'staff') {
    badges.push({
      label: 'Ansatt',
      variant: 'default' as const,
      icon: Shield,
      description: 'Teaterpersonale'
    })
  }

  // Actor badge (if linked to an actor)
  if (user.actor_id || user.has_actor_profile) {
    badges.push({
      label: 'Skuespiller',
      variant: 'secondary' as const,
      icon: Theater,
      description: 'Registrert skuespiller'
    })
  }

  // Ensemble member badges
  if (ensembleTeams.length > 0) {
    badges.push({
      label: 'Ensemblemedlem',
      variant: 'outline' as const,
      icon: Users,
      description: `Medlem i ${ensembleTeams.length} ensemble${ensembleTeams.length > 1 ? 'r' : ''}`
    })
  }

  // Course enthusiast badge
  if (enrollments.length >= 3) {
    badges.push({
      label: 'Kursentusiast',
      variant: 'secondary' as const,
      icon: Award,
      description: `Fullført ${enrollments.length} kurs`
    })
  }

  // VIP badge for users with many activities
  const totalActivities = ensembleTeams.length + enrollments.length
  if (totalActivities >= 5) {
    badges.push({
      label: 'VIP Medlem',
      variant: 'default' as const,
      icon: Star,
      description: 'Meget aktiv bruker'
    })
  }

  // Early adopter badge (example - users created in first month)
  const createdAt = new Date(user.created_at)
  const isEarlyAdopter = createdAt < new Date('2024-01-01') // Adjust date as needed
  if (isEarlyAdopter) {
    badges.push({
      label: 'Tidlig Adopter',
      variant: 'outline' as const,
      icon: Zap,
      description: 'Blant de første brukerne'
    })
  }

  return badges
}

async function getUserProfile(slug: string) {
  const supabase = await getSupabaseServerClient()

  // Get user by slug
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .single()

  if (!user) return null

  // Check if user has actor profile (for badge display)
  const { data: actorCheck } = await supabase
    .from("actors")
    .select("id")
    .eq("user_id", user.id)
    .single()
  
  user.has_actor_profile = !!actorCheck

  // Get user's ensemble enrollments with team info
  const { data: userEnrollments } = await supabase
    .from("ensemble_enrollments")
    .select(`
      id,
      status,
      ensemble_id,
      ensemble:ensembles (
        id,
        title,
        slug,
        stage,
        synopsis_short,
        banner_url,
        yellow_team_name,
        blue_team_name
      )
    `)
    .eq("user_id", user.id)
    .in("status", ["yellow", "blue"])

  // For each enrollment, get shows for their team
  const enrollmentsWithShows = await Promise.all(
    (userEnrollments || []).map(async (enrollment: any) => {
      const { data: shows } = await supabase
        .from("shows")
        .select(`
          id,
          title,
          show_datetime,
          team,
          status,
          venue:venues(name, city)
        `)
        .eq("ensemble_id", enrollment.ensemble_id)
        .eq("team", enrollment.status) // yellow or blue
        .gte("show_datetime", new Date().toISOString())
        .order("show_datetime", { ascending: true })
        .limit(5)

      return {
        ...enrollment,
        shows: shows || []
      }
    })
  )

  // Get user's confirmed kurs enrollments
  const { data: enrollments } = await supabase
    .from("kurs_enrollments")
    .select(`
      *,
      kurs:kurs(
        id,
        title,
        slug,
        level
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })

  // Get user's confirmed bookings (shows attended)
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      show:shows(
        id,
        title,
        ensemble:ensembles(title)
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "used")
    .order("created_at", { ascending: false })
    .limit(5)

  // Get user's ensemble team memberships
  const { data: ensembleTeams } = await supabase
    .from("ensemble_team_members")
    .select(`
      *,
      ensemble:ensembles(id, title, slug)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // Get actor data and roles if user is linked to an actor
  let actorData = null
  let actorRoles = []
  
  // First check if user has actor_id field
  let actorId = user.actor_id
  
  // If not, find actor by user_id (new method)
  if (!actorId) {
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single()
    
    if (actor) {
      actorId = actor.id
    }
  }
  
  if (actorId) {
    // Get actor profile
    const { data: actor } = await supabase
      .from("actors")
      .select("*")
      .eq("id", actorId)
      .single()
    
    actorData = actor

    // Get roles played by this actor
    const { data: roles } = await supabase
      .from("roles")
      .select(`
        *,
        ensemble:ensembles(id, title, slug, thumbnail_url, premiere_date)
      `)
      .or(`yellow_actor_id.eq.${actorId},blue_actor_id.eq.${actorId}`)
      .order("created_at", { ascending: false })

    actorRoles = roles || []
  }

  return {
    user,
    enrollments: enrollments || [],
    bookings: bookings || [],
    ensembleTeams: ensembleTeams || [],
    actorData,
    actorRoles,
    userEnrollmentsWithShows: enrollmentsWithShows || [],
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const data = await getUserProfile(slug)

  if (!data) {
    return { title: "Profil ikke funnet | Teateret" }
  }

  return {
    title: `${data.user.full_name} | Teateret`,
    description: data.user.bio_short || `Profil for ${data.user.full_name}`,
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params
  const data = await getUserProfile(slug)

  if (!data) {
    notFound()
  }

  const { user, enrollments, bookings, ensembleTeams, actorData, actorRoles, userEnrollmentsWithShows } = data

  // Filter enrollments for productions currently "I produksjon"
  const activeProductions = userEnrollmentsWithShows.filter((enrollment: any) => 
    enrollment.ensemble?.stage === "I produksjon"
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-muted/50 border-b">
          <div className="container px-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Tilbake
            </Link>
          </div>
        </div>

        {/* Profile Header */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-12 border-b">
          <div className="container px-4">
            <div className="flex flex-col md:flex-row md:items-start gap-8">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {user.avatar_url ? (
                  <div className="h-32 w-32 relative rounded-full overflow-hidden bg-muted">
                    <Image
                      src={user.avatar_url}
                      alt={user.full_name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-32 w-32 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-4xl font-bold text-primary/50">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{user.full_name}</h1>

                {/* User Badges */}
                {(() => {
                  const badges = getUserBadges(user, ensembleTeams, enrollments)
                  if (badges.length === 0) return null
                  
                  return (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {badges.map((badge, index) => {
                        const Icon = badge.icon
                        return (
                          <Badge
                            key={index}
                            variant={badge.variant}
                            className="flex items-center gap-1 px-3 py-1"
                            title={badge.description}
                          >
                            <Icon className="h-3 w-3" />
                            {badge.label}
                          </Badge>
                        )
                      })}
                    </div>
                  )
                })()}

                {user.bio_short && (
                  <p className="text-lg text-muted-foreground mb-4">{user.bio_short}</p>
                )}

                {user.bio_long && (
                  <div className="text-muted-foreground whitespace-pre-wrap mb-6 max-w-2xl">
                    {user.bio_long}
                  </div>
                )}

                {/* Contact Info */}
                <div className="flex flex-col gap-2 text-sm">
                  {user.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${user.email}`} className="hover:text-foreground">
                        {user.email}
                      </a>
                    </div>
                  )}
                  {user.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${user.phone}`} className="hover:text-foreground">
                        {user.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-8 bg-muted/50 border-b">
          <div className="container px-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Kurs påmeldt</p>
                      <p className="text-2xl font-bold">{enrollments.length}</p>
                    </div>
                    <BookOpen className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Forestillinger</p>
                      <p className="text-2xl font-bold">{bookings.length}</p>
                    </div>
                    <Ticket className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>

              {actorRoles && actorRoles.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Roller spilt</p>
                        <p className="text-2xl font-bold">{actorRoles.length}</p>
                      </div>
                      <Theater className="h-8 w-8 text-primary opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Medlem siden</p>
                      <p className="text-lg font-bold">
                        {new Date(user.created_at).toLocaleDateString("no-NO", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Active Productions - IMDB Style Banner */}
        {activeProductions.length > 0 && activeProductions.map((production: any) => {
          const ensemble = production.ensemble
          const teamName = production.status === "yellow" 
            ? ensemble.yellow_team_name || "Gult lag"
            : ensemble.blue_team_name || "Blått lag"
          
          return (
            <section 
              key={production.id}
              className="relative w-full min-h-[400px] flex items-center justify-center overflow-hidden"
              style={{
                backgroundImage: ensemble.banner_url 
                  ? `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${ensemble.banner_url})`
                  : `linear-gradient(135deg, ${user.profile_tint || '#6366f1'} 0%, ${user.profile_tint || '#6366f1'}dd 100%)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="container px-4 py-16 relative z-10">
                <div className="max-w-4xl mx-auto text-center text-white">
                  <Badge className="mb-4 bg-white/20 text-white border-white/40 backdrop-blur-sm">
                    Nå i produksjon
                  </Badge>
                  
                  <h2 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">
                    {ensemble.title}
                  </h2>
                  
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <Badge 
                      className={
                        production.status === "yellow"
                          ? "bg-yellow-500/90 text-yellow-950 border-yellow-400"
                          : "bg-blue-500/90 text-blue-950 border-blue-400"
                      }
                    >
                      {teamName}
                    </Badge>
                  </div>

                  {ensemble.synopsis_short && (
                    <p className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl mx-auto drop-shadow">
                      {ensemble.synopsis_short}
                    </p>
                  )}

                  {production.shows && production.shows.length > 0 && (
                    <div className="bg-black/40 backdrop-blur-md rounded-lg p-6 border border-white/20">
                      <h3 className="text-xl font-semibold mb-4 flex items-center justify-center gap-2">
                        <Ticket className="h-5 w-5" />
                        Kommende forestillinger ({teamName})
                      </h3>
                      
                      <div className="space-y-3">
                        {production.shows.slice(0, 3).map((show: any) => (
                          <div 
                            key={show.id} 
                            className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/10"
                          >
                            <div className="text-left flex-1">
                              <p className="font-semibold">
                                {show.title || ensemble.title}
                              </p>
                              <p className="text-sm text-white/70">
                                {show.venue?.name && `${show.venue.name}, ${show.venue.city || ''}`}
                              </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                              <div className="text-right sm:text-left">
                                <p className="text-sm font-medium">
                                  {new Date(show.show_datetime).toLocaleDateString("no-NO", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </p>
                                <p className="text-sm text-white/70">
                                  {new Date(show.show_datetime).toLocaleTimeString("no-NO", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              <Button 
                                asChild 
                                size="sm"
                                className="bg-white text-black hover:bg-white/90 whitespace-nowrap"
                              >
                                <Link href={`/bestill/${show.id}`}>
                                  <Ticket className="h-4 w-4 mr-1" />
                                  Kjøp billett
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {production.shows.length > 3 && (
                        <p className="text-sm text-white/60 mt-4">
                          +{production.shows.length - 3} flere forestillinger
                        </p>
                      )}

                      <Button 
                        asChild 
                        className="mt-6 bg-white text-black hover:bg-white/90"
                      >
                        <Link href={`/ensemble/${ensemble.slug}`}>
                          Se produksjon
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )
        })}

        {/* Content */}
        <section className="py-12">
          <div className="container px-4">
            <div className="max-w-4xl">
              {/* Actor Section */}
              {actorData && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Theater className="h-6 w-6" />
                    Skuespiller profil
                  </h2>
                  
                  <Card className="mb-6">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        {actorData.photo_url && (
                          <div className="flex-shrink-0">
                            <Image
                              src={actorData.photo_url}
                              alt={actorData.name}
                              width={150}
                              height={200}
                              className="rounded-lg object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2">{actorData.name}</h3>
                          {actorData.bio && (
                            <p className="text-muted-foreground mb-4 whitespace-pre-wrap">
                              {actorData.bio}
                            </p>
                          )}
                          <div className="flex flex-col gap-2 text-sm">
                            {actorData.contact_email && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <a href={`mailto:${actorData.contact_email}`} className="hover:text-foreground">
                                  {actorData.contact_email}
                                </a>
                              </div>
                            )}
                            {actorData.contact_phone && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <a href={`tel:${actorData.contact_phone}`} className="hover:text-foreground">
                                  {actorData.contact_phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actor Roles */}
                  {actorRoles.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Roller spilt</h3>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {actorRoles.map((role) => (
                          <Card key={role.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-4">
                              <div className="space-y-3">
                                {role.ensemble?.thumbnail_url && (
                                  <div className="relative w-full h-32 rounded-md overflow-hidden">
                                    <Image
                                      src={role.ensemble.thumbnail_url}
                                      alt={role.ensemble.title}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-semibold text-sm text-primary">
                                    {role.ensemble?.title}
                                  </h4>
                                  <p className="font-medium">{role.character_name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {role.importance}
                                    </Badge>
                                    <Badge variant={role.yellow_actor_id === actorData.id ? "default" : "secondary"} className="text-xs">
                                      {role.yellow_actor_id === actorData.id ? "Gult lag" : "Blått lag"}
                                    </Badge>
                                  </div>
                                  {role.ensemble?.premiere_date && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Premiere: {new Date(role.ensemble.premiere_date).toLocaleDateString("no-NO")}
                                    </p>
                                  )}
                                </div>
                                <Button asChild variant="outline" size="sm" className="w-full">
                                  <Link href={`/ensemble/${role.ensemble?.slug}`}>
                                    Se ensemble
                                  </Link>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Kurs Section */}
              {enrollments.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <BookOpen className="h-6 w-6" />
                    Kurs påmeldt
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {enrollments.map((enrollment) => (
                      <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{enrollment.kurs?.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <Badge className="w-fit">{enrollment.kurs?.level || "Begynner"}</Badge>
                            <p className="text-sm text-muted-foreground">
                              Påmeldt{" "}
                              {new Date(enrollment.created_at).toLocaleDateString("no-NO", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                            <Button asChild variant="outline" size="sm" className="w-full">
                              <Link href={`/kurs/${enrollment.kurs?.slug}`}>
                                Se kurset
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Forestillinger Section */}
              {bookings.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Ticket className="h-6 w-6" />
                    Forestillinger deltatt
                  </h2>
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <Card key={booking.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {booking.show?.title || "Forestilling"}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground font-normal">
                            {booking.show?.ensemble?.title}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              {new Date(booking.created_at).toLocaleDateString("no-NO", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                            <Badge variant="outline">Deltatt ✓</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Ensemble Teams Section */}
              {ensembleTeams.length > 0 && (
                <div className={bookings.length > 0 ? "mt-12" : ""}>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    Ensemble medlemskap
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {ensembleTeams.map((team) => (
                      <Card key={team.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{team.ensemble?.title}</CardTitle>
                          <p className="text-sm text-muted-foreground font-normal">
                            {team.team === "yellow" ? "Gult lag" : "Blått lag"}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-muted-foreground">Rolle</p>
                              <p className="font-semibold">{team.role}</p>
                            </div>
                            <Button asChild variant="outline" size="sm" className="w-full">
                              <Link href={`/ensemble/${team.ensemble?.slug}`}>
                                Se ensemble
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {enrollments.length === 0 && bookings.length === 0 && ensembleTeams.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground py-12">
                      Ingen aktivitet ennå. Denne brukeren venter på sitt første kurs eller forestilling!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
