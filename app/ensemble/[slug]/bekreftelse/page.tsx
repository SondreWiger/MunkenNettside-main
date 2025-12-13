"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { formatPrice, formatDate } from "@/lib/utils/booking"

type EnrollmentStatus = "pending" | "confirmed" | "rejected" | "payment_pending" | null

export default function EnsembleConfirmationPage({ params }: { params: { slug: string } }) {
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference")
  const supabase = getSupabaseBrowserClient()

  const [isLoading, setIsLoading] = useState(true)
  const [enrollment, setEnrollment] = useState<any>(null)
  const [ensemble, setEnsemble] = useState<any>(null)

  useEffect(() => {
    const loadEnrollment = async () => {
      if (!reference) {
        setIsLoading(false)
        return
      }

      try {
        // Get enrollment by reference
        const { data: enrollmentData } = await supabase
          .from("ensemble_enrollments")
          .select(`
            *,
            ensemble:ensembles(*)
          `)
          .eq("enrollment_reference", reference)
          .single()

        if (enrollmentData) {
          setEnrollment(enrollmentData)
          setEnsemble(enrollmentData.ensemble)
        }
      } catch (error) {
        console.error("Error loading enrollment:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadEnrollment()
  }, [reference, supabase])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Laster påmeldingsinformasjon...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!enrollment || !reference) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Påmelding ikke funnet</h1>
            <p className="text-muted-foreground mb-6">
              Vi kunne ikke finne påmeldingen du leter etter.
            </p>
            <Button asChild>
              <Link href="/ensemble">Tilbake til ensembler</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const status = enrollment.status as EnrollmentStatus
  const isFree = (enrollment.amount_paid_nok || 0) === 0

  const getStatusInfo = () => {
    switch (status) {
      case "confirmed":
        return {
          icon: <CheckCircle className="h-16 w-16 text-green-500" />,
          title: "Velkommen til ensemblet!",
          description: "Din påmelding er godkjent og du er nå med i ensemblet.",
          color: "text-green-500",
        }
      case "payment_pending":
        return {
          icon: <Clock className="h-16 w-16 text-amber-500" />,
          title: "Venter på betaling",
          description: "Din påmelding avventer betaling. Du vil motta en bekreftelse når betalingen er fullført.",
          color: "text-amber-500",
        }
      case "pending":
        return {
          icon: <Clock className="h-16 w-16 text-blue-500" />,
          title: "Påmelding mottatt!",
          description: isFree 
            ? "Din påmelding er mottatt og vil bli behandlet av administratorer. Du får beskjed når påmeldingen er godkjent."
            : "Din påmelding er registrert og vil bli behandlet av administratorer.",
          color: "text-blue-500",
        }
      case "rejected":
        return {
          icon: <XCircle className="h-16 w-16 text-destructive" />,
          title: "Påmelding avslått",
          description: "Din påmelding har dessverre blitt avslått. Kontakt oss hvis du har spørsmål.",
          color: "text-destructive",
        }
      default:
        return {
          icon: <Clock className="h-16 w-16 text-muted-foreground" />,
          title: "Påmelding registrert",
          description: "Din påmelding er registrert.",
          color: "text-muted-foreground",
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        <div className="container px-4 py-12 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">{statusInfo.icon}</div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{statusInfo.title}</h1>
            <p className="text-muted-foreground text-lg">{statusInfo.description}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Påmeldingsdetaljer</CardTitle>
              <CardDescription>Referanse: {reference}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Ensemble</span>
                  <span className="font-semibold">{ensemble?.title}</span>
                </div>

                {ensemble?.year && (
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground">År</span>
                    <span className="font-semibold">{ensemble.year}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Deltakelsespris</span>
                  <span className="font-semibold">
                    {isFree ? "Gratis" : formatPrice(enrollment.amount_paid_nok)}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-semibold ${statusInfo.color}`}>
                    {status === "confirmed" && "Godkjent"}
                    {status === "pending" && "Venter på godkjenning"}
                    {status === "payment_pending" && "Venter på betaling"}
                    {status === "rejected" && "Avslått"}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Påmeldt</span>
                  <span className="font-semibold">
                    {formatDate(enrollment.created_at)}
                  </span>
                </div>

                {enrollment.confirmed_at && (
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground">Godkjent</span>
                    <span className="font-semibold">
                      {formatDate(enrollment.confirmed_at)}
                    </span>
                  </div>
                )}

                {enrollment.rejected_at && (
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground">Avslått</span>
                    <span className="font-semibold">
                      {formatDate(enrollment.rejected_at)}
                    </span>
                  </div>
                )}
              </div>

              {status === "payment_pending" && (
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>Merk:</strong> Din påmelding vil ikke bli behandlet før betalingen er fullført.
                    Du vil motta en bekreftelse på e-post når betalingen er registrert.
                  </p>
                </div>
              )}

              {status === "pending" && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Merk:</strong> Vi vil gjennomgå din påmelding og gi deg beskjed så snart som mulig.
                    Du vil motta en e-post når påmeldingen din er behandlet.
                  </p>
                </div>
              )}

              {status === "confirmed" && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-900 dark:text-green-100">
                    <strong>Gratulerer!</strong> Du er nå offisielt med i ensemblet.
                    Vi gleder oss til å jobbe med deg!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline">
              <Link href={`/ensemble/${params.slug}`}>Tilbake til ensemble</Link>
            </Button>
            <Button asChild>
              <Link href="/min-side">Gå til Min side</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
