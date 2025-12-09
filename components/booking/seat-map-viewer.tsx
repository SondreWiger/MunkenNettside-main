"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Users, Calendar, MapPin, Clock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { formatDate, formatTime, formatPrice } from "@/lib/utils/booking"
import type { Seat, SeatStatus, Show } from "@/lib/types"

interface SeatMapViewerProps {
  show: Show
  seats: Seat[]
  isEarlyBird?: boolean
  earlyBirdDiscount?: number
}

type NormalizedStatus = 'available' | 'selected' | 'reserved' | 'sold' | 'blocked'

interface SeatsBySection {
  [section: string]: {
    [row: string]: Seat[]
  }
}

const normalizeStatus = (seat: Seat): SeatStatus => {
  const current = (seat?.status || "available").toString().toLowerCase()
  if (current === "sold") return "sold"
  if (current === "reserved") return "reserved"
  if (current === "blocked") return "blocked"
  return "available"
}

export function SeatMapViewer({ 
  show, 
  seats: initialSeats,
  isEarlyBird = false,
  earlyBirdDiscount = 0
}: SeatMapViewerProps) {
  const [seats, setSeats] = useState<Seat[]>(initialSeats)
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null)
  const router = useRouter()

  console.log("SeatMapViewer received:", {
    showId: show.id,
    seatsCount: initialSeats.length,
    sampleSeats: initialSeats.slice(0, 3)
  });

  const showTitle = show.title || show.ensemble?.title || "Forestilling"
  const teamName = show.team && show.ensemble
    ? show.team === "yellow"
      ? show.ensemble.yellow_team_name
      : show.ensemble.blue_team_name
    : null

  // Update seats from props
  useEffect(() => {
    setSeats(initialSeats)
  }, [initialSeats])

  // Group seats by section and row
  const seatsBySection = useMemo(() => {
    const grouped: SeatsBySection = {}
    
    seats.forEach(seat => {
      const section = seat.section || 'Sal'
      const row = seat.row || 'A'
      
      if (!grouped[section]) grouped[section] = {}
      if (!grouped[section][row]) grouped[section][row] = []
      grouped[section][row].push(seat)
    })

    // Sort seats within each row
    Object.values(grouped).forEach(rows => {
      Object.values(rows).forEach(rowSeats => {
        rowSeats.sort((a, b) => a.number - b.number)
      })
    })

    return grouped
  }, [seats])

  // Get statistics
  const stats = useMemo(() => {
    const available = seats.filter(s => normalizeStatus(s) === 'available').length
    const sold = seats.filter(s => normalizeStatus(s) === 'sold').length
    const reserved = seats.filter(s => normalizeStatus(s) === 'reserved').length
    return { available, sold, reserved, total: seats.length }
  }, [seats])

  const getSeatKey = useCallback((seat: Seat) => `${seat.section}-${seat.row}-${seat.number}`, [])

  const toggleSeat = useCallback((seat: Seat) => {
    if (normalizeStatus(seat) !== "available") return

    const seatKey = getSeatKey(seat)
    setSelectedSeats(prev => {
      const isSelected = prev.some(s => getSeatKey(s) === seatKey)
      if (isSelected) {
        return prev.filter(s => getSeatKey(s) !== seatKey)
      }
      return [...prev, seat]
    })
    setError(null)
  }, [getSeatKey])

  const getActualPrice = (seat: Seat) => {
    const basePrice = seat.price_nok || show.base_price_nok || 0
    return isEarlyBird ? Math.max(0, basePrice - earlyBirdDiscount) : basePrice
  }

  const totalPrice = selectedSeats.reduce((sum, seat) => sum + getActualPrice(seat), 0)
  const originalTotalPrice = selectedSeats.reduce((sum, seat) => sum + (seat.price_nok || show.base_price_nok || 0), 0)
  const totalSavings = originalTotalPrice - totalPrice

  const getSeatStyle = (seat: Seat): { className: string; status: NormalizedStatus } => {
    const seatKey = getSeatKey(seat)
    const isSelected = selectedSeats.some(s => getSeatKey(s) === seatKey)
    const status = normalizeStatus(seat)

    if (isSelected) {
      return { 
        className: "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 scale-110", 
        status: 'selected' 
      }
    }
    if (status === "blocked") {
      return { className: "bg-gray-100 text-gray-300 cursor-not-allowed", status: 'blocked' }
    }
    if (status === "sold") {
      return { className: "bg-slate-200 text-slate-400 cursor-not-allowed", status: 'sold' }
    }
    if (status === "reserved") {
      return { className: "bg-yellow-100 text-yellow-600 border border-yellow-400 cursor-not-allowed", status: 'reserved' }
    }
    return { className: "bg-green-100 text-green-700 hover:bg-green-200 hover:scale-105 cursor-pointer", status: 'available' }
  }

  const handleProceed = async () => {
    if (selectedSeats.length === 0) {
      setError("Vennligst velg minst ett sete")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const seatIds = selectedSeats.map(seat => seat.id)

      const response = await fetch("/api/seats/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatIds, showId: show.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Kunne ikke reservere setene")
      }

      sessionStorage.setItem("booking", JSON.stringify({
        showId: show.id,
        seatIds,
        seats: selectedSeats.map(seat => ({
          section: seat.section,
          row: seat.row,
          number: seat.number,
        })),
        totalPrice,
        reservedUntil: result.reservedUntil,
      }))

      router.push(`/kasse/billett?show=${show.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt")
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-6xl px-4 py-6 md:py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Seat Map */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/50 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Velg seter</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.available} av {stats.total} seter tilgjengelig
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 md:p-6">
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-6 p-3 bg-muted/50 rounded-lg text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-green-100 border border-green-300" />
                  <span>Ledig</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-primary" />
                  <span>Valgt</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-yellow-100 border border-yellow-400" />
                  <span>Reservert</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-slate-200" />
                  <span>Solgt</span>
                </div>
              </div>

              {/* Stage */}
              <div className="mb-6 text-center">
                <div className="inline-block px-16 md:px-24 py-3 bg-gradient-to-b from-purple-100 to-purple-50 text-purple-700 rounded-b-2xl font-semibold tracking-wider text-sm border-b-4 border-purple-200">
                  SCENE
                </div>
              </div>

              {/* Seat Grid */}
              <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                <div className="min-w-max space-y-6">
                  {Object.entries(seatsBySection).map(([sectionName, rows]) => (
                    <div key={sectionName} className="space-y-1">
                      {Object.keys(seatsBySection).length > 1 && (
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-8">
                          {sectionName}
                        </h3>
                      )}
                      
                      {Object.entries(rows)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([rowName, rowSeats]) => (
                          <div 
                            key={rowName} 
                            className="flex items-center gap-1.5 justify-center"
                          >
                            {/* Row label left */}
                            <div className="w-6 flex-shrink-0 text-xs font-medium text-muted-foreground text-right">
                              {rowName}
                            </div>
                            
                            {/* Seats */}
                            <div className="flex gap-0.5 md:gap-1">
                              {rowSeats.map(seat => {
                                const { className, status } = getSeatStyle(seat)
                                const isDisabled = status === 'sold' || status === 'blocked' || status === 'reserved'
                                
                                return (
                                  <button
                                    key={getSeatKey(seat)}
                                    onClick={() => toggleSeat(seat)}
                                    disabled={isDisabled}
                                    onMouseEnter={() => setHoveredSeat(seat)}
                                    onMouseLeave={() => setHoveredSeat(null)}
                                    className={cn(
                                      "w-6 h-6 md:w-7 md:h-7 rounded text-[10px] md:text-xs font-medium transition-all duration-150 flex items-center justify-center",
                                      className
                                    )}
                                    title={`Rad ${seat.row}, Sete ${seat.number} - ${formatPrice(getActualPrice(seat))}`}
                                  >
                                    {seat.number}
                                  </button>
                                )
                              })}
                            </div>

                            {/* Row label right */}
                            <div className="w-6 flex-shrink-0 text-xs font-medium text-muted-foreground text-left">
                              {rowName}
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hovered seat info (mobile) */}
              {hoveredSeat && (
                <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                  <strong>Rad {hoveredSeat.row}, Sete {hoveredSeat.number}</strong> · {formatPrice(getActualPrice(hoveredSeat))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary - Sticky on desktop */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {/* Show Info */}
          <Card>
            <CardContent className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold mb-3">{showTitle}</h2>
              {teamName && (
                <Badge variant="secondary" className="mb-3">{teamName}</Badge>
              )}
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  {formatDate(show.show_datetime)}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  kl. {formatTime(show.show_datetime)}
                </p>
                {show.venue && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    {show.venue.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected Seats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Valgte seter ({selectedSeats.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEarlyBird && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="font-semibold text-green-800 text-sm">Early Bird!</span>
                  </div>
                  <p className="text-xs text-green-700">
                    Spar {formatPrice(earlyBirdDiscount)} per billett
                  </p>
                </div>
              )}

              {selectedSeats.length > 0 ? (
                <div className="space-y-2">
                  {selectedSeats.map(seat => {
                    const originalPrice = seat.price_nok || show.base_price_nok || 0
                    const actualPrice = getActualPrice(seat)
                    
                    return (
                      <div 
                        key={seat.id} 
                        className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm"
                      >
                        <span className="font-medium">
                          {seat.section && Object.keys(seatsBySection).length > 1 && `${seat.section}, `}
                          Rad {seat.row}, Sete {seat.number}
                        </span>
                        <div className="text-right">
                          {isEarlyBird ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPrice(originalPrice)}
                              </span>
                              <span className="text-green-600 font-medium">
                                {formatPrice(actualPrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-medium">{formatPrice(actualPrice)}</span>
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
                          <div>
                            <span className="text-sm text-muted-foreground line-through mr-2">
                              {formatPrice(originalTotalPrice)}
                            </span>
                            <span className="text-primary">{formatPrice(totalPrice)}</span>
                            <p className="text-xs text-green-600 font-normal">
                              Du sparer {formatPrice(totalSavings)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-primary">{formatPrice(totalPrice)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6 text-sm">
                  Klikk på et sete for å velge det
                </p>
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
            className="w-full h-12 md:h-14 text-base md:text-lg"
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

          <p className="text-xs text-muted-foreground text-center">
            Setene reserveres i 10 minutter
          </p>
        </div>
      </div>
    </div>
  )
}
