import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Copy, Home, Calendar, Users, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

interface PageProps {
  params: { slug: string }
  searchParams: { reference?: string }
}

async function getEnrollmentData(reference: string, slug: string) {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get enrollment
  const { data: enrollment } = await supabase
    .from("kurs_enrollments")
    .select("*")
    .eq("enrollment_reference", reference)
    .eq("user_id", user.id)
    .single()

  if (!enrollment) return null

  // Get kurs
  const { data: kurs } = await supabase
    .from("kurs")
    .select("*")
    .eq("id", enrollment.kurs_id)
    .eq("slug", slug)
    .single()

  return { enrollment, kurs, user }
}

export default async function EnrollmentConfirmationPage({
  params,
  searchParams,
}: PageProps) {
  const reference = searchParams.reference

  if (!reference) {
    redirect(`/kurs/${params.slug}`)
  }

  const data = await getEnrollmentData(reference, params.slug)

  if (!data) {
    redirect(`/kurs/${params.slug}`)
  }

  const { enrollment, kurs, user } = data
  const isPending = enrollment.status === "pending"

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-r from-green-50 to-emerald-50 border-b py-12">
          <div className="container px-4">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Påmelding bekreftet!</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                  {isPending
                    ? "Din påmelding venter på betalingsbekreftelse"
                    : "Din påmelding er bekreftet og betalt"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="container px-4 max-w-4xl">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Main */}
              <div className="lg:col-span-2 space-y-6">
                {/* Enrollment Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Påmeldingsdetaljer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">
                          Påmeldingsreferanse
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-lg font-mono font-bold">
                            {enrollment.enrollment_reference}
                          </code>
                          <Copy className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Status</p>
                        <div className="mt-1">
                          <Badge
                            className={
                              isPending ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                            }
                          >
                            {isPending ? "Venter på betaling" : "Bekreftet"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground font-medium mb-2">Påmeldt e-post</p>
                      <p className="font-semibold">{user.email}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Course Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Kurs informasjon</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold mb-3">{kurs.title}</h3>
                      <p className="text-muted-foreground">{kurs.synopsis_short}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 py-4 border-t border-b">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Varighet</p>
                          <p className="font-semibold">{kurs.duration_weeks} uker</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Deltakere</p>
                          <p className="font-semibold">
                            {kurs.current_participants}/{kurs.max_participants}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Nivå</p>
                          <p className="font-semibold capitalize">{kurs.level}</p>
                        </div>
                      </div>
                    </div>

                    {kurs.director && (
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Instruktør</p>
                        <p className="font-semibold mt-1">{kurs.director}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Next Steps */}
                {isPending && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-blue-900">Neste steg</CardTitle>
                    </CardHeader>
                    <CardContent className="text-blue-800 space-y-3">
                      <p>
                        1. En betalingslink har blitt sendt til <strong>{user.email}</strong>
                      </p>
                      <p>2. Følg lenken og fullfør betalingen via Vipps</p>
                      <p>3. Du vil motta en bekreftelse på e-post når betalingen er godkjent</p>
                      <p className="text-sm mt-4">
                        Betalingslinken utløper om 24 timer. Kontakt oss hvis du har problemer.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {!isPending && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-green-900">Påmeldingen er fullført!</CardTitle>
                    </CardHeader>
                    <CardContent className="text-green-800 space-y-3">
                      <p>✓ Din påmelding er bekreftet og betalingen er mottatt</p>
                      <p>
                        ✓ Du vil snart motta e-post med detaljer om kursstart og oppmøte
                      </p>
                      <p>
                        ✓ Du kan se alle dine påmeldinger på{" "}
                        <Link href="/dashboard" className="font-bold underline">
                          min side
                        </Link>
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <Card className="sticky top-20">
                  <CardHeader>
                    <CardTitle>Beløp</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>Kurs pris</span>
                      <span className="font-bold">{enrollment.amount_paid_nok.toLocaleString('no-NO', { style: 'currency', currency: 'NOK' })}</span>
                    </div>

                    <div className="text-2xl font-bold text-primary">
                      {enrollment.amount_paid_nok.toLocaleString('no-NO', { style: 'currency', currency: 'NOK' })}
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                      <Button asChild className="w-full" variant="outline">
                        <Link href="/dashboard" className="gap-2">
                          <Home className="h-4 w-4" />
                          Min side
                        </Link>
                      </Button>
                      <Button asChild className="w-full" variant="ghost">
                        <Link href="/kurs">Tilbake til kurs</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
