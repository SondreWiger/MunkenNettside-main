"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { applyTheme, ThemeTokens } from "@/lib/theme/applyTheme"
import { PRESETS } from '@/lib/theme/presets'
import { validateThemeTokens } from '@/lib/theme/validateThemeTokens'

const COLOR_KEYS = [
  'background','foreground','card','card_foreground','primary','primary_foreground','accent','accent_foreground','destructive','border','seat_available','seat_selected','seat_sold','seat_reserved','gradient_hero','gradient_hover'
]

export default function SiteAppearanceAdmin() {
  const [tokens, setTokens] = useState<ThemeTokens>({})
  const [edited, setEdited] = useState<ThemeTokens>({})
  const [isSaving, setIsSaving] = useState(false)
  const [appliedVars, setAppliedVars] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchTheme()
  }, [])

  const applyPreset = (name: string) => {
    const preset = PRESETS[name]
    if (preset) {
      setEdited(preset)
      applyTheme(preset)
    }
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(edited, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `theme-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file?: File) => {
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const validation = validateThemeTokens(parsed)
      if (!validation.success) {
        toast.error('Ugyldig tema JSON')
        return
      }
      setEdited(parsed)
      applyTheme(parsed)
      toast.success('Tema importert (ikke lagret)')
    } catch (e) {
      console.error('Import error', e)
      toast.error('Kunne ikke importere filen')
    }
  }

  useEffect(() => {
    // Live preview by applying to root CSS variables
    applyTheme(edited)
    try {
      const cs = getComputedStyle(document.documentElement)
      setAppliedVars({
        primary: cs.getPropertyValue('--primary') || cs.getPropertyValue('--color-primary') || '',
        background: cs.getPropertyValue('--background') || cs.getPropertyValue('--color-background') || '',
        seat_available: cs.getPropertyValue('--seat-available') || cs.getPropertyValue('--color-seat-available') || '',
        seat_sold: cs.getPropertyValue('--seat-sold') || cs.getPropertyValue('--color-seat-sold') || '',
      })
    } catch (e) {
      // ignore in non-browser env
    }
  }, [edited])

  const fetchTheme = async () => {
    try {
      const res = await fetch('/api/admin/site-settings/theme-tokens')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      const value = data?.value || {}
      setTokens(value)
      setEdited(value)
      applyTheme(value)
    } catch (e) {
      console.error('Error loading theme tokens', e)
      toast.error('Kunne ikke laste temainnstillinger')
    }
  }

  const updateKey = (key: string, value: string) => {
    const next = { ...edited, [key]: value }
    setEdited(next)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Client-side validation for a quicker feedback loop
      const validation = validateThemeTokens(edited)
      if (!validation.success) {
        toast.error('Noen fargeverdier er ugyldige. Rett dem før lagring.')
        setIsSaving(false)
        return
      }
      const res = await fetch('/api/admin/site-settings/theme-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: edited })
      })
      if (!res.ok) throw new Error('Save failed')
  setTokens(edited)
  // Ensure the persisted theme is applied globally
  applyTheme(edited)
      toast.success('Temainnstillinger lagret')
    } catch (e) {
      console.error('Error saving theme tokens', e)
      toast.error('Kunne ikke lagre temainnstillinger')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nettside utseende</CardTitle>
        <CardDescription>Rediger farge- og gradient-innstillinger for hele nettstedet. Endringene vises umiddelbart i forhåndsvisningen.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2 flex items-center gap-2">
            <select aria-label="Preset" onChange={(e) => applyPreset(e.target.value)} className="rounded border px-2 py-1">
              <option value="">Velg preset...</option>
              {Object.keys(PRESETS).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <button className="px-3 py-1 rounded border" onClick={handleExport}>Eksporter</button>
            <input type="file" accept="application/json" onChange={(e) => handleImport(e.target.files?.[0])} className="ml-2" />
          </div>
          {COLOR_KEYS.map((k) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={k}>{k.replace(/_/g, ' ')}</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id={k}
                  value={edited[k] || ''}
                  onChange={(e) => updateKey(k, e.target.value)}
                  placeholder={k.includes('gradient') ? 'Gradient eller CSS verdi' : '#rrggbb'}
                />
                {!k.includes('gradient') && (
                  <input
                    type="color"
                    value={edited[k] || '#000000'}
                    onChange={(e) => updateKey(k, e.target.value)}
                    className="w-14 h-10 rounded border cursor-pointer"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Forhåndsvisning</Label>
          <div className="p-4 rounded border" style={{ background: edited.background || 'var(--background)' }}>
            <div style={{ color: edited.foreground || 'var(--foreground)' }}>
              <h3 style={{ margin: 0 }}>Tittel for forhåndsvisning</h3>
              <p>Dette er et lite utdrag som viser hvordan tekst og bakgrunn ser ut.</p>
              <button className="mt-2 px-4 py-2 rounded" style={{ background: edited.primary || 'var(--primary)', color: edited.primary_foreground || 'var(--primary-foreground)' }}>CTA</button>
              <div className="mt-4 flex gap-2 items-center">
                <div style={{ width: 16, height: 16, background: edited.seat_available || 'var(--seat-available)', borderRadius: 3 }} />
                <div style={{ width: 16, height: 16, background: edited.seat_selected || 'var(--seat-selected)', borderRadius: 3 }} />
                <div style={{ width: 16, height: 16, background: edited.seat_reserved || 'var(--seat-reserved)', borderRadius: 3 }} />
                <div style={{ width: 16, height: 16, background: edited.seat_sold || 'var(--seat-sold)', borderRadius: 3 }} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 text-sm text-muted-foreground">
          <Label>Gjeldende CSS-variabler (debug)</Label>
          <pre className="mt-1 p-2 bg-[var(--color-card)] text-[var(--color-on-card)] rounded text-xs">{
            `--primary: ${appliedVars.primary || '(ikke satt)'}\n--background: ${appliedVars.background || '(ikke satt)'}\n--seat-available: ${appliedVars.seat_available || '(ikke satt)'}\n--seat-sold: ${appliedVars.seat_sold || '(ikke satt)'}
          `}</pre>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Lagrer...' : 'Lagre tema'}</Button>
          <Button onClick={() => { setEdited(tokens); applyTheme(tokens) }} variant="outline">Tilbakestill</Button>
        </div>
      </CardContent>
    </Card>
  )
}
