"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Shield, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

type SupabaseStatus = "checking" | "online" | "offline"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAdminVerification, setIsAdminVerification] = useState(false)
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [adminUuidInput, setAdminUuidInput] = useState('')
  const [adminCodeInput, setAdminCodeInput] = useState('')
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>("checking")
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/dashboard"
  const supabase = getSupabaseBrowserClient()
  const adminVerificationRequired = searchParams.get('admin_verification_required') === '1'

  // Check Supabase health on mount
  useEffect(() => {
    const checkSupabaseHealth = async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!url) { setSupabaseStatus("offline"); return }
        const res = await fetch(`${url}/auth/v1/health`, { method: "GET", signal: AbortSignal.timeout(5000) })
        setSupabaseStatus(res.ok ? "online" : "offline")
      } catch {
        setSupabaseStatus("offline")
      }
    }
    checkSupabaseHealth()
  }, [])

  // Check if already authenticated and requires admin verification on mount
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user && adminVerificationRequired) {
          const statusRes = await fetch('/api/auth/admin/status')
          const statusData = await statusRes.json()
          if (statusData?.requiresVerification) {
            if (statusData?.adminUuid) setAdminUuidInput(statusData.adminUuid)
            setIsAdminVerification(true)
          }
        }
      } catch (err) {
        console.error('Error checking admin status:', err)
      }
    }
    checkAdminStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminVerificationRequired])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (supabaseStatus === "offline") {
      setError("Påloggingstjenesten er utilgjengelig. Vennligst prøv igjen senere.")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Feil e-post eller passord. Vennligst prøv igjen.")
        } else if (
          error.message.toLowerCase().includes("fetch") ||
          error.message.toLowerCase().includes("network") ||
          error.message.toLowerCase().includes("failed to fetch")
        ) {
          setSupabaseStatus("offline")
          setError("Påloggingstjenesten er utilgjengelig. Vennligst prøv igjen senere.")
        } else {
          setError(error.message)
        }
        return
      }

      // Enhanced admin security: Check if admin verification is required
      try {
        const statusRes = await fetch('/api/auth/admin/status')
        const statusData = await statusRes.json()
        
        if (statusData?.requiresVerification) {
          // Generate new UUID on every login for enhanced security
          const regenerateRes = await fetch('/api/auth/admin/regenerate-uuid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (regenerateRes.ok) {
            const regenData = await regenerateRes.json()
            if (regenData?.adminUuid) setAdminUuidInput(regenData.adminUuid)
          }
          
          // Show admin verification UI - must verify before accessing admin features
          setIsAdminVerification(true)
          return
        }
      } catch (err) {
        console.error('Error checking admin status after login:', err)
      }

      window.location.href = redirectTo
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : ""
      if (message.includes("fetch") || message.includes("network") || message.includes("failed")) {
        setSupabaseStatus("offline")
        setError("Påloggingstjenesten er utilgjengelig. Vennligst prøv igjen senere.")
      } else {
        setError("Noe gikk galt. Vennligst prøv igjen.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto rounded-lg shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-2">
      {/* Left: Branding / Illustration */}
      <div className="hidden md:flex flex-col justify-center items-start gap-4 p-10 bg-gradient-to-br from-primary/90 to-primary/70 text-primary-foreground">
        <h2 className="text-3xl font-extrabold">Velkommen tilbake</h2>
        <p className="text-lg opacity-90">Logg inn for å administrere dine billetter, kurspåmeldinger og profil.</p>
        <div className="mt-4 w-full">
          <img src="https://framerusercontent.com/images/MXpqcRcr7C8X2eiSOfLlI22bMEo.jpeg?scale-down-to=2048&width=3968&height=2648" alt="Velkommen" className="w-full h-auto" />
        </div>
      </div>

      {/* Right: Form */}
      <div className="p-8 bg-card">
        <div className="max-w-md mx-auto">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold">Logg inn</h1>
            <p className="text-sm text-muted-foreground mt-1">Skriv inn e-post og passord for å fortsette</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {supabaseStatus === "offline" && (
              <Alert variant="destructive">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  Påloggingstjenesten er utilgjengelig akkurat nå. Sjekk internettforbindelsen din eller prøv igjen om litt.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                type="email"
                placeholder="din@epost.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 text-base"
              />
            </div>

            <div>
              <Label htmlFor="password">Passord</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-12 text-base pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-12 w-12"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Skjul passord" : "Vis passord"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <Link href="/registrer" className="text-muted-foreground hover:underline">Trenger du en konto?</Link>
                <Link href="/logg-inn/glemt" className="text-muted-foreground hover:underline">Glemt passord?</Link>
              </div>
            </div>

            <div>
              <Button type="submit" className="w-full h-12" disabled={isLoading || supabaseStatus === "offline"}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Logger inn...
                  </>
                ) : supabaseStatus === "checking" ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Kobler til...
                  </>
                ) : supabaseStatus === "offline" ? (
                  "Tjenesten utilgjengelig"
                ) : (
                  "Logg inn"
                )}
              </Button>
            </div>
          </form>

          {/* Enhanced Admin Security Verification */}
          {isAdminVerification && (
            <div className="mt-6 p-4 border-2 border-amber-500 rounded-lg bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">Admin-sikkerhet påkrevd</h3>
              </div>
              
              {!isCodeSent ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setIsLoading(true)
                    setError(null)

                    // Strict UUID validation
                    if (!adminUuidInput || typeof adminUuidInput !== 'string' || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(adminUuidInput)) {
                      setError('Admin UUID er påkrevd og må være en gyldig UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)')
                      setIsLoading(false)
                      return
                    }

                    try {
                      const res = await fetch('/api/auth/admin/request-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ adminUuid: adminUuidInput })
                      })
                      const data = await res.json()
                      
                      if (!res.ok) {
                        if (res.status === 429) {
                          setError('For mange forespørsler. Prøv igjen om 5 minutter.')
                          return
                        }
                        if (data.error === 'No admin UUID set for this account') {
                          setError('Denne kontoen mangler Admin UUID. Kontakt en superadministrator.')
                        } else if (data.error === 'Invalid admin UUID') {
                          setError('Ugyldig Admin UUID. Sjekk e-posten din for riktig UUID.')
                        } else {
                          setError(data.error || 'Kunne ikke sende verifiseringskode')
                        }
                      } else {
                        setIsCodeSent(true)
                        setError(null)
                      }
                    } catch (err) {
                      console.error('Request-code error:', err)
                      setError('Nettverksfeil. Sjekk tilkoblingen og prøv igjen.')
                    } finally {
                      setIsLoading(false)
                    }
                  }}
                >
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="adminUuid" className="text-amber-900 dark:text-amber-100">Admin UUID (fra e-post)</Label>
                      <Input 
                        id="adminUuid" 
                        value={adminUuidInput} 
                        onChange={(e) => setAdminUuidInput(e.target.value.trim())} 
                        className="h-12 font-mono text-sm bg-white dark:bg-slate-900" 
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        required 
                        autoComplete="off"
                      />
                    </div>
                    
                    <div className="p-4 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2">
                      <p className="text-sm text-amber-900 dark:text-amber-100 font-medium">
                        🔒 Hvorfor dette?
                      </p>
                      <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                        <li>Din Admin UUID regenereres ved hver pålogging</li>
                        <li>UUID sendes til din registrerte e-postadresse</li>
                        <li>UUID utløper etter 24 timer av sikkerhetshensyn</li>
                        <li>Dette sikrer at kun du har tilgang til admin-funksjoner</li>
                      </ul>
                    </div>

                    {error && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sender...
                        </>
                      ) : (
                        'Send verifiseringskode'
                      )}
                    </Button>
                    <Button 
                      type="button"
                      variant="ghost" 
                      onClick={async () => { 
                        await supabase.auth.signOut()
                        window.location.href = '/'
                      }}
                      disabled={isLoading}
                    >
                      Avbryt
                    </Button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setIsLoading(true)
                    setError(null)

                    // Validate code format (6-digit numeric)
                    if (!adminCodeInput || !/^[0-9]{6}$/i.test(adminCodeInput)) {
                      setError('Verifiseringskoden må være 6 siffer')
                      setIsLoading(false)
                      return
                    }

                    try {
                      const res = await fetch('/api/auth/admin/verify-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: adminCodeInput })
                      })
                      const data = await res.json()
                      
                      if (!res.ok) {
                        if (res.status === 429) {
                          setError('For mange forsøk. Vent 5 minutter.')
                        } else {
                          setError(data.error || 'Ugyldig kode. Sjekk e-posten din.')
                        }
                      } else {
                        // Verification successful - redirect to admin area
                        window.location.href = redirectTo
                      }
                    } catch (err) {
                      console.error('Verify-code error:', err)
                      setError('Nettverksfeil. Sjekk tilkoblingen og prøv igjen.')
                    } finally {
                      setIsLoading(false)
                    }
                  }}
                >
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="adminCode" className="text-amber-900 dark:text-amber-100">Verifiseringskode (6 siffer fra e-post)</Label>
                      <Input 
                        id="adminCode" 
                        value={adminCodeInput} 
                        onChange={(e) => setAdminCodeInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} 
                        required 
                        className="h-12 font-mono text-2xl tracking-widest text-center bg-white dark:bg-slate-900" 
                        placeholder="123456"
                        maxLength={6}
                        autoComplete="off"
                        inputMode="numeric"
                      />
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Koden ble sendt til din e-postadresse og utløper om 10 minutter
                      </p>
                    </div>

                    {error && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifiserer...
                        </>
                      ) : (
                        'Verifiser og logg inn'
                      )}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => {
                        setIsCodeSent(false)
                        setAdminCodeInput('')
                        setError(null)
                      }}
                      disabled={isLoading}
                    >
                      Tilbake
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

