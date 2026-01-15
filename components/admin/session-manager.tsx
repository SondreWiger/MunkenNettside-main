"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils/booking"

interface Props {
  kursId?: string
  ensembleId?: string
}

interface ShowItem {
  id: string
  title?: string | null
  show_datetime?: string | null
  venue?: { name?: string }
}

interface ParentInfo {
  id: string
  title?: string
  banner_url?: string | null
  instructor?: { id?: string; name?: string | null }
}

export default function SessionManager({ kursId, ensembleId }: Props) {
  const [sessions, setSessions] = useState<ShowItem[]>([])
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([])
  const [newSession, setNewSession] = useState({ title: "", show_datetime: "", venue_id: "", team: "" })
  const [parent, setParent] = useState<ParentInfo | null>(null)

  const supabase = getSupabaseBrowserClient()

  const load = useCallback(async () => {
    try {
      // Load venues via browser supabase client (simple reference list)
      const { data: v } = await supabase.from('venues').select('id,name')
      setVenues(v || [])

      // Use admin API to fetch shows so reads go through server-side logic and RLS-safe paths
      const params = new URLSearchParams()
      if (kursId) params.set('kursId', kursId)
      if (ensembleId) params.set('ensembleId', ensembleId)
      const res = await fetch(`/api/admin/shows?${params.toString()}`)
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to load shows')
      }
      setSessions(body.shows || [])

      // Fetch parent (kurs or ensemble) info for richer display
      if (kursId) {
        const { data: kurs } = await supabase.from('kurs').select('id,title,slug,banner_url,instructor_actor_id').eq('id', kursId).single()
        const parentInfo: ParentInfo = { id: kursId, title: kurs?.title || 'Kurs', banner_url: kurs?.banner_url || null }
        if (kurs?.instructor_actor_id) {
          const { data: a } = await supabase.from('actors').select('id,name').eq('id', kurs.instructor_actor_id).single()
          if (a) parentInfo.instructor = { id: a.id, name: a.name }
        }
        setParent(parentInfo)
      } else if (ensembleId) {
        const { data: ensemble } = await supabase.from('ensembles').select('id,title,slug,banner_url').eq('id', ensembleId).single()
        const parentInfo: ParentInfo = { id: ensembleId, title: ensemble?.title || 'Ensemble', banner_url: ensemble?.banner_url || null }
        // get a sample of assigned actors (roles)
        type RoleRow = { yellow_actor?: { id?: string; name?: string }, blue_actor?: { id?: string; name?: string } }
        const { data: roles } = await supabase.from('roles').select('id,character_name,yellow_actor_id,blue_actor_id, yellow_actor:actors(name), blue_actor:actors(name)').eq('ensemble_id', ensembleId).limit(6)
        const personnel: { id?: string; name?: string }[] = []
        ;(roles || []).forEach((r: RoleRow) => {
          if (r.yellow_actor) personnel.push(r.yellow_actor)
          if (r.blue_actor) personnel.push(r.blue_actor)
        })
        if (personnel.length > 0) {
          // attach first person as instructor/lead for compact display
          const p = personnel[0]
          parentInfo.instructor = { id: p.id, name: p.name }
        }
        setParent(parentInfo)
      } else {
        setParent(null)
      }
    } catch (err) {
      console.error('Error loading sessions', err)
      toast.error('Kunne ikke laste øvinger')
    }
  }, [kursId, ensembleId, supabase])

  useEffect(() => {
    void load()
  }, [load])

  async function addSession() {
    try {
        const basePayload = {
          title: newSession.title || (kursId ? 'Øving' : 'Øving'),
          show_datetime: newSession.show_datetime,
          venue_id: newSession.venue_id || null,
          type: kursId ? 'kurs_session' : 'ensemble_show',
          // Mark as a practice session so it can be hidden from public show listings
          is_session: true,
        }
        const payload = {
          ...basePayload,
          ...(kursId ? { kurs_id: kursId } : {}),
          ...(ensembleId ? { ensemble_id: ensembleId } : {}),
        }

        const res = await fetch('/api/admin/shows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to create show')
        // refresh list
        await load()
        setNewSession({ title: '', show_datetime: '', venue_id: '', team: '' })
        toast.success('Øving lagt til')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Add session error', err)
      toast.error('Kunne ikke legge til øving: ' + msg)
    }
  }

  async function deleteSession(id: string) {
    if (!confirm('Slette denne øvingen?')) return
    try {
      const res = await fetch(`/api/admin/shows/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to delete show')
      await load()
      toast.success('Øving slettet')
    } catch (err: unknown) {
      console.error('Delete session error', err)
      toast.error('Kunne ikke slette øving')
    }
  }

  return (
    <div className="space-y-4">
      {parent && (
        <div className="rounded overflow-hidden shadow-soft border bg-[var(--card)]">
          <div className="h-28 md:h-36 bg-gradient-to-r from-slate-800 to-slate-700 relative" style={{ backgroundImage: parent.banner_url ? `url(${parent.banner_url})` : undefined, backgroundSize: 'cover' }}>
            <div className="bg-black/30 h-full flex items-center px-4">
              <div>
                <p className="text-white font-semibold text-lg">{parent.title}</p>
                {parent.instructor?.name && <p className="text-sm text-white/80">Ansvarlig: {parent.instructor.name}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-3 items-end">
        <div>
          <Label>Tittel</Label>
          <Input value={newSession.title} onChange={(e) => setNewSession({ ...newSession, title: e.target.value })} />
        </div>
        <div>
          <Label>Dato og tid</Label>
          <Input type="datetime-local" value={newSession.show_datetime} onChange={(e) => setNewSession({ ...newSession, show_datetime: e.target.value })} />
        </div>
        <div>
          <Label>Sted</Label>
          <select className="w-full border p-2 rounded" value={newSession.venue_id} onChange={(e) => setNewSession({ ...newSession, venue_id: e.target.value })}>
            <option value="">Velg sted</option>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-3">
          <Button type="button" onClick={addSession}>Legg til øving</Button>
        </div>
      </div>

      <div className="space-y-2">
        {sessions.map((s) => (
          <Card key={s.id} className="flex items-center justify-between">
            <CardContent className="w-full flex items-center justify-between">
              <div>
                <p className="font-medium">{s.title || 'Øving'}</p>
                <p className="text-sm text-muted-foreground">{s.show_datetime ? formatDate(s.show_datetime) : '-'}</p>
                {s.venue?.name && <p className="text-sm text-muted-foreground">{s.venue.name}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/ovinger/${s.id}`} className="text-sm text-primary hover:underline">Se detaljer</Link>
                <Link href={`/admin/forestillinger/${s.id}`} className="text-sm text-muted-foreground hover:underline">Rediger øving (admin)</Link>
                <Button variant="destructive" onClick={() => deleteSession(s.id)}>Slett</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
