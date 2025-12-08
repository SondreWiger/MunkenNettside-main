"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { formatPrice } from "@/lib/utils/booking"
import { toast } from "sonner"
import type { Kurs } from "@/lib/types"

export default function KursCheckoutPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [kurs, setKurs] = useState<Kurs | null>(null)
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false)

  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current user
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          router.push(`/logg-inn?redirect=/kurs/${params.slug}/bestill`)
          return
        }

        // Get user profile
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single()

        setUser(userData || authUser)
        setFormData({
          customer_name: userData?.full_name || "",
          customer_email: authUser.email || "",
          customer_phone: userData?.phone || "",
        })

        // Get kurs data
        const { data: kursData } = await supabase
          .from("kurs")
          .select("*")
          .eq("slug", params.slug)
          .eq("is_published", true)
          .single()

        if (!kursData) {
          router.push("/kurs")
          return
        }

        setKurs(kursData)

        // Check if already enrolled
        const { data: existingEnrollment } = await supabase
          .from("kurs_enrollments")
          .select("id")
          .eq("user_id", authUser.id)
          .eq("kurs_id", kursData.id)
          .single()

        if (existingEnrollment) {
          setAlreadyEnrolled(true)
        }
      } catch (error) {
        console.error("Error loading data:", error)
        toast.error("Kunne ikke laste data")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [params.slug, supabase, router])

  const generateReference = () => {
    return `KURS-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
  }

  const handleEnrollment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!kurs || !user) return

    // Check if already enrolled
    if (alreadyEnrolled) {
      toast.error("Du er allerede påmeldt dette kurset")
      return
    }

    setIsProcessing(true)

    try {
      const enrollmentReference = generateReference()

      // Create enrollment with pending status
      const { data: enrollment, error } = await supabase
        .from("kurs_enrollments")
        .insert({
          user_id: user.id,
          kurs_id: kurs.id,
          amount_paid_nok: kurs.price_nok,
          status: "pending",
          enrollment_reference: enrollmentReference,
        })
        .select()
        .single()

      if (error) throw error

      // TODO: Integrate with Vipps payment API
      // For now, we'll redirect to a confirmation page with pending status
      // In production, this would call Vipps API and get a payment link

      toast.success("Påmelding opprettet! Omdirigerer til betaling...")

      // Simulate payment processing delay
      setTimeout(() => {
        router.push(`/kurs/${params.slug}/bekreftelse?reference=${enrollmentReference}`)
      }, 1500)
    } catch (error: any) {
      console.error("Error creating enrollment:", error)
      toast.error(error.message || "Kunne ikke opprett påmelding")
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Laster kursdata...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!kurs) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive mb-4">Kurset ble ikke funnet</p>
            <Button asChild>
              <Link href="/kurs">Tilbake til kurs</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-muted/50 border-b">
          <div className="container px-4 py-3">
            <Link
              href={`/kurs/${params.slug}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Tilbake til kurs
            </Link>
          </div>
        </div>

        {/* Hero */}
        <section className="bg-primary text-primary-foreground py-8">
          <div className="container px-4">
            <h1 className="text-3xl font-bold">Påmelding til kurs</h1>
            <p className="mt-2 text-primary-foreground/90">{kurs.title}</p>
          </div>
        </section>

        {/* Checkout */}
        <section className="py-12">
          <div className="container px-4 max-w-4xl">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Form */}
              <div className="lg:col-span-2">
                {alreadyEnrolled && (
                  <Alert className="mb-6 border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Du er allerede påmeldt dette kurset. Du kan se dine påmeldinger på{" "}
                      <Link href="/min-side" className="font-semibold underline">
                        min side
                      </Link>
                    </AlertDescription>
                  </Alert>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Dine opplysninger</CardTitle>
                    <CardDescription>Bekreft dine kontaktdetaljer</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleEnrollment} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Fullt navn</Label>
                        <Input
                          id="name"
                          type="text"
                          value={formData.customer_name}
                          onChange={(e) =>
                            setFormData({ ...formData, customer_name: e.target.value })
                          }
                          placeholder="Ditt fullt navn"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">E-post</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.customer_email}
                          onChange={(e) =>
                            setFormData({ ...formData, customer_email: e.target.value })
                          }
                          placeholder="din@email.no"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefon</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.customer_phone}
                          onChange={(e) =>
                            setFormData({ ...formData, customer_phone: e.target.value })
                          }
                          placeholder="+47 12345678"
                        />
                      </div>

                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Neste steg: Du blir omdirigert til Vipps for betaling av{" "}
                          <span className="font-bold">{formatPrice(kurs.price_nok)}</span>
                        </AlertDescription>
                      </Alert>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        disabled={isProcessing || alreadyEnrolled}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Behandler påmelding...
                          </>
                        ) : alreadyEnrolled ? (
                          "Du er allerede påmeldt"
                        ) : (
                          "Gå til betaling"
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-20">
                  <CardHeader>
                    <CardTitle>Oppsummering</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-3">{kurs.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{kurs.synopsis_short}</p>
                    </div>

                    <div className="space-y-2 text-sm py-4 border-t border-b">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kurs pris</span>
                        <span className="font-semibold">{formatPrice(kurs.price_nok)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      <span className="text-lg font-bold">Totalt</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(kurs.price_nok)}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground pt-4 border-t">
                      <p>✓ Sikker betaling via Vipps</p>
                      <p>✓ Bekreftelse via e-post</p>
                      <p>✓ Mulighet til å avmelde</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
