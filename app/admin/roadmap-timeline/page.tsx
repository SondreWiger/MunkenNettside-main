"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TimelineMap } from "@/components/ui/timeline-map"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

interface TimelineItem {
  id: string
  title: string
  notes?: string | null
  event_type?: string
  occurred_at?: string
}

export default function AdminTimeline() {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [eventType, setEventType] = useState("update")
  const [occurredAt, setOccurredAt] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [newType, setNewType] = useState("update")
  const [newOccurred, setNewOccurred] = useState("")
  const [selected, setSelected] = useState<TimelineItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const res = await fetch('/api/admin/timeline')
        const body = await res.json()
        if (!res.ok) throw new Error(body?.error || 'Feil ved lasting')
        if (!mounted) return
        setItems(body.items || [])
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Fetch timeline failed', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  async function addItem() {
    if (!title.trim()) return
    try {
      const res = await fetch('/api/admin/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, notes, event_type: eventType, occurred_at: occurredAt || undefined })
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Feil ved opprettelse')
      setItems((prev) => [body.item, ...(prev || [])])
      setTitle('')
      setNotes('')
      setEventType('note')
      setOccurredAt('')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Add timeline item failed', err)
    }
  }

  async function addItemFromDialog() {
    if (!newTitle.trim()) return
    try {
      const res = await fetch('/api/admin/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, notes: newNotes, event_type: newType, occurred_at: newOccurred || undefined })
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Feil ved opprettelse')
      setItems((prev) => [body.item, ...(prev || [])])
      setNewTitle('')
      setNewNotes('')
      setNewType('update')
      setNewOccurred('')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Add timeline item from dialog failed', err)
    }
  }

  async function removeItem(id: string) {
    try {
      const res = await fetch(`/api/admin/timeline/${id}`, { method: 'DELETE' })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Feil ved sletting')
      setItems((prev) => prev.filter(i => i.id !== id))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Remove timeline item failed', err)
    }
  }

  async function editItem(item: TimelineItem) {
    // Open dialog to edit
    setSelected(item)
    setDialogOpen(true)
  }

  async function saveSelected() {
    if (!selected) return
    try {
      const res = await fetch(`/api/admin/timeline/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: selected.title, notes: selected.notes, event_type: selected.event_type, occurred_at: selected.occurred_at })
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Feil ved oppdatering')
      setItems((prev) => prev.map(i => i.id === selected.id ? body.item : i))
      setDialogOpen(false)
      setSelected(null)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Save timeline item failed', err)
    }
  }

  async function deleteSelected() {
    if (!selected) return
    try {
      const res = await fetch(`/api/admin/timeline/${selected.id}`, { method: 'DELETE' })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Feil ved sletting')
      setItems((prev) => prev.filter(i => i.id !== selected.id))
      setDialogOpen(false)
      setSelected(null)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Delete timeline item failed', err)
    }
  }

  return (
    <main className="container max-w-2xl py-8">
      <h1 className="text-3xl font-bold mb-4">Admin Timeline</h1>

      <div className="mb-6">
        <div className="rounded-lg overflow-hidden bg-gradient-to-r from-[var(--color-primary)]/90 to-[var(--color-accent)]/80 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Admin Timeline</h1>
              <p className="mt-1 text-sm text-white/90">Visuell oversikt over viktige hendelser, utgivelser og møter. Klikk et punkt for å redigere eller dra for å panorere.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setCreateOpen(true)} className="bg-white text-[var(--color-primary)]">Ny hendelse</Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ny timeline-hendelse</DialogTitle>
            <DialogDescription>Legg til en ny viktig hendelse i prosjektets timeline.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 mt-4">
            <Input placeholder="Tittel" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <Textarea placeholder="Notater" value={newNotes} onChange={e => setNewNotes(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <select className="border rounded px-2 py-1" value={newType} onChange={e => setNewType(e.target.value)}>
                <option value="commit">commit</option>
                <option value="update">update</option>
                <option value="system">system</option>
                <option value="meeting">meeting</option>
                <option value="release">release</option>
                <option value="note">note</option>
                <option value="other">other</option>
              </select>
              <Input type="datetime-local" value={newOccurred} onChange={e => setNewOccurred(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Avbryt</Button>
            <Button onClick={async () => { await addItemFromDialog(); setCreateOpen(false) }}>Legg til</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Legg til ny timeline-hendelse</CardTitle>
          </CardHeader>
          <CardContent>
            <Input placeholder="Tittel" value={title} onChange={e => setTitle(e.target.value)} className="mb-2" />
            <Textarea placeholder="Notater" value={notes} onChange={e => setNotes(e.target.value)} className="mb-2" />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select className="border rounded px-2 py-1" value={eventType} onChange={e => setEventType(e.target.value)}>
                <option value="commit">commit</option>
                <option value="update">update</option>
                <option value="system">system</option>
                <option value="meeting">meeting</option>
                <option value="release">release</option>
                <option value="note">note</option>
                <option value="other">other</option>
              </select>
              <Input type="datetime-local" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} />
            </div>
            <div className="flex gap-2"><Button onClick={addItem}>Legg til</Button></div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Hurtigoversikt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Totalt hendelser: <strong className="text-foreground">{items.length}</strong></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="text-sm"><span className="inline-block w-3 h-3 rounded-full bg-[var(--color-primary)] mr-2 align-middle"/> Releases</div>
              <div className="text-sm"><span className="inline-block w-3 h-3 rounded-full bg-[var(--color-accent)] mr-2 align-middle"/> Updates</div>
              <div className="text-sm"><span className="inline-block w-3 h-3 rounded-full bg-[var(--color-destructive)] mr-2 align-middle"/> Meetings</div>
              <div className="text-sm"><span className="inline-block w-3 h-3 rounded-full bg-[var(--color-foreground)] mr-2 align-middle"/> Notes</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? <p className="text-muted-foreground">Laster...</p> : (
        <>
          <TimelineMap items={items} onNodeClick={(it) => { setSelected(it); setDialogOpen(true) }} />
          <div className="space-y-4 mt-8">
            {items.map(item => (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{item.title} <span className="text-sm text-muted-foreground">· {item.event_type}</span></div>
                    {item.occurred_at && <div className="text-xs text-muted-foreground">{new Date(item.occurred_at).toLocaleString()}</div>}
                    {item.notes && <div className="text-sm mt-1">{item.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => editItem(item)} size="sm">Rediger</Button>
                    <Button variant="destructive" onClick={() => removeItem(item.id)} size="sm">Slett</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selected ? `Rediger: ${selected.title}` : 'Rediger hendelse'}</DialogTitle>
                <DialogDescription>Endre tittel, type eller tidspunkt. Lagre for å oppdatere timeline.</DialogDescription>
              </DialogHeader>

              {selected ? (
                <div className="grid grid-cols-1 gap-2 mt-4">
                  <Input value={selected.title} onChange={e => setSelected({ ...selected, title: e.target.value })} />
                  <Textarea value={selected.notes || ''} onChange={e => setSelected({ ...selected, notes: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={selected.event_type} onChange={e => setSelected({ ...selected, event_type: e.target.value })} className="border rounded px-2 py-1">
                      <option value="commit">commit</option>
                      <option value="update">update</option>
                      <option value="system">system</option>
                      <option value="meeting">meeting</option>
                      <option value="release">release</option>
                      <option value="note">note</option>
                      <option value="other">other</option>
                    </select>
                    <Input type="datetime-local" value={selected.occurred_at ? new Date(selected.occurred_at).toISOString().slice(0,16) : ''} onChange={e => setSelected({ ...selected, occurred_at: new Date(e.target.value).toISOString() })} />
                  </div>
                </div>
              ) : null}

              <DialogFooter>
                <Button variant="destructive" onClick={deleteSelected}>Slett</Button>
                <div className="flex-1" />
                <Button variant="ghost" onClick={() => { setDialogOpen(false); setSelected(null) }}>Avbryt</Button>
                <Button onClick={saveSelected}>Lagre</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </main>
  )
}
