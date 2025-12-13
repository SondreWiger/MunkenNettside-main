import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Ticket, Archive as ArchiveIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Arkiv | Teateret',
  description: 'Arkiv over tidligere forestillinger og kurs',
}

async function getArchived() {
  const supabase = await getSupabaseServerClient()

  const { data: ensembles } = await supabase.from('ensembles').select('*').eq('archived', true).order('updated_at', { ascending: false })
  const { data: kurs } = await supabase.from('kurs').select('*').eq('archived', true).order('updated_at', { ascending: false })

  return { ensembles: ensembles || [], kurs: kurs || [] }
}

export default async function ArchivePage() {
  const { ensembles, kurs } = await getArchived()

  return (
    <div className="flex min-h-screen flex-col bg-amber-50">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        <section className="py-12">
          <div className="container px-4">
            <div className="flex items-center gap-4 mb-6">
              <ArchiveIcon className="h-10 w-10 text-amber-800" />
              <div>
                <h1 className="text-3xl font-serif font-bold text-amber-900">Arkivet</h1>
                <p className="text-amber-800/80">Et arkiv over tidligere forestillinger og kurs — velkommen til vår samling av minner og fortellinger.</p>
              </div>
            </div>

            {/* Ensembles Archive */}
            <div className="mb-10">
              <h2 className="text-2xl font-serif mb-4 text-amber-900">Arkiverte forestillinger</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {ensembles.map((e: any) => (
                  <article key={e.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-24 h-16 bg-amber-100 flex items-center justify-center rounded-md overflow-hidden">
                        {e.thumbnail_url ? (
                          <Image src={e.thumbnail_url} alt={e.title} width={200} height={120} className="object-cover" />
                        ) : (
                          <Ticket className="h-8 w-8 text-amber-700" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-serif text-lg text-amber-900 mb-1">{e.title}</h3>
                        <p className="text-sm text-amber-800/90 line-clamp-3 mb-2">{e.synopsis_short || e.description || ''}</p>
                        <div className="flex items-center gap-2">
                          <Link href={`/ensembler/${e.slug || e.id}`} className="text-amber-900 underline">Les mer</Link>
                          <span className="text-xs text-amber-700">Arkivert: {new Date(e.updated_at).toLocaleDateString('nb-NO')}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Kurs Archive */}
            <div>
              <h2 className="text-2xl font-serif mb-4 text-amber-900">Arkiverte kurs</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {kurs.map((k: any) => (
                  <article key={k.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-24 h-16 bg-amber-100 flex items-center justify-center rounded-md overflow-hidden">
                        {k.thumbnail_url ? (
                          <Image src={k.thumbnail_url} alt={k.title} width={200} height={120} className="object-cover" />
                        ) : (
                          <BookOpen className="h-8 w-8 text-amber-700" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-serif text-lg text-amber-900 mb-1">{k.title}</h3>
                        <p className="text-sm text-amber-800/90 line-clamp-3 mb-2">{k.synopsis_short || ''}</p>
                        <div className="flex items-center gap-2">
                          <Link href={`/kurs/${k.slug || k.id}`} className="text-amber-900 underline">Se kursdetaljer</Link>
                          <span className="text-xs text-amber-700">Arkivert: {new Date(k.updated_at).toLocaleDateString('nb-NO')}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
