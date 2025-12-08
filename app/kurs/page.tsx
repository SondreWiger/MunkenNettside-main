import Link from "next/link"
import Image from "next/image"
import { Clock, Users, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { formatPrice } from "@/lib/utils/booking"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Kurs | Teateret",
  description: "Utforsk og registrer deg for teaterkurs",
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

async function getKurs() {
  const supabase = await getSupabaseServerClient()

  const { data: kurs } = await supabase
    .from("kurs")
    .select("*")
    .eq("is_published", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })

  return kurs || []
}

export default async function KursPage() {
  const kurs = await getKurs()
  const featured = kurs.filter((k) => k.featured)
  const regular = kurs.filter((k) => !k.featured)

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
          <div className="container px-4">
            <div className="flex items-center gap-4 mb-4">
              <BookOpen className="h-10 w-10" />
              <h1 className="text-4xl font-bold md:text-5xl">Teaterkurs</h1>
            </div>
            <p className="mt-4 text-xl text-primary-foreground/90 max-w-2xl">
              Lær, voksk og utforsk teaterkunsten gjennom våre varierte kurs. Fra nybegynnere til avanserte,
              vi har noe for alle!
            </p>
          </div>
        </section>

        {/* Featured Kurs */}
        {featured.length > 0 && (
          <section className="py-12 bg-muted/50">
            <div className="container px-4">
              <h2 className="text-2xl font-bold mb-8">Anbefalte kurs</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featured.map((k) => (
                  <Card
                    key={k.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                  >
                    <div className="aspect-video relative bg-muted shrink-0 overflow-hidden">
                      {k.thumbnail_url ? (
                        <Image
                          src={k.thumbnail_url}
                          alt={k.title}
                          fill
                          className="object-cover hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <BookOpen className="h-16 w-16 text-primary/30" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge className={levelColors[k.level] || "bg-gray-100 text-gray-800"}>
                          {levelLabels[k.level] || k.level}
                        </Badge>
                      </div>
                    </div>
                    <CardHeader className="flex-1">
                      <CardTitle className="line-clamp-2">{k.title}</CardTitle>
                      {k.director && <CardDescription>Instruktør: {k.director}</CardDescription>}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">{k.synopsis_short}</p>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>{k.duration_weeks} uker</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span>
                            {k.current_participants}/{k.max_participants}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-bold text-lg">{formatPrice(k.price_nok)}</span>
                        <Button asChild size="sm">
                          <Link href={`/kurs/${k.slug}`}>Se mer</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* All Kurs */}
        <section className="py-12">
          <div className="container px-4">
            <h2 className="text-2xl font-bold mb-8">Alle kurs</h2>

            {kurs.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {kurs.map((k) => (
                  <Card
                    key={k.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
                  >
                    <div className="aspect-video relative bg-muted shrink-0 overflow-hidden">
                      {k.thumbnail_url ? (
                        <Image
                          src={k.thumbnail_url}
                          alt={k.title}
                          fill
                          className="object-cover hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <BookOpen className="h-16 w-16 text-primary/30" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge className={levelColors[k.level] || "bg-gray-100 text-gray-800"}>
                          {levelLabels[k.level] || k.level}
                        </Badge>
                      </div>
                    </div>
                    <CardHeader className="flex-1">
                      <CardTitle className="line-clamp-2">{k.title}</CardTitle>
                      {k.director && <CardDescription>Instruktør: {k.director}</CardDescription>}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">{k.synopsis_short}</p>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>{k.duration_weeks} uker</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span>
                            {k.current_participants}/{k.max_participants}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-bold text-lg">{formatPrice(k.price_nok)}</span>
                        <Button asChild size="sm">
                          <Link href={`/kurs/${k.slug}`}>Se mer</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-lg">Ingen kurs tilgjengelig for øyeblikket</p>
                  <p className="text-sm text-muted-foreground mt-2">Kom tilbake senere for nye kurs</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
