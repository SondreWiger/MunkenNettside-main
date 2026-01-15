"use client"

import { useState, useEffect } from 'react'

export default function ProductionsOrderClient({ ensembles }: { ensembles: any[] }) {
  const key = 'productionsOrder'
  const [order, setOrder] = useState<string[] | null>(null)
  const [items, setItems] = useState<any[]>(ensembles || [])

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setOrder(parsed)
        // reorder items based on saved order
        const map = Object.fromEntries(items.map(i => [i.id, i]))
        const ordered = parsed.map((id: string) => map[id]).filter(Boolean)
        const remainder = items.filter(i => !parsed.includes(i.id))
        setItems([...ordered, ...remainder])
      } catch {
        setOrder(null)
      }
    }
  }, [])

  function move(idx: number, dir: -1 | 1) {
    const copy = [...items]
    const to = idx + dir
    if (to < 0 || to >= copy.length) return
    const el = copy.splice(idx, 1)[0]
    copy.splice(to, 0, el)
    setItems(copy)
  }

  function save() {
    const ids = items.map(i => i.id)
    // Try to persist to server-side site_settings first
    fetch('/api/admin/site-settings/productions-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: ids }),
    })
      .then(async (res) => {
        if (!res.ok) {
          // fallback to localStorage
          localStorage.setItem(key, JSON.stringify(ids))
          setOrder(ids)
          alert('Lagring på server mislyktes — rekkefølge lagret lokalt i nettleseren.')
        } else {
          localStorage.setItem(key, JSON.stringify(ids))
          setOrder(ids)
          alert('Rekkefølge lagret på server og i nettleseren.')
        }
      })
      .catch(() => {
        localStorage.setItem(key, JSON.stringify(ids))
        setOrder(ids)
        alert('Kunne ikke nå server — rekkefølge lagret i nettleseren.')
      })
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">Dra og slipp ikke implementert — bruk pilene for å flytte opp/ned. Lagres i nettleser (localStorage).</p>
      <ul className="space-y-2">
        {items.map((e, idx) => (
          <li key={e.id} className="flex items-center gap-3 rounded-md border p-2">
            <div className="flex-1">
              <div className="font-medium">{e.title}</div>
              <div className="text-xs text-muted-foreground">{e.slug || e.id}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => move(idx, -1)} className="btn">↑</button>
              <button onClick={() => move(idx, 1)} className="btn">↓</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <button onClick={save} className="btn btn-primary">Lagre rekkefølge</button>
      </div>
    </div>
  )
}
