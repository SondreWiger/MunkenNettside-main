import { redirect } from "next/navigation"
import Link from "next/link"
import { Settings, Ticket, Film, CreditCard, LogOut, User, Mail, Phone, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { formatDate, formatPrice } from "@/lib/utils/booking"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Min profil | Teateret",
  description: "Administrer din konto og se dine kjøp",
}

async function getUserData() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  console.log("DEBUG - Current user ID:", user.id)

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

  const { data: purchases } = await supabase
    .from("purchases")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      show:shows(
        id,
        title,
        show_datetime,
        ensemble:ensembles(title),
        venue:venues(name)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: enrollments } = await supabase
    .from("kurs_enrollments")
    .select(`
      *,
      kurs:kurs(
        id,
        title,
        slug,
        level,
        director,
        price_nok
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })

  // Debug: Get ALL enrollments to see what exists
  const { data: allEnrollments, error: allError } = await supabase
    .from("ensemble_enrollments")
    .select(`
      id,
      user_id,
      ensemble_id,
      status,
      role,
      enrolled_at,
      reviewed_at
    `)
    .eq("user_id", user.id)
  
  console.log("DEBUG - ALL enrollments:", { allEnrollments, allError })

  const { data: ensembleEnrollments, error: ensembleError } = await supabase
    .from("ensemble_enrollments")
    .select(`
      id,
      user_id,
      ensemble_id,
      status,
      role,
      enrolled_at,
      reviewed_at
    `)
    .eq("user_id", user.id)
    .in("status", ["yellow", "blue"])
    .order("enrolled_at", { ascending: false })

  console.log("Ensemble enrollments query result (filtered):", { ensembleEnrollments, ensembleError })

  // Fetch ensemble details for each enrollment
  let ensembleEnrollmentsWithDetails: any[] = []
  if (ensembleEnrollments && ensembleEnrollments.length > 0) {
    const ensembleIds = ensembleEnrollments.map((e) => e.ensemble_id)
    const { data: ensembles } = await supabase
      .from("ensembles")
      .select("id, title, slug, yellow_team_name, blue_team_name")
      .in("id", ensembleIds)
    
    ensembleEnrollmentsWithDetails = ensembleEnrollments.map((enrollment) => ({
      ...enrollment,
      ensemble: ensembles?.find((e) => e.id === enrollment.ensemble_id),
    }))
    console.log("Processed ensemble enrollments:", ensembleEnrollmentsWithDetails)
  } else {
    console.log("No ensemble enrollments found for user", user.id)
  }

  return {
    user,
    profile,
    purchases: purchases || [],
    bookings: bookings || [],
    enrollments: enrollments || [],
    ensembleEnrollments: ensembleEnrollmentsWithDetails,
  }
}

export default async function UserProfilePage() {
  const data = await getUserData()

  if (!data) {
    redirect("/logg-inn?redirect=/dashboard")
  }

  const { user, profile, purchases, bookings, enrollments, ensembleEnrollments } = data

  const confirmedBookings = bookings.filter((b) => b.status === "confirmed")
  const usedBookings = bookings.filter((b) => b.status === "used")
  const completedPurchases = purchases.filter((p) => p.status === "completed")

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-12">
          <div className="container px-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">
                  Hallo, {profile?.full_name?.split(" ")[0] || "bruker"}! 👋
                </h1>
                <p className="mt-2 text-primary-foreground/90 text-lg">
                  Velkommen til din personlige dashboard
                </p>
              </div>
              <div className="flex gap-3">
                <Button asChild variant="secondary" size="lg">
                  <Link href="/dashboard/innstillinger" className="gap-2">
                    <Settings className="h-5 w-5" />
                    Innstillinger
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="py-8 bg-muted/50 border-b">
          <div className="container px-4">
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ensembler</p>
                      <p className="text-2xl font-bold">{ensembleEnrollments.length}</p>
                    </div>
                    <User className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Aktive billetter</p>
                      <p className="text-2xl font-bold">{confirmedBookings.length}</p>
                    </div>
                    <Ticket className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Brukte billetter</p>
                      <p className="text-2xl font-bold">{usedBookings.length}</p>
                    </div>
                    <Badge variant="outline" className="h-8 w-8 flex items-center justify-center">
                      ✓
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Kjøpte opptak</p>
                      <p className="text-2xl font-bold">{completedPurchases.length}</p>
                    </div>
                    <Film className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>

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
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="container px-4">
            <Tabs defaultValue="bookings" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="bookings" className="gap-2">
                  <Ticket className="h-4 w-4" />
                  <span className="hidden sm:inline">Billetter</span>
                </TabsTrigger>
                <TabsTrigger value="kurs" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Kurs</span>
                </TabsTrigger>
                <TabsTrigger value="purchases" className="gap-2">
                  <Film className="h-4 w-4" />
                  <span className="hidden sm:inline">Opptak</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Profil</span>
                </TabsTrigger>
              </TabsList>

              {/* Bookings Tab */}
              <TabsContent value="bookings" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Mine billetter</h2>

                  {confirmedBookings.length > 0 ? (
                    <div className="space-y-4">
                      {confirmedBookings.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                  <Ticket className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">
                                    {booking.show?.title ||
                                      booking.show?.ensemble?.title ||
                                      "Forestilling"}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    Ref: {booking.booking_reference}
                                  </p>
                                </div>
                              </div>

                              <div className="grid gap-2 md:grid-cols-3 text-sm text-muted-foreground">
                                <div>
                                  <p className="font-medium text-foreground">Dato</p>
                                  {booking.show?.show_datetime && (
                                    <p>{formatDate(booking.show.show_datetime)}</p>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">Sted</p>
                                  <p>{booking.show?.venue?.name || "—"}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">Billetter</p>
                                  <p>{booking.seat_ids?.length || 0} plasser</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Badge className="bg-green-100 text-green-800">Bekreftet</Badge>
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/bekreftelse/${booking.id}`}>Se QR-kode</Link>
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-muted/30 border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Ticket className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground text-lg font-medium">Du har ingen aktive billetter</p>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">
                          Bestill billetter til kommende forestillinger
                        </p>
                        <Button asChild>
                          <Link href="/forestillinger">Se forestillinger</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {usedBookings.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-xl font-bold mb-4">Tidligere billetter ({usedBookings.length})</h3>
                      <div className="grid gap-3">
                        {usedBookings.map((booking) => (
                          <Card key={booking.id} className="opacity-75">
                            <CardContent className="py-3 px-6">
                              <p className="font-medium">
                                {booking.show?.title ||
                                  booking.show?.ensemble?.title ||
                                  "Forestilling"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {booking.show?.show_datetime && formatDate(booking.show.show_datetime)}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Kurs Tab */}
              <TabsContent value="kurs" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Mine kurs</h2>

                  {enrollments.length > 0 ? (
                    <div className="space-y-4">
                      {enrollments.map((enrollment) => (
                        <Card key={enrollment.id} className="overflow-hidden hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                  <BookOpen className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">{enrollment.kurs?.title}</h3>
                                  {enrollment.kurs?.director && (
                                    <p className="text-sm text-muted-foreground">
                                      Instruktør: {enrollment.kurs.director}
                                    </p>
                                  )}
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Påmeldt {formatDate(enrollment.confirmed_at || enrollment.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">{enrollment.kurs?.level || 'Begynner'}</Badge>
                                {enrollment.amount_paid_nok > 0 && (
                                  <Badge variant="outline">{formatPrice(enrollment.amount_paid_nok)}</Badge>
                                )}
                                {enrollment.amount_paid_nok === 0 && (
                                  <Badge variant="outline">Gratis</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button asChild size="sm">
                                <Link href={`/kurs/${enrollment.kurs?.slug}`}>
                                  Se kurs
                                </Link>
                              </Button>
                              <Button variant="outline" size="sm">
                                Kontakt instruktør
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground py-8">
                          Du er ikke påmeldt noen kurs ennå.{" "}
                          <Link href="/kurs" className="text-primary hover:underline">
                            Finn et kurs
                          </Link>
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Purchases Tab */}
              <TabsContent value="purchases" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Mine kjøp</h2>

                  {completedPurchases.length > 0 ? (
                    <div className="space-y-4">
                      {completedPurchases.map((purchase) => (
                        <Card key={purchase.id} className="overflow-hidden hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                  <Film className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">Opptakskjøp</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {purchase.recording_ids?.length || 0} opptak
                                  </p>
                                </div>
                              </div>

                              <div className="grid gap-2 md:grid-cols-3 text-sm text-muted-foreground">
                                <div>
                                  <p className="font-medium text-foreground">Kjøpt</p>
                                  <p>{formatDate(purchase.created_at)}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">Beløp</p>
                                  <p className="font-bold text-foreground">
                                    {formatPrice(purchase.amount_paid_nok)}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">Tilgang</p>
                                  <p>
                                    {purchase.access_expires_at
                                      ? new Date(purchase.access_expires_at) > new Date()
                                        ? "Aktiv"
                                        : "Utløpt"
                                      : "Permanent"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Badge className="bg-blue-100 text-blue-800">Fullført</Badge>
                              <Button asChild variant="outline" size="sm">
                                <Link href="/mine-opptak">Se opptak</Link>
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-muted/30 border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Film className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground text-lg font-medium">Du har ikke kjøpt opptak ennå</p>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">
                          Kjøp opptak fra forestillinger
                        </p>
                        <Button asChild>
                          <Link href="/opptak">Se opptak</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Profilinformasjon</h2>

                  <Card>
                    <CardHeader>
                      <CardTitle>Dine detaljer</CardTitle>
                      <CardDescription>Personlig informasjon knyttet til kontoen din</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Name */}
                      <div className="border-b pb-4 last:border-b-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Fullt navn</p>
                            <p className="text-lg font-semibold mt-1">{profile?.full_name || "—"}</p>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href="/dashboard/innstillinger">Rediger</Link>
                          </Button>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="border-b pb-4 last:border-b-0">
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">E-post</p>
                            <p className="text-lg font-semibold mt-1">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="border-b pb-4 last:border-b-0">
                        <div className="flex items-center gap-3">
                          <Phone className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Telefon</p>
                            <p className="text-lg font-semibold mt-1">{profile?.phone || "Ikke lagt til"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Joined Date */}
                      <div className="border-b pb-4 last:border-b-0">
                        <p className="text-sm font-medium text-muted-foreground">Medlem siden</p>
                        <p className="text-lg font-semibold mt-1">{formatDate(profile?.created_at)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Ensemble Assignments */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Ensembletildelinger</CardTitle>
                      <CardDescription>Dine tildelinger til teaterensembler</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {ensembleEnrollments && ensembleEnrollments.length > 0 ? (
                        ensembleEnrollments.map((enrollment) => (
                          <div key={enrollment.id} className="border-b pb-4 last:border-b-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-semibold text-lg">{enrollment.ensemble?.title || "—"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {enrollment.status === "yellow"
                                    ? enrollment.ensemble?.yellow_team_name || "Gult lag"
                                    : enrollment.ensemble?.blue_team_name || "Blått lag"}
                                </p>
                              </div>
                              <Badge
                                className={
                                  enrollment.status === "yellow"
                                    ? "bg-yellow-100 text-yellow-900"
                                    : "bg-blue-100 text-blue-900"
                                }
                              >
                                {enrollment.status === "yellow" ? "Gult lag" : "Blått lag"}
                              </Badge>
                            </div>

                            {enrollment.role && (
                              <p className="text-sm">
                                <span className="font-medium text-foreground">Rolle:</span>
                                <span className="text-foreground ml-2">{enrollment.role}</span>
                              </p>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                              Tildelt: {formatDate(enrollment.reviewed_at || enrollment.enrolled_at)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-6">
                          Du er ikke tildelt noen ensembler ennå
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Account Actions */}
                  <Card className="border-destructive/50 mt-6">
                    <CardHeader>
                      <CardTitle className="text-destructive">Kontokontroll</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/dashboard/innstillinger" className="gap-2">
                          <Settings className="h-4 w-4" />
                          Innstillinger og sikkerhet
                        </Link>
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Administrer passord, to-faktor-autentisering og andre sikkerhetskontroller.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
