"use client"

import { useEffect, useState } from 'react'

type Heading = { id: string; text: string; level: number }

export function InPageTOC() {
  const [headings, setHeadings] = useState<Heading[]>([])

  useEffect(() => {
    const el = document.querySelector('main') || document.body
    const nodes = Array.from(el.querySelectorAll('h2, h3')) as HTMLElement[]

    // Ensure headings have ids (generate from text if missing)
    nodes.forEach((n) => {
      if (!n.id) {
        const text = (n.innerText || n.textContent || '').trim()
        const slug = text
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 60)
        n.id = slug || `heading-${Math.random().toString(36).slice(2, 7)}`
      }
    })

    const hs = nodes.map((n) => ({ id: n.id, text: n.innerText || n.textContent || '', level: n.tagName === 'H2' ? 2 : 3 }))
    setHeadings(hs)

    const observer = new MutationObserver(() => {
      const nodes = Array.from(el.querySelectorAll('h2, h3')) as HTMLElement[]
      const hs = nodes
        .filter((n) => n.id)
        .map((n) => ({ id: n.id, text: n.innerText || n.textContent || '', level: n.tagName === 'H2' ? 2 : 3 }))
      setHeadings(hs)
    })

    observer.observe(el, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  if (headings.length === 0) return (
    <div className="rounded-md border bg-card p-4">
      <h4 className="mb-2 text-sm font-semibold">Seksjoner</h4>
      <p className="text-sm text-muted-foreground">Ingen kapitler funnet</p>
    </div>
  )

  return (
    <div className="rounded-md border bg-card p-4">
      <h4 className="mb-2 text-sm font-semibold">Seksjoner</h4>
      <ul className="flex flex-col gap-2 text-sm">
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? 'pl-3' : ''}>
            <a href={`#${h.id}`} className="text-muted-foreground hover:text-foreground">{h.text}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
