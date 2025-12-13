"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, AlertCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { PayPalButton } from "@/components/payment/paypal-button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { formatPrice } from "@/lib/utils/booking"
import { toast } from "sonner"
import type { Ensemble } from "@/lib/types"

export default function EnsembleCheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [ensemble, setEnsemble] = useState<Ensemble | null>(null)
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [existingEnrollment, setExistingEnrollment] = useState<any>(null)
  const [enrollmentStatus, setEnrollmentStatus] = useState<'none' | 'pending' | 'accepted' | 'paid'>('none')
  const [discountCode, setDiscountCode] = useState("")
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null)
  const [discountError, setDiscountError] = useState("")
  const [showPayPal, setShowPayPal] = useState(false)
  const [connectedChildren, setConnectedChildren] = useState<any[]>([])
  const [selectedChildren, setSelectedChildren] = useState<string[]>([])
  const [enrollSelf, setEnrollSelf] = useState(true)

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
          router.push(`/logg-inn?redirect=/ensemble/${slug}/bestill`)
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

        // Check if user is a child with enrollment restrictions
        if (userData?.account_type === 'kid') {
          const { data: childPermission } = await supabase
            .from("family_connections")
            .select("enrollment_permission, parent_id")
            .eq("child_id", authUser.id)
            .eq("status", "active")
            .maybeSingle()

          if (childPermission) {
            if (childPermission.enrollment_permission === 'blocked') {
              toast.error("Du kan ikke melde deg på selv på grunn av foreldretillatelser")
              router.push(`/ensemble/${slug}`)
              return
            }
            if (childPermission.enrollment_permission === 'request') {
              toast.error("Du må be om tillatelse fra din foresatt for å melde deg på")
              router.push(`/ensemble/${slug}`)
              return
            }
          }
        }

        // Get ensemble data
        const { data: ensembleData } = await supabase
          .from("ensembles")
          .select("*")
          .eq("slug", slug)
          .eq("is_published", true)
          .single()

        if (!ensembleData) {
          router.push("/ensemble")
          return
        }

        // Check if enrollment is open
        if (ensembleData.stage !== "Påmelding") {
          toast.error("Påmelding er ikke åpen for dette ensemblet")
          router.push(`/ensemble/${slug}`)
          return
        }

        setEnsemble(ensembleData)

        // Fetch connected children with enrollment permissions
        const { data: familyConnections } = await supabase
          .from("family_connections")
          .select(`
            child_id,
            enrollment_permission,
            child:child_id(
              id,
              full_name,
              avatar_url
            )
          `)
          .eq("parent_id", authUser.id)
          .eq("status", "active")

        if (familyConnections && familyConnections.length > 0) {
          const children = familyConnections
            .filter((fc: any) => fc.child)
            .map((fc: any) => ({
              ...fc.child,
              enrollment_permission: fc.enrollment_permission || 'request'
            }))
          setConnectedChildren(children)
        }

        // Check enrollment status
        const { data: enrollment } = await supabase
          .from("ensemble_enrollments")
          .select("id, status, amount_paid_nok")
          .eq("user_id", authUser.id)
          .eq("ensemble_id", ensembleData.id)
          .maybeSingle()

        if (enrollment) {
          setExistingEnrollment(enrollment)
          
          // Determine status
          if (enrollment.amount_paid_nok && enrollment.amount_paid_nok > 0) {
            setEnrollmentStatus('paid')
          } else if (enrollment.status === 'accepted' || enrollment.status === 'yellow') {
            setEnrollmentStatus('accepted')
          } else {
            setEnrollmentStatus('pending')
          }
        }
      } catch (error) {
        console.error("Error loading data:", error)
        toast.error("Kunne ikke laste data")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [slug, supabase, router])

  const applyDiscountCode = async () => {
    if (!discountCode.trim()) {
      setDiscountError("Vennligst skriv inn en rabattkode")
      return
    }

    setDiscountError("")
    
    try {
      const { data: discount, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', discountCode.trim().toUpperCase())
        .maybeSingle()

      if (error || !discount) {
        setDiscountError("Ugyldig rabattkode")
        return
      }

      // Check if valid
      const now = new Date()
      if (discount.valid_from && new Date(discount.valid_from) > now) {
        setDiscountError("Denne rabattkoden er ikke aktiv ennå")
        return
      }
      if (discount.valid_until && new Date(discount.valid_until) < now) {
        setDiscountError("Denne rabattkoden har utløpt")
        return
      }
      if (discount.max_uses && discount.current_uses >= discount.max_uses) {
        setDiscountError("Denne rabattkoden har nådd maksimalt antall brukere")
        return
      }

      setAppliedDiscount(discount)
      toast.success("Rabattkode lagt til!")
    } catch (error) {
      setDiscountError("Kunne ikke validere rabattkode")
    }
  }

  const calculateFinalPrice = () => {
    const basePrice = ensemble?.participation_price_nok || 0
    
    if (!appliedDiscount) return basePrice

    if (appliedDiscount.type === 'percentage') {
      return basePrice - (basePrice * (appliedDiscount.value / 100))
    } else {
      return Math.max(0, basePrice - appliedDiscount.value)
    }
  }

  const handleEnrollment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ensemble || !user) return

    // Validate that at least one person is selected
    if (!enrollSelf && selectedChildren.length === 0) {
      toast.error("Du må velge minst én person å melde på")
      return
    }

    // Check enrollment status
    if (enrollmentStatus === 'paid') {
      toast.error("Du har allerede betalt for dette ensemblet")
      return
    }
    
    if (enrollmentStatus === 'pending') {
      toast.error("Din søknad er under behandling")
      return
    }

    // If user is accepted and needs to pay, show PayPal
    if (enrollmentStatus === 'accepted' && existingEnrollment && !isFree) {
      setShowPayPal(true)
      return
    }

    // For free enrollments or creating new enrollment
    setIsProcessing(true)

    try {
      const finalPrice = calculateFinalPrice()

      // If user is already accepted and it's free, just mark as completed
      if (enrollmentStatus === 'accepted' && existingEnrollment && isFree) {
        const { error: updateError } = await supabase
          .from('ensemble_enrollments')
          .update({
            amount_paid_nok: 0,
            payment_completed_at: new Date().toISOString(),
            notification_read: true,
          })
          .eq('id', existingEnrollment.id)

        if (updateError) {
          throw new Error("Kunne ikke registrere påmelding")
        }

        toast.success("Påmelding bekreftet!")
        router.push(`/ensemble/${slug}`)
        return
      }

      // Otherwise, create new enrollment
      const response = await fetch("/api/ensemble/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ensembleId: ensemble.id,
          customerName: formData.customer_name,
          customerEmail: formData.customer_email,
          customerPhone: formData.customer_phone,
          totalAmount: finalPrice,
          childUserIds: selectedChildren.length > 0 ? selectedChildren : undefined,
          enrollSelf: enrollSelf,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke opprette påmelding")
      }

      if (data.requiresPayment) {
        // TODO: Integrate with Vipps payment API
        // For now, we'll redirect to a confirmation page with payment_pending status
        toast.success("Påmelding opprettet! Omdirigerer til betaling...")
        
        // Simulate payment processing delay
        setTimeout(() => {
          router.push(`/ensemble/${slug}/bekreftelse?reference=${data.enrollmentReference}`)
        }, 1500)
      } else {
        // Free enrollment - directly confirm
        toast.success("Påmelding opprettet!")
        router.push(`/ensemble/${slug}/bekreftelse?reference=${data.enrollmentReference}`)
      }
    } catch (error: any) {
      console.error("Error creating enrollment:", error)
      toast.error(error.message || "Kunne ikke opprette påmelding")
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePayPalSuccess = async (details: any) => {
    try {
      const finalPrice = calculateFinalPrice()

      // Update enrollment with payment info
      const { error: updateError } = await supabase
        .from('ensemble_enrollments')
        .update({
          amount_paid_nok: finalPrice,
          payment_completed_at: new Date().toISOString(),
          notification_read: true,
        })
        .eq('id', existingEnrollment.id)

      if (updateError) {
        throw new Error("Kunne ikke registrere betaling")
      }

      // Increment discount code usage if applied
      if (appliedDiscount) {
        await supabase
          .from('discount_codes')
          .update({ current_uses: appliedDiscount.current_uses + 1 })
          .eq('id', appliedDiscount.id)
      }

      toast.success("Betaling vellykket!")
      router.push(`/ensemble/${slug}`)
    } catch (error: any) {
      console.error("Error processing payment:", error)
      toast.error(error.message || "Kunne ikke behandle betaling")
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Laster ensembledata...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!ensemble) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive mb-4">Ensemblet ble ikke funnet</p>
            <Button asChild>
              <Link href="/ensemble">Tilbake til ensembler</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const participationPrice = ensemble.participation_price_nok || 0
  const isFree = participationPrice === 0

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-muted/50 border-b">
          <div className="container px-4 py-3">
            <Link
              href={`/ensemble/${slug}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Tilbake til ensemble
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="container px-4 py-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {enrollmentStatus === 'accepted' ? 'Betal medlemskap' : 'Meld deg på ensemble'}
            </h1>
            <p className="text-muted-foreground">{ensemble.title}</p>
          </div>

          {enrollmentStatus === 'paid' && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Du har allerede betalt for dette ensemblet.
              </AlertDescription>
            </Alert>
          )}
          
          {enrollmentStatus === 'pending' && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Din søknad er under behandling. Du vil få beskjed når den er godkjent.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Enrollment Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Dine opplysninger</CardTitle>
                  <CardDescription>Fyll ut informasjonen nedenfor for å melde deg på</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEnrollment} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Fullt navn *</Label>
                      <Input
                        id="name"
                        value={formData.customer_name}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_name: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-post *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_email: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.customer_phone}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_phone: e.target.value })
                        }
                        required
                      />
                    </div>

                    {/* Connected Children Selection */}
                    {connectedChildren.length > 0 && (
                      <div className="space-y-3 pt-4 border-t">
                        <Label>Hvem skal meldes på?</Label>
                        
                        {/* Enroll self checkbox */}
                        <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors">
                          <input
                            type="checkbox"
                            checked={enrollSelf}
                            onChange={(e) => setEnrollSelf(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="font-medium">Meg selv</span>
                        </label>
                        
                        <p className="text-sm text-muted-foreground">
                          Velg barn du vil melde på:
                        </p>
                        <div className="space-y-2">
                          {connectedChildren.map((child: any) => {
                            const isBlocked = child.enrollment_permission === 'blocked'
                            const needsRequest = child.enrollment_permission === 'request'
                            const canEnroll = child.enrollment_permission === 'allowed'
                            
                            return (
                              <label
                                key={child.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                  !canEnroll
                                    ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                                    : 'cursor-pointer hover:bg-accent'
                                }`}
                                title={isBlocked ? 'Påmelding blokkert - endre i innstillinger' : needsRequest ? 'Barnet må be om tillatelse selv' : ''}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedChildren.includes(child.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedChildren([...selectedChildren, child.id])
                                    } else {
                                      setSelectedChildren(selectedChildren.filter(id => id !== child.id))
                                    }
                                  }}
                                  disabled={!canEnroll}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <div className="flex items-center gap-2 flex-1">
                                  {child.avatar_url && (
                                    <img
                                      src={child.avatar_url}
                                      alt={child.full_name}
                                      className="h-8 w-8 rounded-full object-cover"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <span className="font-medium">{child.full_name}</span>
                                    {isBlocked && (
                                      <p className="text-xs text-red-600 mt-0.5">
                                        Påmelding blokkert - endre i innstillinger
                                      </p>
                                    )}
                                    {needsRequest && !isBlocked && (
                                      <p className="text-xs text-orange-600 mt-0.5">
                                        Barnet må logge inn selv og be om tillatelse
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Discount Code Section */}
                    {!isFree && (
                      <div className="space-y-2 pt-4 border-t">
                        <Label htmlFor="discount">Rabattkode (valgfritt)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="discount"
                            value={discountCode}
                            onChange={(e) => {
                              setDiscountCode(e.target.value.toUpperCase())
                              setDiscountError("")
                            }}
                            placeholder="Skriv rabattkode"
                            disabled={!!appliedDiscount}
                          />
                          <Button
                            type="button"
                            onClick={appliedDiscount ? () => {
                              setAppliedDiscount(null)
                              setDiscountCode("")
                            } : applyDiscountCode}
                            variant={appliedDiscount ? "outline" : "secondary"}
                          >
                            {appliedDiscount ? "Fjern" : "Bruk"}
                          </Button>
                        </div>
                        {discountError && (
                          <p className="text-sm text-red-600">{discountError}</p>
                        )}
                        {appliedDiscount && (
                          <p className="text-sm text-green-600 flex items-center gap-1">
                            <Check className="h-4 w-4" />
                            Rabatt på {appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}%` : `${appliedDiscount.value} kr`} lagt til
                          </p>
                        )}
                      </div>
                    )}

                    {/* Show PayPal button if payment is needed */}
                    {showPayPal && enrollmentStatus === 'accepted' && !isFree ? (
                      <div className="space-y-4">
                        <div className="border-t pt-4">
                          <Label className="text-base font-semibold mb-3 block">Betal med PayPal</Label>
                          <PayPalButton
                            amount={calculateFinalPrice()}
                            currency="NOK"
                            description={`Medlemskap - ${ensemble.title}`}
                            onSuccess={handlePayPalSuccess}
                            onError={() => toast.error("Betaling feilet. Prøv igjen.")}
                            onCancel={() => {
                              setShowPayPal(false)
                              toast.info("Betaling avbrutt")
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowPayPal(false)}
                        >
                          Avbryt
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={isProcessing || enrollmentStatus === 'paid' || enrollmentStatus === 'pending'}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Behandler...
                          </>
                        ) : enrollmentStatus === 'accepted' ? (
                          "Betal medlemskap"
                        ) : isFree ? (
                          "Meld deg på"
                        ) : (
                          "Gå til betaling"
                        )}
                      </Button>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Sammendrag</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ensemble</p>
                    <p className="font-semibold">{ensemble.title}</p>
                  </div>

                  {ensemble.year && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">År</p>
                      <p className="font-semibold">{ensemble.year}</p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground">Deltakelsespris</span>
                      <span className={appliedDiscount ? "line-through text-muted-foreground" : "text-xl font-bold"}>
                        {isFree ? "Gratis" : formatPrice(participationPrice)}
                      </span>
                    </div>
                    {appliedDiscount && (
                      <>
                        <div className="flex items-center justify-between mb-2 text-green-600">
                          <span className="text-sm">
                            Rabatt ({appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}%` : formatPrice(appliedDiscount.value)})
                          </span>
                          <span className="text-sm font-semibold">
                            -{formatPrice(participationPrice - calculateFinalPrice())}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="font-bold">Total</span>
                          <span className="text-xl font-bold text-green-600">
                            {formatPrice(calculateFinalPrice())}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {!isFree && (
                    <div className="text-xs text-muted-foreground">
                      <p>Ved å fortsette godtar du våre vilkår og betingelser.</p>
                      <p className="mt-2">Betaling gjøres via PayPal.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
