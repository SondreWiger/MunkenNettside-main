"use client"

import Link from "next/link"
import { Search, Home, Film, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-stage-black)] via-[var(--color-stage-black)] to-[var(--color-stage-black)] text-[var(--color-foreground)]">
      <header className="border-b border-yellow-600/30 bg-[var(--color-stage-black)/80] backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold text-yellow-500">
            🎭 TEATERET
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="text-9xl font-black text-yellow-500/20">404</div>
            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-red-500">
              Scene Not Found
            </div>
          </div>

          <p className="text-xl text-[var(--color-muted-foreground)] mb-6">
            Beklager — siden du leter etter finnes ikke på scenen vår.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <Link href="/" className="group p-6 border-2 border-yellow-500/30 rounded-lg hover:border-yellow-500 transition-all hover:bg-yellow-500/5">
              <div className="flex flex-col items-center gap-3">
                <Home className="w-8 h-8 text-yellow-500" />
                <span className="font-semibold">Hjem</span>
                <span className="text-sm text-[var(--color-muted-foreground)]">Gå til forsiden</span>
              </div>
            </Link>

            <Link href="/forestillinger" className="group p-6 border-2 border-yellow-500/30 rounded-lg hover:border-yellow-500 transition-all hover:bg-yellow-500/5">
              <div className="flex flex-col items-center gap-3">
                <Film className="w-8 h-8 text-yellow-500" />
                <span className="font-semibold">Forestillinger</span>
                <span className="text-sm text-[var(--color-muted-foreground)]">Se alle forestillinger</span>
              </div>
            </Link>

            <Link href="/billetter" className="group p-6 border-2 border-yellow-500/30 rounded-lg hover:border-yellow-500 transition-all hover:bg-yellow-500/5">
              <div className="flex flex-col items-center gap-3">
                <Ticket className="w-8 h-8 text-yellow-500" />
                <span className="font-semibold">Billetter</span>
                <span className="text-sm text-[var(--color-muted-foreground)]">Kjøp billetter nå</span>
              </div>
            </Link>
          </div>

          <div className="mb-12">
            <div className="flex gap-2 justify-center">
              <input
                type="text"
                placeholder="Søk etter ensemble, forestilling eller skuespiller..."
                className="w-full max-w-xl px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-[var(--color-on-surface)] placeholder:text-[var(--color-muted-foreground)] focus:border-yellow-500 focus:outline-none transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value) {
                    window.location.href = `/?search=${encodeURIComponent(e.currentTarget.value)}`
                  }
                }}
              />
              <Button className="bg-yellow-500 text-black hover:bg-yellow-600 px-6">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
