"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Check } from "lucide-react"
import { formatPrice } from "@/lib/utils/booking"
import type { Kurs } from "@/lib/types"

interface KursSignupCardProps {
  kurs: Kurs
  slug: string
  isFull: boolean
  spotsAvailable: number
}

export function KursSignupCard({ kurs, slug, isFull, spotsAvailable }: KursSignupCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignUp = async () => {
    setIsLoading(true)

    try {
      // Initialize enrollment data in session storage
      const enrollmentData = {
        kursId: kurs.id,
        totalPrice: kurs.price_nok,
        reservedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
      }

      sessionStorage.setItem("kurs_enrollment", JSON.stringify(enrollmentData))

      // Navigate to enrollment page
      router.push(`/kurs/${slug}/enroll`)
    } catch (error) {
      console.error("Error initiating enrollment:", error)
      setIsLoading(false)
    }
  }

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <div className="text-4xl font-bold text-primary">
          {formatPrice(kurs.price_nok)}
        </div>
        <CardDescription>Per deltaker</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Availability */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium">Plasser tilgjengelig</p>
          <p className={`text-2xl font-bold ${isFull ? "text-destructive" : "text-green-600"}`}>
            {Math.max(0, spotsAvailable)}
          </p>
        </div>

        {/* CTA Buttons */}
        <Button
          size="lg"
          className="w-full"
          disabled={isFull || isLoading}
          onClick={handleSignUp}
        >
          {isLoading ? "Forbereider..." : isFull ? "Kurset er fullt" : "Meld deg på"}
        </Button>

        <Button variant="outline" size="lg" className="w-full" asChild>
          <Link href="/logg-inn">Logg inn for å registrere</Link>
        </Button>

        {/* Info */}
        <div className="space-y-2 pt-4 border-t text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Fleksibel oppmøte</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Instruksjon fra erfarne dansere</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Supportivt miljø for alle nivåer</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
