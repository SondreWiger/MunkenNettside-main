import Link from 'next/link'
import Image from 'next/image'
import { Ticket, Film, Theater } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Produksjoner | Teateret',
  description: 'Oversikt over våre produksjoner og ensemble',
}

async function getData() {
  try {
    const supabase = await getSupabaseServerClient()

    // Be permissive: fetch non-archived ensembles and avoid depending on a specific boolean column name
    const { data: ensembles } = await supabase
      .from('ensembles')
      .select('*')
      .neq('archived', true)
      .order('updated_at', { ascending: false })

    // Archive teaser
    const { data: archived } = await supabase
      .from('ensembles')
      .select('*')
      .eq('archived', true)
      .order('updated_at', { ascending: false })
      .limit(3)

    const ensembleIds = (ensembles || []).map((e: any) => e.id)
    let shows: any[] = []
    if (ensembleIds.length > 0) {
      const { data: s } = await supabase
        .from('shows')
        .select('id, ensemble_id, status, show_datetime')
        .in('status', ['scheduled', 'on_sale'])
        .in('ensemble_id', ensembleIds)
        .gte('show_datetime', new Date().toISOString())
      shows = s || []
    }

    // Try to read persisted order from site_settings
    try {
      const { data: setting } = await supabase.from('site_settings').select('value').eq('key', 'productions_order').single()
      const saved = setting?.value || null
      if (Array.isArray(saved) && saved.length > 0) {
        // Reorder ensembles according to saved order
        const map = Object.fromEntries((ensembles || []).map((e: any) => [String(e.id), e]))
        const ordered = (saved as string[]).map(id => map[id]).filter(Boolean)
        const remainder = (ensembles || []).filter((e: any) => !(saved as string[]).includes(String(e.id)))
        return { ensembles: [...ordered, ...remainder], shows, archived: archived || [] }
      }
    } catch (err) {
      console.error('Error reading productions_order setting:', err)
    }

  // Read debug flag for admin-only panels
  const { data: debugSettings } = await supabase.from('site_settings').select('value').eq('key', 'debug').maybeSingle()
  const showDebug = debugSettings?.value?.show_productions_debug || false

  return { ensembles: ensembles || [], shows, archived: archived || [], showDebug }
  } catch (err) {
    // Log server-side so dev server shows the error
    // eslint-disable-next-line no-console
    console.error('[productions] getData error:', err)
    return { ensembles: [], shows: [], archived: [] }
  }
}

function simpleExcerpt(text?: string, n = 140) {
  if (!text) return ''
  return text.length > n ? text.slice(0, n) + '…' : text
}

