"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, BookOpen, User, Mail, Phone, AlertCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { formatPrice } from "@/lib/utils/booking"
import type { Kurs } from "@/lib/types"

interface EnrollmentData {
  kursId: string
  totalPrice: number
  reservedUntil: string
}

export function KursCheckout() {
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null)
  const [kurs, setKurs] = useState<Kurs | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [specialRequests, setSpecialRequests] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [discountCode, setDiscountCode] = useState("")
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [appliedDiscount, setAppliedDiscount] = useState<{ type: string; value: number; code: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseBrowserClient()

  // Load enrollment data from session storage
  useEffect(() => {
    const stored = sessionStorage.getItem("kurs_enrollment")
    if (!stored) {
      router.push("/kurs")
      return
    }

    const data = JSON.parse(stored) as EnrollmentData
    setEnrollmentData(data)

    // Calculate time left
    const expiresAt = new Date(data.reservedUntil).getTime()
    const now = Date.now()
    const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))
    setTimeLeft(remaining)

    if (remaining === 0) {
      sessionStorage.removeItem("kurs_enrollment")
      router.push("/kurs?message=expired")
      return
    }

    // Fetch kurs data
    const fetchData = async () => {
      const { data: kursData } = await supabase
        .from("kurs")
        .select("*")
        .eq("id", data.kursId)
        .single()

      setKurs(kursData)
      setIsLoading(false)
    }

    fetchData()

    // Pre-fill user data if logged in
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

        if (profile) {
          setCustomerName(profile.full_name || "")
          setCustomerEmail(profile.email || user.email || "")
          setCustomerPhone(profile.phone || "")
        }
      }
    }
    getUser()
  }, [router, supabase])

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          sessionStorage.removeItem("kurs_enrollment")
          router.push("/kurs?message=expired")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, router])

  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const calculatePrice = () => {
    let price = enrollmentData?.totalPrice || 0

    // Apply discount code if available
    if (appliedDiscount) {
      if (appliedDiscount.type === "percentage") {
        price = price * (1 - appliedDiscount.value / 100)
      } else if (appliedDiscount.type === "fixed") {
        price = Math.max(0, price - appliedDiscount.value)
      }
    }

    return price
  }

  const applyDiscountCode = async () => {
    if (!discountCode.trim()) {
      setDiscountError("Skriv inn en rabattkode")
      return
    }

    setDiscountError(null)

    try {
      const { data: code, error: codeError } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discountCode.toUpperCase())
        .single()

      if (codeError || !code) {
        setDiscountError("Ugyldig rabattkode")
        setAppliedDiscount(null)
        return
      }

      // Check if code is valid
      const now = new Date()
      if (code.valid_from && new Date(code.valid_from) > now) {
        setDiscountError("Rabattkoden er ikke gyldig ennå")
        setAppliedDiscount(null)
        return
      }

      if (code.valid_until && new Date(code.valid_until) < now) {
        setDiscountError("Rabattkoden har utløpt")
        setAppliedDiscount(null)
        return
      }

      // Check if code has reached max uses
      if (code.max_uses && code.current_uses >= code.max_uses) {
        setDiscountError("Rabattkoden er ikke lenger tilgjengelig")
        setAppliedDiscount(null)
        return
      }

      // Check if applicable to kurs
      if (code.applicable_to !== "both" && code.applicable_to !== "shows") {
        setDiscountError("Denne rabattkoden kan ikke brukes på kurs")
        setAppliedDiscount(null)
        return
      }

      setAppliedDiscount({
        type: code.type,
        value: parseFloat(code.value),
        code: discountCode.toUpperCase(),
      })
      setDiscountCode("")
    } catch (err) {
      console.error("Discount code error:", err)
      setDiscountError("Feil ved bruk av rabattkode")
      setAppliedDiscount(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!customerName.trim()) {
      setError("Navn er påkrevd")
      return
    }

    if (!customerEmail.trim()) {
      setError("E-post er påkrevd")
      return
    }

    if (!acceptTerms) {
      setError("Du må godta vilkårene")
      return
    }

    if (!enrollmentData || !kurs) {
      setError("Noe gikk galt, prøv igjen")
      return
    }

    setIsProcessing(true)

    try {
      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.id) {
        setError("Du må være logget inn for å melde deg på kurs")
        setIsProcessing(false)
        return
      }

      // Call the enrollment API
      const finalPrice = calculatePrice()

      const payload = {
        kursId: enrollmentData.kursId,
        customerName,
        customerEmail,
        customerPhone,
        specialRequests,
        totalAmount: finalPrice,
        discountCode: appliedDiscount?.code,
      }

      console.log("[kurs-checkout] Sending enrollment request:", JSON.stringify(payload, null, 2))

      const response = await fetch("/api/kurs/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Noe gikk galt ved påmelding")
        setIsProcessing(false)
        return
      }

      // Clear session storage
      sessionStorage.removeItem("kurs_enrollment")

      // Redirect to success page
      router.push(`/kurs?enrollmentSuccess=true&ref=${result.enrollmentReference}`)
    } catch (err) {
      console.error("Enrollment error:", err)
      setError("Noe gikk galt ved påmelding. Prøv igjen.")
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <section className="py-12">
        <div className="container px-4">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-96 bg-muted rounded-lg" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!kurs || !enrollmentData) {
    return (
      <section className="py-12">
        <div className="container px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Kurs ikke funnet. Prøv igjen.</AlertDescription>
          </Alert>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12">
      <div className="container px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpen className="h-8 w-8" />
              Meld deg på kurs
            </h1>
            <div className="text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4 inline mr-1" />
              {formatTimeLeft()} igjen
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Påmeldingsdetaljer</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Kurs Info */}
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-semibold mb-2">{kurs.title}</h3>
                      <p className="text-sm text-muted-foreground">{kurs.synopsis_short || kurs.synopsis_long?.substring(0, 100)}</p>
                    </div>

                    {/* Personal Info */}
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Personlig informasjon
                      </h3>

                      <div>
                        <Label htmlFor="name">Fullt navn *</Label>
                        <Input
                          id="name"
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          required
                          placeholder="Ditt navn"
                          disabled={isProcessing}
                        />
                      </div>

                      <div>
                        <Label htmlFor="email">E-post *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          required
                          placeholder="din@email.no"
                          disabled={isProcessing}
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">Telefon</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+47 XXX XX XXX"
                          disabled={isProcessing}
                        />
                      </div>
                    </div>

                    {/* Special Requests */}
                    <div>
                      <Label htmlFor="special">Spesielle merknader</Label>
                      <Textarea
                        id="special"
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder="F.eks. treningsallergi, fysiske behov, osv."
                        disabled={isProcessing}
                        rows={3}
                      />
                    </div>

                    {/* Terms */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={acceptTerms}
                        onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                        disabled={isProcessing}
                      />
                      <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                        Jeg godtar vilkårene for påmelding og betaling
                      </label>
                    </div>

                    {/* Submit */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={isProcessing || !acceptTerms}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Melder på...
                        </>
                      ) : (
                        `Bekreft påmelding - ${formatPrice(calculatePrice())}`
                      )}
                    </Button>
                    {/* DEV SKIP BUTTON */}
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full mt-2"
                      disabled={isProcessing || !acceptTerms}
                      onClick={async () => {
                        setIsProcessing(true)
                        setError(null)
                        // Simulate enrollment success
                        await handleSubmit({ preventDefault: () => {} } as any)
                      }}
                    >
                      Skip (dev) – Simuler påmelding
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div>
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle className="text-sm">Oppsummering</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Price */}
                  <div className="space-y-2 border-b pb-4">
                    <div className="flex justify-between text-sm">
                      <span>Kurspris</span>
                      <span className="font-medium">{formatPrice(enrollmentData.totalPrice)}</span>
                    </div>
                    {appliedDiscount && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Rabatt</span>
                        <span className="font-medium">
                          -{appliedDiscount.type === "percentage"
                            ? `${appliedDiscount.value}%`
                            : formatPrice(appliedDiscount.value)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Totalt</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(calculatePrice())}
                    </span>
                  </div>

                  {/* Discount Code */}
                  <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="discount" className="text-sm">Rabattkode</Label>
                    <div className="flex gap-2">
                      <Input
                        id="discount"
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        placeholder="Skriv inn kode"
                        disabled={isProcessing}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={applyDiscountCode}
                        disabled={isProcessing || !discountCode.trim()}
                      >
                        Bruk
                      </Button>
                    </div>
                    {discountError && (
                      <p className="text-sm text-destructive">{discountError}</p>
                    )}
                    {appliedDiscount && (
                      <p className="text-sm text-green-600">✓ Rabattkode brukt</p>
                    )}
                  </div>

                  {/* Info */}
                  <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
                    <p>✓ Sikker betaling via Vipps</p>
                    <p>✓ Bekreftelse sendes på e-post</p>
                    <p>✓ Kontakt oss ved spørsmål</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
