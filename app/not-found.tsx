'use client'

import Link from "next/link"
import { Search, Home, Film, Ticket, Users, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
      {/* Header */}
      <header className="border-b border-yellow-600/30 bg-gray-950/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold text-yellow-500">
            🎭 TEATERET
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          {/* 404 Animation Section */}
          <div className="text-center mb-12">
            {/* Large "404" with film reel effect */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-9xl font-black text-yellow-500/20">404</div>
              </div>
              <div className="relative z-10 flex justify-center gap-4 mb-4">
                <Film className="w-24 h-24 text-yellow-500 animate-bounce" />
                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-red-500">
                  404
                </div>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black mb-4 text-white">
              Scene Not Found
            </h1>

            <p className="text-xl text-gray-300 mb-2">
              Beklager! Siden du leter etter finnes ikke på scenen vår.
            </p>

            <p className="text-gray-400 mb-12">
              Det er som en skuespiller som ikke dukket opp til premieren...
            </p>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
              <Link
                href="/"
                className="group relative p-6 border-2 border-yellow-500/30 rounded-lg hover:border-yellow-500 transition-all hover:bg-yellow-500/5"
              >
                <div className="flex flex-col items-center gap-3">
                  <Home className="w-8 h-8 text-yellow-500 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">Hjem</span>
                  <span className="text-sm text-gray-400">Gå til forsiden</span>
                </div>
              </Link>

              <Link
                href="/forestillinger"
                className="group relative p-6 border-2 border-yellow-500/30 rounded-lg hover:border-yellow-500 transition-all hover:bg-yellow-500/5"
              >
                <div className="flex flex-col items-center gap-3">
                  <Film className="w-8 h-8 text-yellow-500 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">Forestillinger</span>
                  <span className="text-sm text-gray-400">Se alle forestillinger</span>
                </div>
              </Link>

              <Link
                href="/billetter"
                className="group relative p-6 border-2 border-yellow-500/30 rounded-lg hover:border-yellow-500 transition-all hover:bg-yellow-500/5"
              >
                <div className="flex flex-col items-center gap-3">
                  <Ticket className="w-8 h-8 text-yellow-500 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">Billetter</span>
                  <span className="text-sm text-gray-400">Kjøp billetter nå</span>
                </div>
              </Link>
            </div>

            {/* Search Section */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-white">
                Søk etter ensemble eller forestilling
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Søk etter ensemble, forestilling eller skuespiller..."
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      window.location.href = `/?search=${encodeURIComponent(e.currentTarget.value)}`
                    }
                  }}
                />
                <Button className="bg-yellow-500 text-black hover:bg-yellow-600 px-6">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Additional Links */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 mb-12">
              <h3 className="text-xl font-bold mb-6 text-white">
                Andre nyttige lenker
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <Link
                  href="/"
                  className="text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  ← Tilbake til forrige side
                </Link>
                <Link
                  href="/kurs"
                  className="text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  Kurs
                </Link>
                <Link
                  href="/billetter"
                  className="text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  Min Side
                </Link>
                <Link
                  href="/logg-inn"
                  className="text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  Logg inn
                </Link>
              </div>
            </div>

            {/* IMDb-style quote */}
            <div className="border-l-4 border-yellow-500 pl-6 py-4 italic text-gray-300">
              <p className="mb-2">
                "Alle har en dag som dette, hvor det som skulle være der er ikke der. 
                Det er bare en film som skal til for å gjøre det hele bedre."
              </p>
              <p className="text-sm text-gray-500">
                — En håpefull tilskuer
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer CTA */}
      <div className="border-t border-yellow-600/30 bg-gray-950/80 backdrop-blur mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">
              Tilbake til handlingen?
            </h2>
            <p className="text-gray-400 mb-6">
              Finn din neste teateropplevelse
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                className="bg-yellow-500 text-black hover:bg-yellow-600 text-lg px-8 py-6"
              >
                <Link href="/">
                  <Home className="w-5 h-5 mr-2" />
                  Gå til forsiden
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-lg px-8 py-6"
              >
                <Link href="/forestillinger">
                  <Film className="w-5 h-5 mr-2" />
                  Se forestillinger
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <style>{`
        @keyframes filmstrip {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(20px);
          }
        }
      `}</style>
    </div>
  )
}
