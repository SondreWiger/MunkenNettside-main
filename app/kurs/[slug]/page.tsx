import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Clock, Users, BookOpen } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { KursSignupCard } from "@/components/booking/kurs-signup-card"
import KursSessionList from "@/components/kurs/session-list"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { formatPrice, formatDateTime } from "@/lib/utils/booking"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Kurs | Teateret",
  description: "Teaterkurs detaljer",
}

const levelLabels: Record<string, string> = {
  beginner: "Nybegynner",
  intermediate: "Mellomliggende",
  advanced: "Avansert",
  mixed: "Blandet",
}

const levelColors: Record<string, string> = {
  beginner: "bg-blue-100 text-blue-800",
  intermediate: "bg-yellow-100 text-yellow-800",
  advanced: "bg-red-100 text-red-800",
  mixed: "bg-purple-100 text-purple-800",
}

async function getKurs(slug: string) {
  const supabase = await getSupabaseServerClient()

  const { data: kurs } = await supabase
    .from("kurs")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single()

  return kurs
}

async function getKursSessions(kursId: string) {
  const supabase = await getSupabaseServerClient()

  const { data: sessions } = await supabase
    .from("shows")
    .select(`*, venue:venues(*)`)
    .eq("kurs_id", kursId)
    .eq("type", "kurs_session")
    .gte("show_datetime", new Date().toISOString())
    .order("show_datetime", { ascending: true })

  return sessions || []
}

export default async function KursDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const kurs = await getKurs(slug)

  if (!kurs) {
    redirect("/kurs")
  }

  const spotsAvailable = kurs.max_participants - kurs.current_participants
  const isFull = spotsAvailable <= 0

  // Load upcoming kurs sessions (øvinger)
  const sessions = await getKursSessions(kurs.id)

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Breadcrumb */}
        <nav aria-label="Brødsmulesti" className="bg-[var(--card)] border-b border-[var(--muted)]">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <Link href="/kurs" className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Tilbake til kurs
            </Link>
          </div>
        </nav>

        {/* Hero with Image */}
        <header className="relative h-64 md:h-96 overflow-hidden">
          {kurs.banner_url ? (
            <Image src={kurs.banner_url} alt={kurs.title} fill className="object-cover" priority />
          ) : kurs.thumbnail_url ? (
            <Image src={kurs.thumbnail_url} alt={kurs.title} fill className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--muted)]">
              <BookOpen className="h-24 w-24 text-[var(--muted)]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-stage-black)/60] to-transparent" aria-hidden />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="max-w-3xl mx-auto px-4 text-[var(--color-on-hero)]">
              <Badge className="mb-3 bg-[var(--accent)] text-[var(--fg)]">{levelLabels[kurs.level] || kurs.level}</Badge>
              <h1 id="kurs-title" className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold">{kurs.title}</h1>
              {kurs.director && (
                <p className="mt-2 text-[var(--color-overlay-text)]">Instruktør: {kurs.director}</p>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid gap-10 lg:grid-cols-3">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Synopsis */}
                {kurs.synopsis_long && (
                  <article className="rounded-lg bg-[var(--card)] shadow-soft overflow-hidden" aria-labelledby="about-kurs">
                    <div className="p-6">
                      <h2 id="about-kurs" className="text-xl font-semibold mb-3">Om kurset</h2>
                      <p className="text-[var(--muted)] whitespace-pre-wrap">{kurs.synopsis_long}</p>
                    </div>
                  </article>
                )}

                {/* Details Grid */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-lg bg-[var(--card)] p-4 text-center shadow-soft">
                    <Clock className="h-6 w-6 text-[var(--accent)] mx-auto mb-2" aria-hidden />
                    <p className="text-sm text-[var(--muted)] mb-1">Varighet</p>
                    <p className="text-2xl font-bold">{kurs.duration_weeks} uker</p>
                  </div>

                  <div className="rounded-lg bg-[var(--card)] p-4 text-center shadow-soft">
                    <Users className="h-6 w-6 text-[var(--accent)] mx-auto mb-2" aria-hidden />
                    <p className="text-sm text-[var(--muted)] mb-1">Deltakere</p>
                    <p className="text-2xl font-bold">{kurs.current_participants}/{kurs.max_participants}</p>
                  </div>

                  <div className="rounded-lg bg-[var(--card)] p-4 text-center shadow-soft">
                    <BookOpen className="h-6 w-6 text-[var(--accent)] mx-auto mb-2" aria-hidden />
                    <p className="text-sm text-[var(--muted)] mb-1">Nivå</p>
                    <p className="text-lg font-bold">{levelLabels[kurs.level] || kurs.level}</p>
                  </div>
                </div>

                {/* Gallery */}
                {sessions && sessions.length > 0 && (
                  <div>
                    <KursSessionList sessions={sessions} />
                  </div>
                )}

                {kurs.gallery_images && Array.isArray(kurs.gallery_images) && kurs.gallery_images.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Galeri</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        {kurs.gallery_images.map((img: string, idx: number) => (
                          <div key={idx} className="aspect-video relative bg-muted rounded-lg overflow-hidden">
                            <Image
                              src={img}
                              alt={`Kursbilde ${idx + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <KursSignupCard kurs={kurs} slug={slug} isFull={isFull} spotsAvailable={spotsAvailable} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
