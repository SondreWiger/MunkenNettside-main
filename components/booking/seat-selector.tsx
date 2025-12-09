"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Users, Calendar, MapPin, Clock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { formatDate, formatTime, formatPrice } from "@/lib/utils/booking"
import type { Seat, SeatStatus, Show } from "@/lib/types"

interface SeatSelectorProps {
  show: Show
  seats: Seat[]
  isEarlyBird?: boolean
  earlyBirdDiscount?: number
  originalPrice?: number
  currentPrice?: number
}

const normalizeStatus = (seat?: Seat): SeatStatus => {
  const current = (seat?.status || "available").toString().toLowerCase()
  if (current === "sold") return "sold"
  if (current === "reserved") return "reserved"
  if (current === "blocked") return "blocked"
  return "available"
}

export function SeatSelector({ 
  show, 
  seats: initialSeats,
  isEarlyBird = false,
  earlyBirdDiscount = 0,
  originalPrice,
  currentPrice
}: SeatSelectorProps) {
  const [seats, setSeats] = useState<Seat[]>(initialSeats)
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const showTitle = show.title || show.ensemble?.title || "Forestilling"
  const teamName =
    show.team && show.ensemble
      ? show.team === "yellow"
        ? show.ensemble.yellow_team_name
        : show.ensemble.blue_team_name
      : null

  useEffect(() => {
    setSeats(initialSeats)
  }, [initialSeats])

  useEffect(() => {
    const channel = supabase
      .channel(`seats-${show.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "seats",
          filter: `show_id=eq.${show.id}`,
        },
        (payload: { new: Seat | null }) => {
          if (!payload.new) return
          const updatedSeat = payload.new
          setSeats((prev) => {
            const exists = prev.some((seat) => seat.id === updatedSeat.id)
            if (exists) {
              return prev.map((seat) => (seat.id === updatedSeat.id ? { ...seat, ...updatedSeat } : seat))
            }
            return [...prev, updatedSeat]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [show.id, supabase])

  useEffect(() => {
    setSelectedSeats((prev) =>
      prev.filter((seat) => normalizeStatus(seats.find((s) => s.id === seat.id)) === "available"),
    )
  }, [seats])

  const getSeatKey = useCallback((seat: Seat) => `${seat.section}-${seat.row}-${seat.number}`, [])

  const toggleSeat = useCallback(
    (seat: Seat) => {
      if (normalizeStatus(seat) !== "available") return

      const seatKey = getSeatKey(seat)
      setSelectedSeats((prev) => {
        const isSelected = prev.some((s) => getSeatKey(s) === seatKey)
        if (isSelected) {
          return prev.filter((s) => getSeatKey(s) !== seatKey)
        }
        return [...prev, seat]
      })
    },
    [getSeatKey],
  )

  const getActualSeatPrice = (seat: Seat) => {
    const basePrice = seat.price_nok || show.base_price_nok || 0
    return isEarlyBird ? Math.max(0, basePrice - earlyBirdDiscount) : basePrice
  }
  
  const totalPrice = selectedSeats.reduce((sum, seat) => sum + getActualSeatPrice(seat), 0)
  const originalTotalPrice = selectedSeats.reduce((sum, seat) => sum + (seat.price_nok || show.base_price_nok || 0), 0)
  const totalSavings = originalTotalPrice - totalPrice

  const seatsBySection = seats.reduce((acc, seat) => {
    if (!acc[seat.section]) acc[seat.section] = {}
    if (!acc[seat.section][seat.row]) acc[seat.section][seat.row] = []
    acc[seat.section][seat.row].push(seat)
    return acc
  }, {} as Record<string, Record<string, Seat[]>>)

  Object.values(seatsBySection).forEach((rows) => {
    Object.values(rows).forEach((rowSeats) => {
      rowSeats.sort((a, b) => a.number - b.number)
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
      const seatIds = selectedSeats.map((seat) => seat.id)
      console.log("[debug] Attempting to reserve:", { count: seatIds.length, showId: show.id, seatIds })

      const response = await fetch("/api/seats/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatIds, showId: show.id }),
      })

      const result = await response.json()
      console.log("[debug] Reserve response:", { status: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || "Kunne ikke reservere setene")
      }

      sessionStorage.setItem(
        "booking",
        JSON.stringify({
          showId: show.id,
          seatIds,
          seats: selectedSeats.map((seat) => ({
            section: seat.section,
            row: seat.row,
            number: seat.number,
          })),
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

  const getSeatColor = (seat: Seat) => {
    const seatKey = getSeatKey(seat)
    const isSelected = selectedSeats.some((s) => getSeatKey(s) === seatKey)
    const status = normalizeStatus(seat)

    if (isSelected) return "bg-primary text-primary-foreground"
    if (status === "blocked") return "bg-muted text-muted-foreground cursor-not-allowed"
    if (status === "sold") return "bg-slate-500/20 text-slate-700 cursor-not-allowed"
    if (status === "reserved") return "bg-yellow-500/40 text-yellow-900 border border-yellow-500/70 cursor-not-allowed"
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
                  <div className="w-6 h-6 rounded bg-yellow-500/40 border border-yellow-500/70" />
                  <span className="text-sm">Reservert</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-slate-500/20" />
                  <span className="text-sm">Solgt / blokkert</span>
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
                                  const status = normalizeStatus(seat)
                                  return (
                                    <button
                                      key={seatKey}
                                      onClick={() => toggleSeat(seat)}
                                      disabled={status !== "available"}
                                      className={`w-5 h-5 rounded text-xs font-medium transition-colors flex items-center justify-center relative flex-shrink-0 ${getSeatColor(seat)}`}
                                      aria-label={`Rad ${seat.row}, Sete ${seat.number}, ${
                                        status === "reserved" ? "Reservert" : status === "sold" ? "Solgt" : "Ledig"
                                      }, ${isEarlyBird 
                                        ? `${formatPrice(getActualSeatPrice(seat))} (Early Bird - spar ${formatPrice(earlyBirdDiscount)}!)` 
                                        : formatPrice(show.base_price_nok || seat.price_nok || 0)
                                      }`}
                                      title={seat.blocked_reason || undefined}
                                    >
                                      {seat.number}
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
            <CardContent className="space-y-4">
              {isEarlyBird && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-semibold text-green-800">Early Bird Tilbud!</span>
                  </div>
                  <p className="text-sm text-green-700">Spar {formatPrice(earlyBirdDiscount)} per billett ved å bestille tidlig.</p>
                </div>
              )}
              
              {selectedSeats.length > 0 ? (
                <div className="space-y-2">
                  {selectedSeats.map((seat) => {
                    const originalSeatPrice = seat.price_nok || show.base_price_nok || 0
                    const actualSeatPrice = getActualSeatPrice(seat)
                    
                    return (
                      <div key={seat.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span>
                          {seat.section}, Rad {seat.row}, Sete {seat.number}
                        </span>
                        <div className="text-right">
                          {isEarlyBird ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground line-through">{formatPrice(originalSeatPrice)}</span>
                                <span className="font-medium text-green-600">{formatPrice(actualSeatPrice)}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="font-medium">{formatPrice(actualSeatPrice)}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Totalt</span>
                      <div className="text-right">
                        {isEarlyBird && totalSavings > 0 ? (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground line-through">{formatPrice(originalTotalPrice)}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-primary">{formatPrice(totalPrice)}</span>
                              <span className="text-sm text-green-600 font-normal">(spar {formatPrice(totalSavings)})</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-primary">{formatPrice(totalPrice)}</span>
                        )}
                      </div>
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
