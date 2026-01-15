"use client"

import { useState } from 'react'
import Link from 'next/link'
import { docsIndex } from '@/lib/docs'
import { Input } from '@/components/ui/input'

export default function DocsIndexPage() {
  const [q, setQ] = useState('')
  const results = docsIndex.filter((d) => (d.title + ' ' + d.description).toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-3">Dokumentasjonsindeks</h1>
      <p className="text-muted-foreground mb-4">Søk i dokumentasjonen eller velg et kapittel for å hoppe rett inn i stoffet.</p>

      <div className="mb-4 max-w-md">
        <Input placeholder="Søk i dokumentasjon..." value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} />
      </div>

      <div className="grid gap-3">
        {(results.length ? results : docsIndex).map((d) => (
          <Link key={d.href} href={d.href} className="block rounded border p-4 hover:bg-muted/50">
            <div className="font-medium">{d.title}</div>
            <div className="text-sm text-muted-foreground">{d.description}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
