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
import { VisualSeatMap } from "./visual-seat-map"
import type { Seat, SeatStatus, Show } from "@/lib/types"

interface VisualSeatMapViewerProps {
  show: Show
  seats: Seat[]
  isEarlyBird?: boolean
  earlyBirdDiscount?: number
  venueGrid: {
    gridRows: number
    gridCols: number
    grid: any[][]
  }
  seatMapConfig?: any
}

type NormalizedStatus = 'available' | 'selected' | 'reserved' | 'sold' | 'blocked'

export function VisualSeatMapViewer({
  show,
  seats: initialSeats,
  isEarlyBird = false,
  earlyBirdDiscount = 0,
  venueGrid,
  seatMapConfig
}: VisualSeatMapViewerProps) {
  const [seats, setSeats] = useState<Seat[]>(initialSeats)
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  console.log("VisualSeatMapViewer received:", {
    showId: show.id,
    seatsCount: initialSeats.length,
    venueGrid: { rows: venueGrid.gridRows, cols: venueGrid.gridCols },
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

  // Poll for latest seat statuses so reserved/sold seats are reflected live
  useEffect(() => {
    let mounted = true
    let timer: any = null

    const fetchSeats = async () => {
      try {
        const res = await fetch(`/api/seats/list?showId=${show.id}`)
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        if (Array.isArray(data.seats)) setSeats(data.seats)
      } catch (err) {
        // ignore transient errors
      }
    }

    fetchSeats()
    timer = setInterval(fetchSeats, 5000)
    return () => { mounted = false; if (timer) clearInterval(timer) }
  }, [show.id])

  const normalizeStatus = (seat: Seat): SeatStatus => {
    const current = (seat?.status || "available").toString().toLowerCase()
    if (current === "sold") return "sold"
    if (current === "reserved") return "reserved"
    if (current === "blocked") return "blocked"
    return "available"
  }

  // Get statistics
  const stats = useMemo(() => {
    const available = seats.filter(s => normalizeStatus(s) === 'available').length
    const sold = seats.filter(s => normalizeStatus(s) === 'sold').length
    const reserved = seats.filter(s => normalizeStatus(s) === 'reserved').length
    return { available, sold, reserved, total: seats.length }
  }, [seats])

  const handleSeatSelect = useCallback((seatId: string) => {
    setSelectedSeatIds(prev => [...prev, seatId])
    setError(null)
  }, [])

  const handleSeatDeselect = useCallback((seatId: string) => {
    setSelectedSeatIds(prev => prev.filter(id => id !== seatId))
    setError(null)
  }, [])

  const selectedSeats = seats.filter(seat => selectedSeatIds.includes(seat.id))

  const getActualPrice = (seat: Seat) => {
    const basePrice = seat.price_nok || show.base_price_nok || 0
    return isEarlyBird ? Math.max(0, basePrice - earlyBirdDiscount) : basePrice
  }

  const totalPrice = selectedSeats.reduce((sum, seat) => sum + getActualPrice(seat), 0)
  const originalTotalPrice = selectedSeats.reduce((sum, seat) => sum + (seat.price_nok || show.base_price_nok || 0), 0)
  const totalSavings = originalTotalPrice - totalPrice

  const handleProceed = async () => {
    if (selectedSeats.length === 0) {
      setError("Vennligst velg minst ett sete")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const seatIds = selectedSeats.map(seat => seat.id)
      const seatsPayload = selectedSeats.map(seat => ({ id: seat.id, section: seat.section, row: seat.row, number: seat.number }))

      const response = await fetch("/api/seats/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatIds, seats: seatsPayload, showId: show.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Kunne ikke reservere setene")
      }

      // Update local seat state immediately so the booking page shows reserved status
      setSeats(prev => prev.map(s => selectedSeats.some(sel => sel.id === s.id) ? { ...s, status: 'reserved', reserved_until: result.reservedUntil } : s))

      // Store seat ids and positional info so checkout can update the seats table reliably
      sessionStorage.setItem("booking", JSON.stringify({
        showId: show.id,
        seatIds,
        seats: selectedSeats.map(seat => ({
          id: seat.id,
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
              <VisualSeatMap
                venueGrid={venueGrid}
                seats={seats}
                selectedSeatIds={selectedSeatIds}
                onSeatSelect={handleSeatSelect}
                onSeatDeselect={handleSeatDeselect}
                isLoading={isLoading}
                showPrices={true}
                seatMapConfig={seatMapConfig}
              />
            </CardContent>
          </Card>
        </div>

        {/* Booking Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {showTitle}
              </CardTitle>
              {teamName && (
                <Badge variant="secondary" className="w-fit">
                  {teamName}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {show.venue?.name || "Scene"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatDate(show.show_datetime)} kl. {formatTime(show.show_datetime)}
              </div>

              {selectedSeats.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium">Valgte seter:</h4>
                  <div className="space-y-2">
                    {selectedSeats.map(seat => (
                      <div key={seat.id} className="flex justify-between items-center text-sm">
                          <span>
                            Rad {String(seat.row) || '?'} , Sete {Number.isFinite(Number(seat.number)) ? Number(seat.number) : '?'}
                            {seat.section && seat.section !== 'Sal' && ` (${seat.section})`}
                          </span>
                        <span className="font-medium">
                          {formatPrice(getActualPrice(seat))}
                        </span>
                      </div>
                    ))}
                  </div>

                  {totalSavings > 0 && (
                    <div className="flex justify-between items-center text-sm text-green-600">
                      <span>Rabatt (tidlig booking):</span>
                      <span>-{formatPrice(totalSavings)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center font-semibold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleProceed}
                disabled={selectedSeats.length === 0 || isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reserverer...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Fortsett til betaling ({selectedSeats.length} {selectedSeats.length === 1 ? 'sete' : 'seter'})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Statistikk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                  <div className="text-sm text-muted-foreground">Tilgjengelig</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.sold}</div>
                  <div className="text-sm text-muted-foreground">Solgt</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}