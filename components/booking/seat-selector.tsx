"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Users, Calendar, MapPin, Clock, CheckCircle, Accessibility } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { formatDate, formatTime, formatPrice } from "@/lib/utils/booking"
import type { Show } from "@/lib/types"
import type { GeneratedSeat } from "@/lib/utils/seatMapGenerator"

interface SeatSelectorProps {
  show: Show
  seats: GeneratedSeat[]
}

export function SeatSelector({ show, seats }: SeatSelectorProps) {
  const [selectedSeats, setSelectedSeats] = useState<GeneratedSeat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // Debug: log seat states
  console.log("[debug] SeatSelector received seats:", {
    total: seats.length,
    blocked: seats.filter(s => s.isBlocked).length,
    handicap: seats.filter(s => s.isHandicap).length,
    sample: seats.slice(0, 3)
  })

  const showTitle = show.title || show.ensemble?.title || "Forestilling"
  const teamName =
    show.team && show.ensemble
      ? show.team === "yellow"
        ? show.ensemble.yellow_team_name
        : show.ensemble.blue_team_name
      : null

  const getSeatKey = (seat: GeneratedSeat) => {
    return `${seat.section}-${seat.rowLabel}-${seat.seatNumber}`
  }

  const toggleSeat = useCallback((seat: GeneratedSeat) => {
    if (seat.isBlocked) return

    const seatKey = getSeatKey(seat)

    setSelectedSeats((prev) => {
      const isSelected = prev.some((s) => getSeatKey(s) === seatKey)
      if (isSelected) {
        return prev.filter((s) => getSeatKey(s) !== seatKey)
      }
      return [...prev, seat]
    })
  }, [])

  const totalPrice = selectedSeats.reduce((sum, seat) => sum + (show.base_price_nok || 0), 0)

  // Group seats by section and row
  const seatsBySection = seats.reduce(
    (acc, seat) => {
      if (!acc[seat.section]) {
        acc[seat.section] = {}
      }
      if (!acc[seat.section][seat.rowLabel]) {
        acc[seat.section][seat.rowLabel] = []
      }
      acc[seat.section][seat.rowLabel].push(seat)
      return acc
    },
    {} as Record<string, Record<string, GeneratedSeat[]>>,
  )

  // Sort seats within each row
  Object.values(seatsBySection).forEach((rows) => {
    Object.values(rows).forEach((rowSeats) => {
      rowSeats.sort((a, b) => a.seatNumber - b.seatNumber)
    })
  })

  const handleProceed = async () => {
    if (selectedSeats.length === 0) {
      setError("Vennligst velg minst ett sete")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Convert selected seats to reservation format
      const seatsToReserve = selectedSeats.map((s) => ({
        row: s.row,
        col: s.col,
        section: s.section,
      }))

      console.log("[debug] Attempting to reserve:", { count: seatsToReserve.length, showId: show.id, sample: seatsToReserve[0] })

      // Call API to reserve seats
      const response = await fetch("/api/seats/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seats: seatsToReserve, showId: show.id }),
      })

      const result = await response.json()
      console.log("[debug] Reserve response:", { status: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || "Kunne ikke reservere setene")
      }

      // Store selection and redirect to checkout
      sessionStorage.setItem(
        "booking",
        JSON.stringify({
          showId: show.id,
          seats: seatsToReserve,
          totalPrice,
          reservedUntil: result.reservedUntil,
        }),
      )

      router.push(`/kasse/billett?show=${show.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt")
      setIsLoading(false)
    }
  }

  const getSeatColor = (seat: GeneratedSeat) => {
    const seatKey = getSeatKey(seat)
    const isSelected = selectedSeats.some((s) => getSeatKey(s) === seatKey)

    if (isSelected) return "bg-primary text-primary-foreground"
    if (seat.isBlocked) return "bg-muted text-muted-foreground cursor-not-allowed"
    if (seat.isHandicap) return "bg-blue-500/20 text-blue-700 hover:bg-blue-500/40 cursor-pointer border border-blue-500/50"
    return "bg-green-500/20 text-green-700 hover:bg-green-500/40 cursor-pointer"
  }

  return (
    <div className="container px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Seat Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Velg seter</CardTitle>
              <p className="text-muted-foreground">Klikk på ledige seter for å velge dem</p>
            </CardHeader>
            <CardContent>
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-green-500/20 border border-green-500/50" />
                  <span className="text-sm">Ledig</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-primary" />
                  <span className="text-sm">Valgt</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-muted border" />
                  <span className="text-sm">Blokkert</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-500/20 border border-blue-500/50" />
                  <span className="text-sm">Handicap</span>
                </div>
              </div>

              {/* Stage indicator */}
              <div className="mb-8 text-center">
                <div className="inline-block px-16 py-3 bg-muted rounded-t-full text-muted-foreground font-medium">
                  SCENE
                </div>
              </div>

              {/* Seat Grid */}
              <div className="w-full overflow-x-auto">
                <div className="space-y-2 pb-4 min-w-min">
                  {Object.entries(seatsBySection).map(([sectionName, rows], sectionIdx) => (
                    <div key={`section-${sectionIdx}-${sectionName}`}>
                      <h3 className="text-sm font-semibold mb-2">{sectionName}</h3>
                      <div className="space-y-1">
                        {Object.entries(rows)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([rowName, rowSeats], rowIdx) => (
                            <div key={`row-${rowIdx}-${rowName}`} className="flex items-center gap-1">
                              <div className="w-5 flex-shrink-0 flex items-center justify-center">
                                <span className="text-xs font-medium text-muted-foreground">{rowName}</span>
                              </div>
                              <div className="flex gap-0.5 flex-nowrap">
                                {rowSeats.map((seat) => {
                                  const seatKey = getSeatKey(seat)
                                  return (
                                    <button
                                      key={seatKey}
                                      onClick={() => toggleSeat(seat)}
                                      disabled={seat.isBlocked}
                                      className={`w-5 h-5 rounded text-xs font-medium transition-colors flex items-center justify-center relative flex-shrink-0 ${getSeatColor(seat)}`}
                                      aria-label={`Rad ${seat.rowLabel}, Sete ${seat.seatNumber}, ${
                                        seat.isHandicap ? "Handicap" : ""
                                      } ${seat.isBlocked ? "Blokkert" : "Ledig"}, ${formatPrice(show.base_price_nok || 0)}`}
                                      title={seat.isHandicap ? "Handicap tilgjengelig" : ""}
                                    >
                                      {seat.isHandicap ? (
                                        <Accessibility className="w-3 h-3" />
                                      ) : seat.isBlocked ? (
                                        ""
                                      ) : (
                                        seat.seatNumber
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          {/* Show Info */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">{showTitle}</h2>
              {teamName && (
                <Badge variant="secondary" className="mb-3">
                  {teamName}
                </Badge>
              )}
              <div className="space-y-2 text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(show.show_datetime)}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  kl. {formatTime(show.show_datetime)}
                </p>
                {show.venue && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {show.venue.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected Seats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Valgte seter ({selectedSeats.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSeats.length > 0 ? (
                <div className="space-y-2">
                  {selectedSeats.map((seat) => (
                    <div
                      key={`${seat.section}-${seat.row}-${seat.col}`}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span>
                        {seat.section}, Rad {seat.rowLabel}, Sete {seat.seatNumber}
                      </span>
                      <span className="font-medium">{formatPrice(show.base_price_nok || 0)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Totalt</span>
                      <span className="text-primary">{formatPrice(totalPrice)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Ingen seter valgt ennå</p>
              )}
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleProceed}
            disabled={selectedSeats.length === 0 || isLoading}
            size="lg"
            className="w-full h-14 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Reserverer...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Gå til betaling
              </>
            )}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Setene reserveres i 10 minutter mens du fullfører bestillingen
          </p>
        </div>
      </div>
    </div>
  )
}
