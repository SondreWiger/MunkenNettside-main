import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Clock, Users, BookOpen } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { KursSignupCard } from "@/components/booking/kurs-signup-card"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { formatPrice } from "@/lib/utils/booking"

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

export default async function KursDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const kurs = await getKurs(slug)

  if (!kurs) {
    redirect("/kurs")
  }

  const spotsAvailable = kurs.max_participants - kurs.current_participants
  const isFull = spotsAvailable <= 0

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-muted/50 border-b">
          <div className="container px-4 py-3">
            <Link
              href="/kurs"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Tilbake til kurs
            </Link>
          </div>
        </div>

        {/* Hero with Image */}
        <div className="relative h-64 md:h-96 bg-muted overflow-hidden">
          {kurs.banner_url ? (
            <Image
              src={kurs.banner_url}
              alt={kurs.title}
              fill
              className="object-cover"
              priority
            />
          ) : kurs.thumbnail_url ? (
            <Image
              src={kurs.thumbnail_url}
              alt={kurs.title}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <BookOpen className="h-24 w-24 text-primary/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="container px-4">
              <Badge className={`${levelColors[kurs.level]} mb-3`}>
                {levelLabels[kurs.level] || kurs.level}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold">{kurs.title}</h1>
              {kurs.director && (
                <p className="mt-2 text-white/80">Instruktør: {kurs.director}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <section className="py-12">
          <div className="container px-4">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Synopsis */}
                {kurs.synopsis_long && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Om kurset</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {kurs.synopsis_long}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Details Grid */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <Clock className="h-8 w-8 text-primary mb-2" />
                        <p className="text-sm text-muted-foreground mb-1">Varighet</p>
                        <p className="text-2xl font-bold">{kurs.duration_weeks} uker</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <Users className="h-8 w-8 text-primary mb-2" />
                        <p className="text-sm text-muted-foreground mb-1">Deltakere</p>
                        <p className="text-2xl font-bold">
                          {kurs.current_participants}/{kurs.max_participants}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <BookOpen className="h-8 w-8 text-primary mb-2" />
                        <p className="text-sm text-muted-foreground mb-1">Nivå</p>
                        <p className="text-lg font-bold">
                          {levelLabels[kurs.level] || kurs.level}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Gallery */}
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
