import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, BookOpen, Ticket, Users, Shield, Crown, Theater, Star, Award, Zap, MapPin, Briefcase, Quote, Globe, Instagram, Facebook, Linkedin, Twitter, Github, Youtube, Music, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

function getUserBadges(user: any, ensembleTeams: any[], enrollments: any[], ensembleEnrollments: any[]) {
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

  // Ensemble member badges - check BOTH ensemble_team_members AND ensemble_enrollments
  const totalEnsembles = ensembleTeams.length + ensembleEnrollments.length
  if (totalEnsembles > 0) {
    badges.push({
      label: 'Ensemblemedlem',
      variant: 'outline' as const,
      icon: Users,
      description: `Medlem i ${totalEnsembles} ensemble${totalEnsembles > 1 ? 'r' : ''}`
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

  // VIP badge for users with many activities - include BOTH ensemble types
  const totalActivities = totalEnsembles + enrollments.length
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
    .eq("profile_slug", slug)
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

  // Get user's ensemble team memberships (LEGACY SYSTEM)
  const { data: ensembleTeams } = await supabase
    .from("ensemble_team_members")
    .select(`
      *,
      ensemble:ensembles(
        id, 
        title, 
        slug, 
        stage, 
        banner_url, 
        synopsis_short,
        yellow_team_name,
        blue_team_name
      )
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

  // Get user's featured roles (if enabled and is an actor)
  let featuredRoles = []
  if (user.show_featured_roles && actorId) {
    const { data: featured } = await supabase
      .from("featured_roles")
      .select(`
        *,
        role:roles(
          id,
          character_name,
          importance,
          ensemble:ensembles(id, title, slug, thumbnail_url, premiere_date)
        )
      `)
      .eq("user_id", user.id)
      .order("display_order", { ascending: true })
    
    featuredRoles = featured || []
  }

  // Get debug settings
  const { data: debugSettings } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "debug")
    .single()
  
  const showDebug = debugSettings?.value?.show_profile_ensemble_debug || false

  return {
    user,
    enrollments: enrollments || [],
    bookings: bookings || [],
    ensembleTeams: ensembleTeams || [],
    actorData,
    actorRoles,
    featuredRoles,
    userEnrollmentsWithShows: enrollmentsWithShows || [],
    showDebug,
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

  const { user, enrollments, bookings, ensembleTeams, actorData, actorRoles, featuredRoles, userEnrollmentsWithShows, showDebug } = data

  // Filter enrollments for productions currently "I produksjon" from NEW system (ensemble_enrollments)
  const activeProductionsNew = userEnrollmentsWithShows.filter((enrollment: any) => 
    enrollment.ensemble?.stage === "I produksjon"
  )

  // Also get active productions from LEGACY system (ensemble_team_members)
  const activeProductionsLegacy = ensembleTeams
    .filter((team: any) => team.ensemble?.stage === "I produksjon")
    .map((team: any) => ({
      id: team.id,
      status: team.team, // yellow or blue
      ensemble_id: team.ensemble_id,
      ensemble: team.ensemble,
      shows: [] // Legacy system doesn't have show tracking in the same way
    }))

  // Combine both systems
  const activeProductions = [...activeProductionsNew, ...activeProductionsLegacy]

  // Debug info for ensemble banner
  const debugInfo = {
    userName: user.full_name,
    newSystemEnrollments: userEnrollmentsWithShows.length,
    newSystemData: userEnrollmentsWithShows.map((e: any) => ({
      ensemble: e.ensemble?.title,
      stage: e.ensemble?.stage,
      status: e.status
    })),
    legacySystemMembers: ensembleTeams.length,
    legacySystemData: ensembleTeams.map((t: any) => ({
      ensemble: t.ensemble?.title,
      stage: t.ensemble?.stage,
      team: t.team
    })),
    activeProductionsNew: activeProductionsNew.length,
    activeProductionsLegacy: activeProductionsLegacy.length,
    totalActiveProductions: activeProductions.length,
    willShowBanner: activeProductions.length > 0
  }

  const debugText = JSON.stringify(debugInfo, null, 2)

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Debug Info Banner - Only show if enabled in admin settings */}
        {showDebug && (
          <div className="bg-yellow-50 border-b border-yellow-200">
            <div className="container px-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>🎭 Ensemble Banner Debug Info</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2">
                    <p className="font-semibold">User: {user.full_name}</p>
                    
                    <div className="border-t pt-2">
                      <p className="font-semibold">NEW System (ensemble_enrollments):</p>
                      <p className="text-sm">Total enrollments: {userEnrollmentsWithShows.length}</p>
                      <p className="text-sm">Active productions: {activeProductionsNew.length}</p>
                      {userEnrollmentsWithShows.length > 0 && (
                        <pre className="text-xs mt-1 bg-white p-2 rounded overflow-x-auto">
                          {JSON.stringify(debugInfo.newSystemData, null, 2)}
                        </pre>
                      )}
                    </div>

                    <div className="border-t pt-2">
                      <p className="font-semibold">LEGACY System (ensemble_team_members):</p>
                      <p className="text-sm">Total memberships: {ensembleTeams.length}</p>
                      <p className="text-sm">Active productions: {activeProductionsLegacy.length}</p>
                      {ensembleTeams.length > 0 && (
                        <pre className="text-xs mt-1 bg-white p-2 rounded overflow-x-auto">
                          {JSON.stringify(debugInfo.legacySystemData, null, 2)}
                        </pre>
                      )}
                    </div>

                    <div className="border-t pt-2">
                      <p className="font-semibold">RESULT:</p>
                      <p className="text-sm">Total active productions: {activeProductions.length}</p>
                      <p className="text-sm">
                        Banner will show: <span className="font-bold">{activeProductions.length > 0 ? "✅ YES" : "❌ NO"}</span>
                      </p>
                  </div>

                  <div className="border-t pt-2">
                    <p className="text-sm italic">WHY: Banner only shows for ensembles with stage = &quot;I produksjon&quot;</p>
                  </div>

                  <details className="border-t pt-2">
                    <summary className="cursor-pointer text-sm font-semibold">Copy Full JSON</summary>
                    <pre className="text-xs mt-2 bg-white p-2 rounded overflow-x-auto select-all">
                      {debugText}
                    </pre>
                  </details>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
        )}
        
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

        {/* Custom Banner */}
        {user.banner_url && (
          <section className="relative h-64 md:h-80 overflow-hidden border-b">
            <Image
              src={user.banner_url}
              alt={`${user.full_name} banner`}
              fill
              className="object-cover"
              priority
            />
            <div 
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, transparent 0%, ${user.profile_tint || '#6366f1'}22 100%)`
              }}
            />
          </section>
        )}

        {/* Profile Header with Custom Styling */}
        <section 
          className="relative py-12 border-b"
          style={{
            background: !user.banner_url 
              ? user.banner_style === 'gradient'
                ? `linear-gradient(135deg, ${user.profile_tint || '#6366f1'}22 0%, ${user.profile_tint || '#6366f1'}11 100%)`
                : user.banner_style === 'solid'
                ? `${user.profile_tint || '#6366f1'}22`
                : `linear-gradient(135deg, ${user.profile_tint || '#6366f1'}22 0%, ${user.profile_tint || '#6366f1'}11 100%)`
              : 'transparent'
          }}
        >
          <div className="container px-4 relative z-10">
            <div className="flex flex-col md:flex-row md:items-start gap-8">
              {/* Avatar */}
              <div className="flex-shrink-0" style={{ marginTop: user.banner_url ? '-80px' : '0' }}>
                {user.avatar_url ? (
                  <div 
                    className="h-32 w-32 relative rounded-full overflow-hidden shadow-xl bg-background"
                    style={{ 
                      borderWidth: '4px',
                      borderStyle: 'solid',
                      borderColor: user.profile_border_color || '#e5e7eb'
                    }}
                  >
                    <Image
                      src={user.avatar_url}
                      alt={user.full_name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div 
                    className="h-32 w-32 rounded-full flex items-center justify-center shadow-xl"
                    style={{ 
                      backgroundColor: `${user.profile_tint || '#6366f1'}33`,
                      borderWidth: '4px',
                      borderStyle: 'solid',
                      borderColor: user.profile_border_color || '#e5e7eb'
                    }}
                  >
                    <span 
                      className="text-4xl font-bold"
                      style={{ color: user.profile_text_color || '#000000' }}
                    >
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <h1 
                  className="text-4xl font-bold mb-2"
                  style={{ color: user.profile_text_color || 'inherit' }}
                >
                  {user.full_name}
                </h1>

                {/* Location & Occupation */}
                {(user.location || user.occupation) && (
                  <div 
                    className="flex flex-wrap gap-3 mb-3 text-muted-foreground"
                  >
                    {user.occupation && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        <span className="text-sm">{user.occupation}</span>
                      </div>
                    )}
                    {user.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{user.location}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* User Badges */}
                {(() => {
                  const badges = getUserBadges(user, ensembleTeams, enrollments, userEnrollmentsWithShows)
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
                  <p className="text-lg mb-4 text-muted-foreground">
                    {user.bio_short}
                  </p>
                )}

                {user.bio && (
                  <div className="whitespace-pre-wrap mb-6 max-w-2xl text-muted-foreground">
                    {user.bio}
                  </div>
                )}

                {/* Favorite Quote */}
                {user.favorite_quote && (
                  <div 
                    className="flex items-start gap-2 mb-6 p-4 rounded-lg border"
                    style={{ 
                      backgroundColor: `${user.profile_tint || '#6366f1'}11`,
                      borderColor: `${user.profile_tint || '#6366f1'}33`
                    }}
                  >
                    <Quote className="h-5 w-5 flex-shrink-0 mt-1" style={{ color: user.profile_tint || '#6366f1' }} />
                    <p className="italic text-muted-foreground">{user.favorite_quote}</p>
                  </div>
                )}

                {/* Interests, Skills, Languages */}
                {(user.interests?.length > 0 || user.skills?.length > 0 || user.languages_spoken?.length > 0) && (
                  <div className="space-y-3 mb-6">
                    {user.interests && user.interests.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2 text-muted-foreground">
                          Interesser
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {user.interests.map((interest: string, idx: number) => (
                            <Badge key={idx} variant="secondary">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {user.skills && user.skills.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2 text-muted-foreground">
                          Ferdigheter
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {user.skills.map((skill: string, idx: number) => (
                            <Badge key={idx} variant="default" style={{ backgroundColor: user.profile_tint || '#6366f1' }}>
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {user.languages_spoken && user.languages_spoken.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2 text-muted-foreground">
                          Språk
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {user.languages_spoken.map((lang: string, idx: number) => (
                            <Badge key={idx} variant="outline">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact & Social Links */}
                <div className="space-y-4">
                  {/* Contact Info */}
                  {(user.show_email || user.show_phone) && (
                    <div className="flex flex-col gap-2 text-sm">
                      {user.show_email && user.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${user.email}`} className="hover:underline">
                            {user.email}
                          </a>
                        </div>
                      )}
                      {user.show_phone && user.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <a href={`tel:${user.phone}`} className="hover:underline">
                            {user.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Social Links */}
                  {user.show_social_links && (
                    <div className="flex flex-wrap gap-3">
                      {user.website_url && (
                        <a href={user.website_url} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                          <Globe className="h-5 w-5" style={{ color: user.profile_tint || '#6366f1' }} />
                        </a>
                      )}
                      {user.instagram_url && (
                        <a href={user.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                          <Instagram className="h-5 w-5" style={{ color: user.profile_tint || '#6366f1' }} />
                        </a>
                      )}
                      {user.facebook_url && (
                        <a href={user.facebook_url} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                          <Facebook className="h-5 w-5" style={{ color: user.profile_tint || '#6366f1' }} />
                        </a>
                      )}
                      {user.linkedin_url && (
                        <a href={user.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                          <Linkedin className="h-5 w-5" style={{ color: user.profile_tint || '#6366f1' }} />
                        </a>
                      )}
                      {user.twitter_url && (
                        <a href={user.twitter_url} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                          <Twitter className="h-5 w-5" style={{ color: user.profile_tint || '#6366f1' }} />
                        </a>
                      )}
                      {user.github_url && (
                        <a href={user.github_url} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                          <Github className="h-5 w-5" style={{ color: user.profile_tint || '#6366f1' }} />
                        </a>
                      )}
                      {user.youtube_url && (
                        <a href={user.youtube_url} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                          <Youtube className="h-5 w-5" style={{ color: user.profile_tint || '#6366f1' }} />
                        </a>
                      )}
                      {user.tiktok_url && (
                        <a href={user.tiktok_url} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                          <Music className="h-5 w-5" style={{ color: user.profile_tint || '#6366f1' }} />
                        </a>
                      )}
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
              {/* Featured Roles Section (Actor Showcase) */}
              {user.show_featured_roles && featuredRoles.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
                    <Star className="h-7 w-7 text-yellow-500" />
                    Utvalgte Roller
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Mine stolteste prestasjoner på scenen
                  </p>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {featuredRoles.map((featured: any) => {
                      const role = featured.role
                      if (!role) return null
                      
                      return (
                        <Card key={featured.id} className="hover:shadow-xl transition-all hover:scale-105">
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              {(featured.featured_image_url || role.ensemble?.thumbnail_url) && (
                                <div className="relative w-full h-40 rounded-md overflow-hidden">
                                  <Image
                                    src={featured.featured_image_url || role.ensemble.thumbnail_url}
                                    alt={role.character_name}
                                    fill
                                    className="object-cover"
                                  />
                                  <div className="absolute top-2 right-2">
                                    <Badge className="bg-yellow-500 text-yellow-950">
                                      <Star className="h-3 w-3 mr-1" />
                                      Utvalgt
                                    </Badge>
                                  </div>
                                </div>
                              )}
                              <div>
                                <h3 className="font-bold text-lg">{role.character_name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {role.ensemble?.title}
                                </p>
                                {role.importance && (
                                  <Badge variant="outline" className="mt-2 text-xs">
                                    {role.importance === 'lead' ? 'Hovedrolle' : role.importance === 'supporting' ? 'Birolle' : 'Ensemble'}
                                  </Badge>
                                )}
                                {featured.notes && (
                                  <p className="text-sm text-muted-foreground mt-3 italic">
                                    &quot;{featured.notes}&quot;
                                  </p>
                                )}
                                {role.ensemble?.premiere_date && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Premiere: {new Date(role.ensemble.premiere_date).toLocaleDateString("no-NO")}
                                  </p>
                                )}
                              </div>
                              <Button asChild variant="default" size="sm" className="w-full">
                                <Link href={`/ensemble/${role.ensemble?.slug}`}>
                                  Se forestilling
                                </Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

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
