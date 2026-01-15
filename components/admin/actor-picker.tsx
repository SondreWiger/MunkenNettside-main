"use client"

import React, { useEffect, useState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type Props = {
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
}

export default function ActorPicker({ value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Array<any>>([])
  const [loading, setLoading] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // If we have a selected id but no label yet, fetch actor list and resolve label
    if (value && !selectedLabel) {
      fetch(`/api/actors`) // small list; acceptable for admin
        .then((r) => r.json())
        .then((json) => {
          const a = (json.actors || []).find((x: any) => x.id === value)
          setSelectedLabel(a ? a.name || a.display_name || a.stage_name || a.id : null)
        })
        .catch(() => setSelectedLabel(null))
    }
  }, [value, selectedLabel])

  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setResults([])
      setLoading(false)
      return
    }

    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    const q = encodeURIComponent(query.trim())
    fetch(`/api/actors/search?q=${q}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((json) => {
        setResults(json.actors || [])
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error('Actor search failed', err)
      })
      .finally(() => setLoading(false))

    return () => {
      ac.abort()
    }
  }, [query])

  const handleSelect = (actor: any) => {
    setSelectedLabel(actor.name || actor.display_name || actor.stage_name || actor.id)
    onChange(actor.id)
    setQuery("")
    setResults([])
  }

  const handleClear = () => {
    setSelectedLabel(null)
    onChange(null)
  }

  return (
    <div className="relative">
      <div className="flex gap-2 items-center">
        <Input
          placeholder={selectedLabel ? `Valgt: ${selectedLabel}` : placeholder || "Søk etter skuespiller..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length === 0 && setResults([])}
        />
        {selectedLabel && (
          <Button variant="ghost" onClick={handleClear} size="sm">Fjern</Button>
        )}
      </div>

      {results.length > 0 && (
        <div className="absolute z-40 mt-2 w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded shadow max-h-60 overflow-auto">
          {results.map((a: any) => (
            <button
              key={a.id}
              className="w-full text-left px-3 py-2 hover:bg-muted"
              onClick={() => handleSelect(a)}
              type="button"
            >
              <div className="font-medium">{a.name || a.display_name || a.stage_name || a.id}</div>
              {a.bio && <div className="text-xs text-[var(--color-muted-foreground)]">{a.bio.slice(0, 80)}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
