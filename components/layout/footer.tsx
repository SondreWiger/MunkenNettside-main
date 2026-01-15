"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, Phone, MapPin, Instagram, Twitter, Youtube, Facebook } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

async function subscribe(email: string) {
  const res = await fetch("/api/newsletter/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })

  return res
}

export function Footer() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email || !email.includes("@")) {
      toast.error("Vennligst oppgi en gyldig e-postadresse")
      return
    }
    setLoading(true)
    try {
      const res = await subscribe(email)
      if (res.ok) {
        toast.success("Takk! Du er påmeldt nyhetsbrevet.")
        setEmail("")
      } else {
        const data = await res.json()
        toast.error(data?.error || "Kunne ikke abonnere, prøv igjen senere")
      }
    } catch (err) {
      toast.error("Nettverksfeil: prøv igjen senere")
    } finally {
      setLoading(false)
    }
  }

  const siteSocials = {
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || "",
    twitter: process.env.NEXT_PUBLIC_SOCIAL_TWITTER || "",
    facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || "",
    youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || "",
  }

  return (
    <footer aria-labelledby="footer-heading" className="border-t bg-muted/50">
      <div className="container px-4 py-12 md:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* About */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold headline-serif">Om Teateret</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vi er et lokalt teater med fokus på kvalitetsforestillinger for hele familien. Opplev magien på scenen
              eller hjemmefra med våre digitale opptak.
            </p>

            <div className="mt-6 flex items-center gap-4">
              {siteSocials.instagram ? (
                <a href={siteSocials.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <Instagram className="h-5 w-5 text-accent hover:text-foreground transition-colors" />
                </a>
              ) : null}
              {siteSocials.facebook ? (
                <a href={siteSocials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <Facebook className="h-5 w-5 text-accent hover:text-foreground transition-colors" />
                </a>
              ) : null}
              {siteSocials.twitter ? (
                <a href={siteSocials.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                  <Twitter className="h-5 w-5 text-accent hover:text-foreground transition-colors" />
                </a>
              ) : null}
              {siteSocials.youtube ? (
                <a href={siteSocials.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                  <Youtube className="h-5 w-5 text-accent hover:text-foreground transition-colors" />
                </a>
              ) : null}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="mb-4 text-lg font-semibold headline-serif">Snarveier</h2>
            <nav className="flex flex-col gap-2">
              <Link href="/forestillinger" className="text-muted-foreground hover:text-foreground transition-colors">
                Forestillinger
              </Link>
                <Link href="/use" className="text-muted-foreground hover:text-foreground transition-colors">
                  Dokumentasjon
                </Link>
              <Link href="/opptak" className="text-muted-foreground hover:text-foreground transition-colors">
                Digitale opptak
              </Link>
              <Link href="/om-oss" className="text-muted-foreground hover:text-foreground transition-colors">
                Om oss
              </Link>
              <Link href="/kontakt" className="text-muted-foreground hover:text-foreground transition-colors">
                Kontakt
              </Link>
              <Link href="/legal" className="text-muted-foreground hover:text-foreground transition-colors">
                Juridiske dokumenter
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h2 className="mb-4 text-lg font-semibold headline-serif">Kontakt</h2>
            <address className="flex flex-col gap-3 not-italic text-muted-foreground">
              <a
                href="mailto:kontakt@teateret.no"
                className="flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <Mail className="h-5 w-5" aria-hidden="true" />
                kontakt@teateret.no
              </a>
              <a href="tel:+4712345678" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Phone className="h-5 w-5" aria-hidden="true" />
                +47 123 45 678
              </a>
              <span className="flex items-center gap-2">
                <MapPin className="h-5 w-5" aria-hidden="true" />
                Teaterveien 1, 0123 Oslo
              </span>
            </address>
          </div>

          {/* Newsletter */}
          <div>
            <h2 className="mb-4 text-lg font-semibold headline-serif">Nyhetsbrev</h2>
            <p className="text-sm text-muted-foreground mb-4">Få nyheter og kommende forestillinger rett i innboksen.</p>
            <form id="newsletter" onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                aria-label="E-post for nyhetsbrev"
                placeholder="din@email.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0"
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Sender…" : "Meld på"}
              </Button>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">Ingen spam — avslutt enkelt når du vil.</p>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} Teateret. Alle rettigheter reservert.</p>
          <div className="text-sm">
            <Link href="/legal/impressum" className="mr-4 hover:text-foreground transition-colors">
              Om nettstedet
            </Link>
            <Link href="/legal" className="hover:text-foreground transition-colors">
              Personvern
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
