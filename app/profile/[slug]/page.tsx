import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, BookOpen, Ticket, Users } from "lucide-react"
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

  return {
    user,
    enrollments: enrollments || [],
    bookings: bookings || [],
    ensembleTeams: ensembleTeams || [],
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

  const { user, enrollments, bookings, ensembleTeams } = data

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
            <div className="grid gap-4 md:grid-cols-3">
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

        {/* Content */}
        <section className="py-12">
          <div className="container px-4">
            <div className="max-w-4xl">
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