export default async function ProductionsPage() {
  const { ensembles, shows, archived, showDebug } = await getData()

  const showsByEnsemble: Record<string, any[]> = {}
  for (const s of shows) {
    showsByEnsemble[s.ensemble_id] = showsByEnsemble[s.ensemble_id] || []
    showsByEnsemble[s.ensemble_id].push(s)
  }

  // Heuristic: ensembles that expose an explicit enrollment flag are "open for signup"
  const enrollable = ensembles.filter((e: any) => e.enrollment_open || e.is_enrollable || e.accepting_enrollments || e.open_for_enrollment || e.signup_open)
  const inProduction = ensembles.filter((e: any) => (showsByEnsemble[e.id] || []).length > 0 && !enrollable.includes(e))
  const others = ensembles.filter((e: any) => !enrollable.includes(e) && !inProduction.includes(e))

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center gap-6 mb-8">
              <Theater className="h-12 w-12 text-[var(--accent)]" aria-hidden />
              <div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold">Produksjoner</h1>
                <p className="text-[var(--muted)] mt-1">Oversikt over våre aktive produksjoner, påmeldinger og arkiv.</p>
              </div>
            </div>

            {showDebug && (
              <div className="mb-6 p-4 rounded-md border bg-muted/5">
                <div className="text-sm text-muted-foreground">Debug: ensembles={ensembles.length}, shows={shows.length}, archived={archived.length}</div>
                {ensembles.length > 0 ? (
                  <pre className="mt-2 max-h-40 overflow-auto text-xs font-mono">{JSON.stringify(ensembles.slice(0, 5).map(e => ({ id: e.id, title: e.title, slug: e.slug, archived: e.archived })), null, 2)}</pre>
                ) : (
                  <div className="mt-2 text-sm">Ingen produksjoner funnet (ingen rader returnert). Sjekk RLS eller databasetilkobling.</div>
                )}
              </div>
            )}

            {enrollable.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-serif mb-6">Åpne påmeldinger</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {enrollable.map((e: any) => (
                    <article key={e.id} className="rounded-lg overflow-hidden bg-[var(--card)] shadow-soft" aria-labelledby={`ens-${e.id}`}>
                      <div className="relative h-44 bg-[var(--muted)]">
                        {e.thumbnail_url ? (
                          <Image src={e.thumbnail_url} alt={e.title} fill className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Ticket className="h-8 w-8 text-[var(--muted)]" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-stage-black)/50] to-transparent" aria-hidden />
                      </div>
                      <div className="p-4">
                        <h3 id={`ens-${e.id}`} className="font-serif text-lg mb-2">{e.title}</h3>
                        <p className="text-sm text-[var(--muted)] line-clamp-3 mb-4">{simpleExcerpt(e.synopsis_short || e.description)}</p>
                        <div className="flex items-center gap-4">
                          <Link href={`/ensemble/${e.slug || e.id}`} className="text-sm underline">Les mer</Link>
                          <Link href={`/ensemble/${e.slug || e.id}/bestill`} className="ml-auto text-[var(--accent)] font-medium">Meld deg på</Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {inProduction.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-serif mb-6">I produksjon</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {inProduction.map((e: any) => (
                    <article key={e.id} className="rounded-lg overflow-hidden bg-[var(--card)] shadow-soft" aria-labelledby={`prod-${e.id}`}>
                      <div className="relative h-44 bg-[var(--muted)]">
                        {e.thumbnail_url ? (
                          <Image src={e.thumbnail_url} alt={e.title} fill className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Film className="h-8 w-8 text-[var(--muted)]" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-stage-black)/60] to-transparent" aria-hidden />
                      </div>
                      <div className="p-4">
                        <h3 id={`prod-${e.id}`} className="font-serif text-lg mb-2">{e.title}</h3>
                        <p className="text-sm text-[var(--muted)] line-clamp-3 mb-4">{simpleExcerpt(e.synopsis_short || e.description)}</p>
                        <div className="flex items-center gap-4">
                          <Link href={`/ensemble/${e.slug || e.id}`} className="text-sm underline">Les mer</Link>
                          <Link href={`/ensemble/${e.slug || e.id}/bestill`} className="ml-auto text-[var(--accent)] font-medium">Billetter</Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {others.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-serif mb-6">Andre produksjoner</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {others.map((e: any) => (
                    <article key={e.id} className="rounded-lg overflow-hidden bg-[var(--card)] shadow-soft" aria-labelledby={`other-${e.id}`}>
                      <div className="relative h-44 bg-[var(--muted)]">
                        {e.thumbnail_url ? (
                          <Image src={e.thumbnail_url} alt={e.title} fill className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Ticket className="h-8 w-8 text-[var(--muted)]" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-stage-black)/40] to-transparent" aria-hidden />
                      </div>
                      <div className="p-4">
                        <h3 id={`other-${e.id}`} className="font-serif text-lg mb-2">{e.title}</h3>
                        <p className="text-sm text-[var(--muted)] line-clamp-3 mb-4">{simpleExcerpt(e.synopsis_short || e.description)}</p>
                        <div className="flex items-center gap-4">
                          <Link href={`/ensemble/${e.slug || e.id}`} className="text-sm underline">Les mer</Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Archive teaser */}
            <div className="mt-12 border-t pt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Arkivet</h3>
                <Link href="/archive" className="text-sm underline">Se hele arkivet</Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {archived.map((e: any) => (
                  <article key={e.id} className="rounded-lg overflow-hidden bg-amber-50 p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-24 h-16 bg-amber-100 rounded-md overflow-hidden">
                        {e.thumbnail_url ? (
                          <Image src={e.thumbnail_url} alt={e.title} width={200} height={120} className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Ticket className="h-6 w-6 text-amber-700" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold">{e.title}</h4>
                        <p className="text-xs text-amber-700">Arkivert: {new Date(e.updated_at).toLocaleDateString('nb-NO')}</p>
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
