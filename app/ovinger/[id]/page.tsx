import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import AttendanceToggle from '@/components/session/attendance-toggle'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils/booking'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getShowData(showId: string) {
  const supabase = await getSupabaseServerClient()

  const { data: show } = await supabase
    .from('shows')
    .select('*, venue:venues(*), ensemble:ensembles(*), kurs:kurs(*)')
    .eq('id', showId)
    .single()

  if (!show) return null

  return show
}

export default async function OvingPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const show = await getShowData(id)

  if (!show) {
    notFound()
  }

  // Access control: if kurs session, require enrollment or admin
  if (show.source_type === 'kurs') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect(`/logg-inn?redirect=/ovinger/${id}`)

    const { data: userRow } = await supabase.from('users').select('role').eq('id', user.id).single()
    const isAdmin = userRow?.role === 'admin'
    if (!isAdmin) {
      const { data: enrollment } = await supabase.from('kurs_enrollments').select('id').eq('kurs_id', show.kurs_id).eq('user_id', user.id).eq('status', 'confirmed').single()
      if (!enrollment) {
        return redirect(`/kurs/${show.kurs?.slug || ''}?error=not_enrolled`)
      }
    }
  }

  // Load attendees for display (admins/enrolled users are allowed here)
  const { data: attendees } = await supabase
    .from('show_attendances')
    .select('user:users(id, full_name, email), status, created_at')
    .eq('show_id', id)
    .eq('status', 'attending')
    .order('created_at', { ascending: true })

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      <Header />
      <main className="flex-1 container px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <h1 className="text-3xl font-serif font-bold">{show.title || (show.ensemble?.title || 'Øving')}</h1>
            <p className="text-sm text-muted-foreground">{formatDateTime(show.show_datetime)} — {show.venue?.name || 'Ukentlig'}</p>
            {show.team && <p className="text-sm text-muted-foreground">Team: {show.team}</p>}
            {show.special_notes && <div className="mt-4 p-4 bg-[var(--card)] rounded">{show.special_notes}</div>}

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Deltakere</h3>
              <ul className="space-y-2">
                {(attendees || []).map((a: any) => (
                  <li key={a.user.id} className="text-sm">{a.user.full_name} <span className="text-muted-foreground text-xs">{a.user.email}</span></li>
                ))}
                {(!(attendees || []).length) && <li className="text-sm text-muted-foreground">Ingen har meldt seg på ennå.</li>}
              </ul>
            </div>
          </div>

          <aside className="md:col-span-1 space-y-4">
            <div className="p-4 rounded border bg-[var(--card)]">
              <AttendanceToggle showId={id} />
            </div>

            {/** Admin actions */}
            <div>
              <Link href={`/admin/forestillinger/${id}`} className="text-sm text-primary hover:underline">Rediger øving (Admin)</Link>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  )
}
