import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import WardrobeSizes from "@/components/actor/wardrobe-sizes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ExportSchedule from "@/components/actor/export-schedule"
import { formatDate } from "@/lib/utils/booking"

export const dynamic = "force-dynamic"

export default async function ActorDashboardPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Resolve actor profile for this user
  let actor = null
  try {
    const actorIdFromUser = (user as { actor_id?: string }).actor_id
    if (actorIdFromUser) {
      const { data: a } = await supabase.from('actors').select('*').eq('id', actorIdFromUser).single()
      actor = a || null
    }
    if (!actor) {
      const { data: a } = await supabase.from('actors').select('*').eq('user_id', user.id).single()
      actor = a || null
    }
  } catch (err) {
    console.error('Error loading actor:', err)
  }

  // Types for the actor dashboard
  interface KursEnrollment { id: string; status: string; kurs?: { id?: string; title?: string; slug?: string } }
  interface RoleRow { id: string; character_name?: string; ensemble?: { id?: string; title?: string; slug?: string }; yellow_actor_id?: string; blue_actor_id?: string }
  interface ShowItem { id: string; title?: string; show_datetime?: string; is_session?: boolean; kurs_id?: string; venue?: { name?: string } }

  // Kurs enrollments
  const { data: kursEnrollmentsData } = await supabase.from('kurs_enrollments').select('*, kurs:kurs(id,title,slug)').eq('user_id', user.id).eq('status', 'confirmed')
  const kursEnrollments = (kursEnrollmentsData || []) as KursEnrollment[]

  // Roles assigned
  const { data: rolesData } = await supabase.from('roles').select('id,character_name,ensemble:ensembles(id,title,slug), yellow_actor_id, blue_actor_id').or(`yellow_actor_id.eq.${actor?.id},blue_actor_id.eq.${actor?.id}`)
  const roles = (rolesData || []) as RoleRow[]

  // Upcoming øvinger (shows where actor is assigned or kurs linked)
  let upcoming: ShowItem[] = []
  try {
    if (roles && roles.length > 0) {
  const ensembleIds = roles.map((r) => (r.ensemble && (r.ensemble as { id?: string }).id) ).filter(Boolean)
      if (ensembleIds.length > 0) {
        const { data: shows } = await supabase.from('shows').select('id,title,show_datetime,is_session,kurs_id,venue:venues(name)').in('ensemble_id', ensembleIds).gte('show_datetime', new Date().toISOString()).order('show_datetime')
        upcoming = upcoming.concat((shows || []) as ShowItem[])
      }
    }
    // kurs shows for enrolled kurs
    if (kursEnrollments && kursEnrollments.length > 0) {
      const kursIds = kursEnrollments.map((k) => k.kurs?.id).filter(Boolean)
      if (kursIds.length > 0) {
        const { data: kursShows } = await supabase.from('shows').select('id,title,show_datetime,is_session,kurs_id,venue:venues(name)').in('kurs_id', kursIds).eq('type', 'kurs_session').gte('show_datetime', new Date().toISOString()).order('show_datetime')
        upcoming = upcoming.concat((kursShows || []) as ShowItem[])
      }
    }
  } catch (err: unknown) {
    console.error('Error loading upcoming sessions', err)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      <Header />
      <main id="hovedinnhold" className="flex-1">
        <section className="py-12 bg-[var(--card)] border-b">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-serif font-bold">Skuespillerdashboard</h1>
                <p className="mt-1 text-sm text-[var(--muted)]">Ditt sted for kurs, roller og øvinger</p>
              </div>
              <div className="text-right">
                <Link href="/profiler/me" className="text-sm text-primary hover:underline">Rediger profil</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Kurs</CardTitle>
              </CardHeader>
              <CardContent>
                {kursEnrollments && kursEnrollments.length > 0 ? (
                  <ul className="space-y-2">
                    {kursEnrollments.map((k: KursEnrollment) => (
                      <li key={k.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{k.kurs?.title}</p>
                          <p className="text-sm text-muted-foreground">Status: {k.status}</p>
                        </div>
                        <Link href={`/kurs/${k.kurs?.slug}`} className="text-sm text-primary hover:underline">Åpne kurs</Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Ingen påmeldte kurs</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Roller</CardTitle>
              </CardHeader>
              <CardContent>
                {roles && roles.length > 0 ? (
                  <ul className="space-y-2">
                    {roles.map((r: RoleRow) => (
                      <li key={r.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{r.character_name}</p>
                          <p className="text-sm text-muted-foreground">{r.ensemble?.title}</p>
                        </div>
                        <Link href={`/ensemble/${r.ensemble?.slug}`} className="text-sm text-primary hover:underline">Se ensemble</Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Ingen roller funnet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Øvinger (kalender)</CardTitle>
                <ExportSchedule dataJson={JSON.stringify(upcoming || [])} />
              </CardHeader>
              <CardContent>
                {upcoming && upcoming.length > 0 ? (
                  <ul className="space-y-2">
                    {upcoming.map((s: ShowItem) => (
                      <li key={s.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{s.title}</p>
                          <p className="text-sm text-muted-foreground">{s.show_datetime ? formatDate(s.show_datetime) : '-'}</p>
                        </div>
                        <Link href={`/ovinger/${s.id}`} className="text-sm text-primary hover:underline">Se øving</Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Ingen kommende øvinger</p>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mitt verdikort</CardTitle>
              </CardHeader>
              <CardContent>
                <WardrobeSizes />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notater</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Legg inn private notater eller kontaktinfo her.</p>
              </CardContent>
            </Card>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  )
}
