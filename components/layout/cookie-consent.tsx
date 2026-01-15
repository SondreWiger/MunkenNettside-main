"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { X, Cookie, Settings, Shield } from "lucide-react"

interface CookieConsent {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  preferences: boolean
}

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [consent, setConsent] = useState<CookieConsent>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: true,
  })

  useEffect(() => {
    // Check if user has already given consent
    const hasConsent = localStorage.getItem("cookie-consent")
    if (!hasConsent) {
      setShowBanner(true)
    } else {
      // Load existing preferences
      try {
        const savedConsent = JSON.parse(hasConsent)
        setConsent(savedConsent)
        // Apply consent settings
        applyCookieSettings(savedConsent)
      } catch {
        setShowBanner(true)
      }
    }
  }, [])

  const applyCookieSettings = (settings: CookieConsent) => {
    // Apply analytics consent
    if (settings.analytics && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted'
      })
    }
    
    // Apply marketing consent (if you have marketing cookies)
    if (settings.marketing && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        ad_storage: 'granted'
      })
    }
  }

  const acceptAll = () => {
    const allConsent: CookieConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    }
    saveConsent(allConsent)
  }

  const acceptNecessary = () => {
    const necessaryConsent: CookieConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: true,
    }
    saveConsent(necessaryConsent)
  }

  const acceptCustom = () => {
    saveConsent(consent)
  }

  const saveConsent = (settings: CookieConsent) => {
    localStorage.setItem("cookie-consent", JSON.stringify(settings))
    localStorage.setItem("cookie-consent-date", new Date().toISOString())
    applyCookieSettings(settings)
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="max-w-4xl mx-auto border-2 shadow-lg">
        <CardContent className="p-6">
          {!showDetails ? (
            // Basic consent banner
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Cookie className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">Vi bruker cookies</h3>
                  <p className="text-muted-foreground text-sm">
                    Vi bruker nødvendige cookies for at siden skal fungere, samt valgfrie cookies for analyse og forbedring. 
                    Du kan lese mer i vår <a href="/legal/personvern" className="underline hover:text-primary">personvernerklæring</a>.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 min-w-fit">
                <Button onClick={() => setShowDetails(true)} variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Tilpass
                </Button>
                <Button onClick={acceptNecessary} variant="outline" size="sm">
                  Kun nødvendige
                </Button>
                <Button onClick={acceptAll} size="sm">
                  Godta alle
                </Button>
              </div>
            </div>
          ) : (
            // Detailed consent settings
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Cookie-innstillinger
                </h3>
                <Button 
                  onClick={() => setShowDetails(false)} 
                  variant="ghost" 
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="necessary" 
                    checked={consent.necessary} 
                    disabled
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="necessary" className="font-medium">
                      Nødvendige cookies (Påkrevd)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Kreves for grunnleggende funksjonalitet som innlogging og sikkerhet.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="preferences" 
                    checked={consent.preferences}
                    onCheckedChange={(checked) => 
                      setConsent(prev => ({ ...prev, preferences: checked as boolean }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="preferences" className="font-medium">
                      Preferanse-cookies
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Husker dine valg som språk, tema og andre brukerinnstillinger.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="analytics" 
                    checked={consent.analytics}
                    onCheckedChange={(checked) => 
                      setConsent(prev => ({ ...prev, analytics: checked as boolean }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="analytics" className="font-medium">
                      Analyse-cookies
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Hjelper oss forbedre nettsiden ved å analysere hvordan du bruker den (anonymisert).
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="marketing" 
                    checked={consent.marketing}
                    onCheckedChange={(checked) => 
                      setConsent(prev => ({ ...prev, marketing: checked as boolean }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="marketing" className="font-medium">
                      Markedsføring-cookies
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Brukes for å vise relevante annonser og målrettet kommunikasjon.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <Button onClick={acceptNecessary} variant="outline" size="sm">
                  Kun nødvendige
                </Button>
                <Button onClick={acceptCustom} size="sm">
                  Lagre valg
                </Button>
                <Button onClick={acceptAll} size="sm">
                  Godta alle
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Cookie management hook
export function useCookieConsent() {
  const [hasConsent, setHasConsent] = useState<CookieConsent | null>(null)

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent")
    if (consent) {
      try {
        setHasConsent(JSON.parse(consent))
      } catch {
        setHasConsent(null)
      }
    }
  }, [])

  const updateConsent = (newConsent: CookieConsent) => {
    localStorage.setItem("cookie-consent", JSON.stringify(newConsent))
    localStorage.setItem("cookie-consent-date", new Date().toISOString())
    setHasConsent(newConsent)
  }

  return { hasConsent, updateConsent }
}