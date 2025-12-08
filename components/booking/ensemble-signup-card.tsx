"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

interface EnsembleSignupCardProps {
  ensembleId: string
  ensembleSlug: string
  ensembleTitle: string
  stage: string
}

export function EnsembleSignupCard({
  ensembleId,
  ensembleSlug,
  ensembleTitle,
  stage,
}: EnsembleSignupCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOpenForEnrollment = stage === "Påmelding"

  async function handleSignUp() {
    if (!isOpenForEnrollment) return

    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/ensemble/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ensembleId }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("Enrollment error response:", data)
        setError(data.error || "Failed to enroll")
        setLoading(false)
        return
      }

      router.push(`/ensemble/${ensembleSlug}?enrollmentSuccess=true`)
    } catch (error) {
      console.error("Enrollment error:", error)
      setError("Error enrolling in ensemble")
      setLoading(false)
    }
  }

  return (
    <Card className="sticky bottom-4 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{ensembleTitle}</CardTitle>
        <CardDescription>
          Status: <span className="font-semibold">{stage}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isOpenForEnrollment ? (
          <>
            <Button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <Users className="mr-2 h-4 w-4" />
              {loading ? "Melder på..." : "Meld deg på"}
            </Button>
            {error && (
              <p className="text-sm text-destructive mt-3 text-center">{error}</p>
            )}
          </>
        ) : (
          <div className="rounded-md bg-muted p-3 text-center text-sm text-muted-foreground">
            Påmelding er ikke åpen for øyeblikket ({stage})
          </div>
        )}
      </CardContent>
    </Card>
  )
}
