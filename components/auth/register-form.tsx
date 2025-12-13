"use client"

import type React from "react"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2, CheckCircle, User, Users, Baby } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

type AccountType = "standalone" | "parent" | "kid"

export function RegisterForm() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [accountType, setAccountType] = useState<AccountType>("standalone")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [adminUuid, setAdminUuid] = useState('')
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/dashboard"
  const supabase = getSupabaseBrowserClient()

  const calculateAge = (dob: string): number => {
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (password !== confirmPassword) {
      setError("Passordene stemmer ikke overens")
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Passordet må være minst 8 tegn")
      setIsLoading(false)
      return
    }

    // Validate date of birth for kid accounts
    if (accountType === "kid") {
      if (!dateOfBirth) {
        setError("Fødselsdato er påkrevd for barnekontoer")
        setIsLoading(false)
        return
      }
      const age = calculateAge(dateOfBirth)
      if (age >= 18) {
        setError("Barnekontoer er kun for personer under 18 år")
        setIsLoading(false)
        return
      }
    }

    // Validate parent accounts are 18+
    if (accountType === "parent" && dateOfBirth) {
      const age = calculateAge(dateOfBirth)
      if (age < 18) {
        setError("Foreldrekontoer krever at du er minst 18 år")
        setIsLoading(false)
        return
      }
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}${redirectTo}`,
          data: {
            full_name: fullName,
            phone: phone || null,
            account_type: accountType,
            date_of_birth: dateOfBirth && dateOfBirth.trim() !== '' ? dateOfBirth : null,
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("Denne e-postadressen er allerede registrert")
        } else {
          setError(signUpError.message)
        }
        return
      }

      if (data.user) {
        // Always try to create profile, even if signup fails due to existing email
        try {
          const profileResponse = await fetch("/api/auth/setup-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: data.user.id,
              fullName,
              phone,
              email,
              accountType,
              dateOfBirth: dateOfBirth || null,
            }),
          })

          if (!profileResponse.ok) {
            const errorData = await profileResponse.json()
            console.log("Profile setup response:", errorData)
            // Still consider signup successful even if profile setup has issues
          } else {
            const profileData = await profileResponse.json()
            console.log("Profile created successfully:", profileData)
          }
        } catch (profileError) {
          console.log("Profile setup error (non-critical):", profileError)
          // Don't fail registration if profile setup fails
        }

        // Save pending admin UUID locally so it can be used on first login
        if (adminUuid && typeof window !== 'undefined') {
          try { localStorage.setItem('pendingAdminUuid', adminUuid) } catch (e) { /* ignore */ }
        }

        setSuccess(true)
      }
    } catch (err) {
      console.error("Signup error:", err)
      setError("Noe gikk galt. Vennligst prøv igjen.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-600" />
          <CardTitle className="text-2xl font-bold">Sjekk e-posten din</CardTitle>
          <CardDescription className="text-base">
            Vi har sendt en bekreftelseslenke til <strong>{email}</strong>. Klikk på lenken for å aktivere kontoen din.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild className="w-full h-12">
            <Link href="/logg-inn">Gå til innlogging</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Opprett konto</CardTitle>
        <CardDescription className="text-center">Fyll ut skjemaet for å opprette en ny konto</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-base">
              Fullt navn *
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Ola Nordmann"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">
              E-post *
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
            <Label htmlFor="phone" className="text-base">
              Telefon (valgfritt)
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+47 123 45 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-base">
              Passord *
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minst 8 tegn"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-base">
              Bekreft passord *
            </Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Gjenta passord"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminUuid" className="text-base">
              Admin UUID (valgfritt)
            </Label>
            <Input
              id="adminUuid"
              type="text"
              placeholder="Skriv inn Admin UUID hvis du har mottatt en"
              value={adminUuid}
              onChange={(e) => setAdminUuid(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Account Type Selection */}
          <div className="space-y-3 pt-2">
            <Label className="text-base font-semibold">Kontotype *</Label>
            <RadioGroup value={accountType} onValueChange={(val) => setAccountType(val as AccountType)}>
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="standalone" id="standalone" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="standalone" className="cursor-pointer font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Privatperson
                    </div>
                  </Label>
                  <p className="text-sm text-muted-foreground">Du administrerer kun din egen bruker</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="parent" id="parent" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="parent" className="cursor-pointer font-medium">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Foresatt
                    </div>
                  </Label>
                  <p className="text-sm text-muted-foreground">Du kan administrere barn sine påmeldinger</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="kid" id="kid" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="kid" className="cursor-pointer font-medium">
                    <div className="flex items-center gap-2">
                      <Baby className="h-4 w-4" />
                      Barn
                    </div>
                  </Label>
                  <p className="text-sm text-muted-foreground">Du trenger foresatts godkjennelse for påmeldinger</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Date of Birth for Kids and Parents */}
          {(accountType === "kid" || accountType === "parent") && (
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth" className="text-base">
                Fødselsdato {accountType === "kid" ? "*" : "(valgfritt)"} 
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required={accountType === "kid"}
                className="h-12 text-base"
              />
              {accountType === "kid" && dateOfBirth && (
                <p className="text-sm text-muted-foreground">
                  Alder: {calculateAge(dateOfBirth)} år {calculateAge(dateOfBirth) >= 18 && "(må være under 18)"}
                </p>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Oppretter konto...
              </>
            ) : (
              "Opprett konto"
            )}
          </Button>

          <p className="text-center text-muted-foreground">
            Har du allerede konto?{" "}
            <Link href="/logg-inn" className="font-medium text-primary hover:underline">
              Logg inn
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
