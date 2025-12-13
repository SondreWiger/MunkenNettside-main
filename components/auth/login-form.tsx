"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/dashboard"
  const supabase = getSupabaseBrowserClient()

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
          // Start admin verification flow
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Logg inn</CardTitle>
        <CardDescription className="text-center">Skriv inn din e-post og passord for å logge inn</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">
              E-post
            </Label>
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

          <div className="space-y-2">
            <Label htmlFor="password" className="text-base">
              Passord
            </Label>
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
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Logger inn...
              </>
            ) : (
              "Logg inn"
            )}
          </Button>

          <p className="text-center text-muted-foreground">
            Har du ikke konto?{" "}
            <Link href="/registrer" className="font-medium text-primary hover:underline">
              Registrer deg
            </Link>
          </p>
        </CardFooter>
      </form>

      {/* Admin verification UI - shown after successful password login if admin verification required */}
      {isAdminVerification && (
        <div className="mt-6 p-4 border rounded-lg bg-muted">
          <h3 className="text-lg font-semibold mb-2">Admin-verifisering</h3>
          {!isCodeSent ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setIsCodeSent(false)
                setIsLoading(true)
                try {
                  const res = await fetch('/api/auth/admin/request-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ adminUuid: adminUuidInput })
                  })
                  const data = await res.json()
                  if (!res.ok) {
                    setError(data.error || 'Kunne ikke sende kode')
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
                <Input id="adminUuid" value={adminUuidInput} onChange={(e) => setAdminUuidInput(e.target.value)} required className="h-12" />
              </div>
              <div className="flex gap-2 mt-4">
                <Button type="submit" disabled={isLoading}>Send kode</Button>
                <Button variant="ghost" onClick={() => { setIsAdminVerification(false); setError(null); }}>Avbryt</Button>
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
                <Button variant="ghost" onClick={() => { setIsAdminVerification(false); setIsCodeSent(false); setError(null); }}>Avbryt</Button>
              </div>
            </form>
          )}
        </div>
      )}
    </Card>
  )
}
