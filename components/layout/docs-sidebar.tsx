"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { docsIndex } from '@/lib/docs'
import { useState } from 'react'

type Grouped = Record<string, Array<{ name: string; href: string }>>

// Group docs by category for a cleaner sidebar
const grouped = docsIndex.reduce((acc: Grouped, d) => {
  const cat = d.category || 'general'
  acc[cat] = acc[cat] || []
  acc[cat].push({ name: d.title, href: d.href })
  return acc
}, {})

// Ensure index appears in general
if (!grouped['general']) grouped['general'] = []
grouped['general'].unshift({ name: 'Indeks', href: '/use/indeks' })

export function DocsSidebar() {
  const pathname = usePathname() || '/use'
  const [showDev, setShowDev] = useState(false)

  return (
    <nav aria-label="Dokumentasjon" className="sticky top-20 hidden w-56 shrink-0 md:block">
      <div className="rounded-md border bg-card p-3">
        <h4 className="mb-2 text-sm font-semibold">Dokumentasjon</h4>

        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1">For brukere</div>
          <ul className="flex flex-col gap-1 text-sm">
            {(grouped['general'] || []).map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block w-full rounded px-2 py-1 transition-colors ${active ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1">For administratorer</div>
          <ul className="flex flex-col gap-1 text-sm">
            {(grouped['admin'] || []).map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block w-full rounded px-2 py-1 transition-colors ${active ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground">Developer</div>
            <button onClick={() => setShowDev(!showDev)} className="text-sm text-muted-foreground hover:text-foreground">{showDev ? 'Skjul' : 'Vis'}</button>
          </div>
          {showDev ? (
            <ul className="flex flex-col gap-1 text-sm">
              {(grouped['developer'] || []).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={`block w-full rounded px-2 py-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground`}>{item.name}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-xs text-muted-foreground">Advanced developer docs are hidden by default.</div>
          )}
        </div>
      </div>
    </nav>
  )
}
