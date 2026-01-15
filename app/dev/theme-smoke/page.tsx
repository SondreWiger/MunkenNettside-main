import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/layout/header'

function Swatch({ label, cssVar }: { label: string; cssVar: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-12 rounded-md shadow-sm" style={{ background: `var(${cssVar})` }} />
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{cssVar}</div>
      </div>
    </div>
  )
}

export default function ThemeSmoke() {
  return (
    <div className="min-h-screen bg-[var(--gradient-hero)] text-[var(--color-spotlight-warm)]">
      {/* Header preview (client header component) */}
      <Header />

      <main className="p-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <section className="py-8">
            <h1 className="clamp-hero headline-serif text-4xl">Design System — Munken Theatrical</h1>
            <p className="mt-2 text-lg text-[var(--color-foggy-white)]">Living dev page for tokens, components and layout — iterate here.</p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold mb-4">Color Tokens</h3>
                <div className="grid gap-3">
                  <Swatch label="Background" cssVar="--color-background" />
                  <Swatch label="Foreground" cssVar="--color-foreground" />
                  <Swatch label="Primary" cssVar="--color-primary" />
                  <Swatch label="Accent" cssVar="--color-accent" />
                  <Swatch label="Foggy/Muted" cssVar="--color-foggy-white" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold mb-4">Type Scale</h3>
                <div className="space-y-3 text-[var(--color-spotlight-warm)]">
                  <div className="clamp-hero headline-serif text-4xl">Display / Hero — clamp-hero</div>
                  <div className="text-3xl font-semibold">H1 — clamp-h1</div>
                  <div className="text-2xl font-semibold">H2 — clamp-h2</div>
                  <div className="text-base">Body — var(--type-body)</div>
                  <div className="text-sm text-muted-foreground">Caption — var(--type-caption)</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold mb-4">Shadows & Radii</h3>
                <div className="flex gap-4 items-center">
                  <div className="w-24 h-16 rounded-[var(--radius-sm)] shadow-soft bg-[var(--color-popover)] flex items-center justify-center">sm</div>
                  <div className="w-24 h-16 rounded-[var(--radius-md)] shadow-pop bg-[var(--color-popover)] flex items-center justify-center">md</div>
                  <div className="w-24 h-16 rounded-[var(--radius-lg)] shadow-pop bg-[var(--color-popover)] flex items-center justify-center">lg</div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold">Buttons & Controls</h2>
            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="default">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <Input placeholder="Navn" />
              <Input placeholder="E-post" />
              <Textarea placeholder="Skriv en kort tekst..." />
              <div>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg et alternativ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Gruppe</SelectLabel>
                      <SelectItem value="one">Alternativ 1</SelectItem>
                      <SelectItem value="two">Alternativ 2</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Card & Media Preview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <div className="aspect-video bg-[var(--color-popover)]" />
                <CardContent>
                  <h3 className="font-semibold headline-serif">Sample Production</h3>
                  <p className="text-sm text-muted-foreground">A short excerpt showing how the card looks on hover and with tokenized styles.</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm">Se mer</Button>
                    <Button size="sm" variant="outline">Billetter</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="font-semibold">Layout helpers</h3>
                  <p className="text-sm text-muted-foreground">Use these to verify spacing, container widths and responsive breakpoints.</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="font-semibold">Accessibility checks</h3>
                  <p className="text-sm text-muted-foreground">Contrast, focus ring and keyboard navigation should be checked here.</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <footer className="py-8 text-sm opacity-80">Design smoke — iterate tokens and components here. I can continue wiring cards, header, seatmap and more; tell me which area to focus next.</footer>
        </div>
      </main>
    </div>
  )
}
