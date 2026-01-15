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
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Hero */}
        <section className="py-20 bg-[var(--card)] border-b border-[var(--muted)]">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center gap-4 mb-4">
              <BookOpen className="h-10 w-10 text-[var(--accent)]" aria-hidden />
              <div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold">Teaterkurs</h1>
                <p className="mt-2 text-[var(--muted)] text-lg max-w-2xl">Lær, voks og utforsk teaterkunsten gjennom våre varierte kurs. Fra nybegynnere til avanserte — vi har noe for alle.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Kurs */}
        {featured.length > 0 && (
          <section className="py-12 lg:py-20 bg-slate-50">
            <div className="container px-4">
              <div className="mb-12 text-center">
                <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                  Anbefalte kurs
                </h2>
                <p className="text-lg text-slate-600">
                  Våre mest populære og anbefalte kurs for å komme i gang
                </p>
              </div>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {featured.map((k) => (
                  <Card key={k.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0 shadow-lg bg-white">
                    <div className="aspect-[16/10] bg-gradient-to-br from-blue-100 to-blue-200 relative">
                      {k.thumbnail_url ? (
                        <Image src={k.thumbnail_url} alt={k.title} fill className="object-cover" />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-5xl opacity-30">📚</div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge className={`font-semibold px-3 py-1 shadow-lg ${levelColors[k.level] || 'bg-gray-100 text-gray-800'}`}>
                          {levelLabels[k.level] || k.level}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold mb-2 text-slate-900">{k.title}</h3>
                        {k.director && (
                          <p className="text-sm text-blue-600 mb-2 font-medium">Instruktør: {k.director}</p>
                        )}
                        <p className="text-sm text-slate-600 line-clamp-2">{k.synopsis_short}</p>
                      </div>

                      <div className="space-y-3 text-sm text-slate-600 mb-6">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-500" />
                          <span className="font-medium">{k.duration_weeks} uker</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-500" />
                          <span>{k.current_participants}/{k.max_participants} deltakere</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <span className="text-2xl font-bold text-slate-900">
                          {formatPrice(k.price_nok)}
                        </span>
                        <Button asChild size="lg" className="px-6 py-2 font-semibold">
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
                  <article key={k.id} className="rounded-lg overflow-hidden bg-[var(--card)] shadow-soft" aria-labelledby={`kurs-${k.id}`}>
                    <div className="relative h-44 bg-[var(--muted)]">
                      {k.thumbnail_url ? (
                        <Image src={k.thumbnail_url} alt={k.title} fill className="object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <BookOpen className="h-16 w-16 text-[var(--muted)]" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-[var(--accent)] text-[var(--fg)]">{levelLabels[k.level] || k.level}</Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 id={`kurs-${k.id}`} className="font-serif text-lg mb-1">{k.title}</h3>
                      {k.director && <p className="text-sm text-[var(--muted)] mb-2">Instruktør: {k.director}</p>}
                      <p className="text-sm text-[var(--muted)] line-clamp-2 mb-4">{k.synopsis_short}</p>

                      <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" aria-hidden />
                          <span>{k.duration_weeks} uker</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" aria-hidden />
                          <span>{k.current_participants}/{k.max_participants}</span>
                        </div>
                        <div className="ml-auto flex items-center gap-4">
                          <span className="font-bold text-lg">{formatPrice(k.price_nok)}</span>
                          <Button asChild size="sm">
                            <Link href={`/kurs/${k.slug}`} aria-label={`Se mer om ${k.title}`}>Se mer</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
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
