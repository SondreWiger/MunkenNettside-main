"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
// QR scanner removed — email-only verification
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

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
  const [showScanner, setShowScanner] = useState(false)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/dashboard"
  const supabase = getSupabaseBrowserClient()
  const adminVerificationRequired = searchParams.get('admin_verification_required') === '1'

  // Prefill admin UUID from previous registration if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const pending = localStorage.getItem('pendingAdminUuid')
        if (pending) setAdminUuidInput(pending)
      } catch (e) {
        // ignore
      }
    }
  }, [])

  // If we landed on the login page while already authenticated and admin verification is required,
  // immediately check status and show the verification UI so the user is blocked until they complete it.
  useEffect(() => {
    const check = async () => {
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
        // ignore
      }
    }
    check()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminVerificationRequired])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Feil e-post eller passord. Vennligst prøv igjen.")
        } else {
          setError(error.message)
        }
        return
      }

      // Check if admin verification is required for this user
      try {
        const statusRes = await fetch('/api/auth/admin/status')
        const statusData = await statusRes.json()
        if (statusData?.requiresVerification) {
          // For admin users, regenerate UUID on every login for security
          const regenerateRes = await fetch('/api/auth/admin/regenerate-uuid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (regenerateRes.ok) {
            const regenData = await regenerateRes.json()
            // If the server exposes an adminUuid (dev only), prefill it to help debugging
            if (regenData?.adminUuid) setAdminUuidInput(regenData.adminUuid)
          }
          
          setIsAdminVerification(true)
          return
        }
      } catch (err) {
        console.error('Error checking admin status after login:', err)
      }

      window.location.href = redirectTo
    } catch {
      setError("Noe gikk galt. Vennligst prøv igjen.")
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
              <Button type="submit" className="w-full h-12" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Logger inn...
                  </>
                ) : (
                  "Logg inn"
                )}
              </Button>
            </div>
          </form>

          {/* Admin verification UI - shown after successful password login if admin verification required */}
          {isAdminVerification && (
            <div className="mt-6 p-4 border rounded-lg bg-muted">
              <h3 className="text-lg font-semibold mb-2">Admin-verifisering</h3>
              {!isCodeSent ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setIsLoading(true)
                    setError(null)

                    // Require admin UUID for admin verification flow
                    if (!adminUuidInput || typeof adminUuidInput !== 'string' || !/^[0-9a-fA-F-]{36,36}$/.test(adminUuidInput)) {
                      setError('Admin UUID er påkrevd og må være en gyldig UUID.')
                      setIsLoading(false)
                      return
                    }

                    try {
                      // Save pending uuid locally to help future logins
                      try { localStorage.setItem('pendingAdminUuid', adminUuidInput) } catch (e) {}

                      const res = await fetch('/api/auth/admin/request-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ adminUuid: adminUuidInput })
                      })
                      const data = await res.json()
                      if (!res.ok) {
                        if (res.status === 429) {
                          setError('For mange forespørsler. Prøv igjen senere.')
                          return
                        }
                        if (data.error === 'No admin UUID set for this account') {
                          setError('Denne kontoen har ingen Admin UUID. Kontakt en administrator.')
                        } else if (data.error === 'Invalid admin UUID') {
                          setError('Ugyldig Admin UUID. Sjekk at du skrev den riktig eller be om UUID fra en administrator.')
                        } else {
                          setError(data.error || 'Kunne ikke sende kode')
                        }
                      } else {
                        setIsCodeSent(true)
                        setError(null)
                      }
                    } catch (err) {
                      console.error('Request-code error:', err)
                      setError('Noe gikk galt ved sending av kode')
                    } finally {
                      setIsLoading(false)
                    }
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="adminUuid">Admin UUID</Label>
                    <Input id="adminUuid" value={adminUuidInput} onChange={(e) => setAdminUuidInput(e.target.value)} className="h-12" required />
                  </div>
                    <div className="mt-3">
                      <p className="text-sm text-muted-foreground mb-2">
                        Som administrator regenereres din UUID ved hver pålogging av sikkerhetshensyn. 
                        Du har mottatt en ny UUID på e-post. Skriv inn Admin UUID og trykk «Send kode».
                      </p>
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mt-2">
                        <p className="text-xs text-yellow-800">
                          <strong>⚠️ Sikkerhet:</strong> Admin UUID utløper etter 24 timer. 
                          Kontakt superadmin hvis du ikke har tilgang til e-posten din eller UUID-en har utløpt.
                        </p>
                      </div>
                    </div>
                  <div className="flex gap-2 mt-4">
                    <Button type="submit" disabled={isLoading}>Send kode</Button>
                    <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}>Avbryt</Button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setIsLoading(true)
                    try {
                      const res = await fetch('/api/auth/admin/verify-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: adminCodeInput })
                      })
                      const data = await res.json()
                      if (!res.ok) {
                        setError(data.error || 'Ugyldig kode')
                      } else {
                        // Verification successful - redirect to target
                        try { localStorage.removeItem('pendingAdminUuid') } catch (e) {}
                        window.location.href = redirectTo
                      }
                    } catch (err) {
                      console.error('Verify-code error:', err)
                      setError('Noe gikk galt ved verifisering')
                    } finally {
                      setIsLoading(false)
                    }
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="adminCode">Skriv inn koden du fikk på e-post</Label>
                    <Input id="adminCode" value={adminCodeInput} onChange={(e) => setAdminCodeInput(e.target.value)} required className="h-12" />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button type="submit" disabled={isLoading}>Verifiser</Button>
                    <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}>Avbryt</Button>
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
