"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Loader2, CheckCircle, AlertCircle, Armchair, Calendar, Clock, 
  MapPin, Users, ChevronUp, ChevronDown, X, ZoomIn, ZoomOut, RotateCcw
} from "lucide-react"
import { toast } from "sonner"
import { formatPrice } from "@/lib/utils/booking"
import { cn } from "@/lib/utils"

interface Seat {
  id: string
  section: string
  row: string
  number: number
  status: 'available' | 'sold' | 'reserved' | 'blocked'
  price_nok?: number
  reserved_until?: string
  x?: number
  y?: number
}

interface Show {
  id: string
  title?: string
  base_price_nok?: number
  team?: 'yellow' | 'blue'
  show_datetime?: string
  ensemble?: {
    title?: string
    yellow_team_name?: string
    blue_team_name?: string
  }
  venue?: {
    name: string
    seat_map_config?: any
  }
}

interface VenueGrid {
  gridRows: number
  gridCols: number
  grid: Array<Array<{ type: string; row?: string; number?: number }>>
}

interface UnifiedSeatBookingProps {
  show: Show
  seats: Seat[]
  isEarlyBird?: boolean
  earlyBirdDiscount?: number
  mode?: 'grid' | 'visual'
  venueGrid?: VenueGrid
  seatMapConfig?: any
}

// Format helpers
const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('nb-NO', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  })
}

const formatTime = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('nb-NO', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

export function UnifiedSeatBooking({
  show,
  seats: initialSeats,
  isEarlyBird = false,
  earlyBirdDiscount = 0,
  mode = 'visual',
  venueGrid,
  seatMapConfig
}: UnifiedSeatBookingProps) {
  const [seats, setSeats] = useState<Seat[]>(initialSeats)
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMobileSummary, setShowMobileSummary] = useState(false)
  const [zoom, setZoom] = useState(1)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

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

  // Group seats by row for simple display
  const seatsByRow = useMemo(() => {
    const grouped: Record<string, Seat[]> = {}
    seats.forEach(seat => {
      const row = seat.row || 'A'
      if (!grouped[row]) grouped[row] = []
      grouped[row].push(seat)
    })
    // Sort seats within each row
    Object.values(grouped).forEach(rowSeats => {
      rowSeats.sort((a, b) => a.number - b.number)
    })
    return grouped
  }, [seats])

  const sortedRows = useMemo(() => Object.keys(seatsByRow).sort(), [seatsByRow])

  // Get seat key for consistent identification
  const getSeatKey = useCallback((seat: Seat) => {
    return `${seat.section}-${seat.row}-${seat.number}`
  }, [])

  // Toggle seat selection
  const toggleSeat = useCallback((seat: Seat) => {
    if (seat.status === 'sold' || seat.status === 'blocked' || seat.status === 'reserved') {
      return
    }

    const seatKey = getSeatKey(seat)
    const isSelected = selectedSeats.some(s => getSeatKey(s) === seatKey)

    setSelectedSeats(prev => {
      if (isSelected) {
        return prev.filter(s => getSeatKey(s) !== seatKey)
      }
      return [...prev, seat]
    })
    setError(null)
  }, [selectedSeats, getSeatKey])

  // Calculate pricing
  const getActualPrice = (seat: Seat) => {
    const basePrice = seat.price_nok || show.base_price_nok || 0
    return isEarlyBird ? Math.max(0, basePrice - earlyBirdDiscount) : basePrice
  }

  const totalPrice = selectedSeats.reduce((sum, seat) => sum + getActualPrice(seat), 0)
  const totalSavings = isEarlyBird ? selectedSeats.length * earlyBirdDiscount : 0

  // Get seat statistics
  const stats = useMemo(() => {
    const available = seats.filter(s => s.status === 'available').length
    const total = seats.length
    return { available, total }
  }, [seats])

  // Handle proceed to checkout
  const handleProceed = async () => {
    if (selectedSeats.length === 0) {
      setError("Vennligst velg minst ett sete")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const seatIds = selectedSeats.map(seat => seat.id)
      const seatsPayload = selectedSeats.map(seat => ({
        id: seat.id,
        section: seat.section,
        row: seat.row,
        number: seat.number,
      }))

      const response = await fetch("/api/seats/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatIds, seats: seatsPayload, showId: show.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Kunne ikke reservere setene")
      }

      // Store booking data
      sessionStorage.setItem("booking", JSON.stringify({
        showId: show.id,
        seatIds,
        seats: seatsPayload,
        totalPrice,
        reservedUntil: result.reservedUntil,
      }))

      router.push(`/kasse/billett?show=${show.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt")
      setIsLoading(false)
    }
  }

  // Get seat visual style
  const getSeatStyle = (seat: Seat) => {
    const isSelected = selectedSeats.some(s => getSeatKey(s) === getSeatKey(seat))
    
    if (isSelected) {
      return "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/50 scale-110 z-10"
    }
    switch (seat.status) {
      case 'sold':
      case 'blocked':
        return "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
      case 'reserved':
        return "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-2 border-amber-400 cursor-not-allowed"
      default:
        return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 hover:scale-105 cursor-pointer active:scale-95"
    }
  }

  // Check if seat is disabled
  const isSeatDisabled = (seat: Seat) => {
    return seat.status === 'sold' || seat.status === 'blocked' || seat.status === 'reserved'
  }

  // Render the seat map
  const renderSeatMap = () => {
    // Check for grid-based seat map config
    const hasGridData = seatMapConfig?.gridData?.grid && Array.isArray(seatMapConfig.gridData.grid)
    
    if (hasGridData) {
      const { grid } = seatMapConfig.gridData
      
      return (
        <div className="inline-block min-w-full">
          {grid.map((gridRow: any[], rowIndex: number) => (
            <div key={rowIndex} className="flex gap-1 mb-1 justify-center">
              {gridRow.map((cell: any, colIndex: number) => {
                if (cell.type === 'empty' || !cell.type) {
                  return <div key={colIndex} className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0" />
                }
                
                if (cell.type === 'aisle') {
                  return <div key={colIndex} className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0" />
                }
                
                if (cell.type === 'wall') {
                  return <div key={colIndex} className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-400 dark:bg-slate-600 rounded flex-shrink-0" />
                }
                
                if (cell.type === 'stage') {
                  return (
                    <div 
                      key={colIndex} 
                      className="w-8 h-8 sm:w-9 sm:h-9 bg-purple-600 text-white text-xs flex items-center justify-center font-bold rounded flex-shrink-0"
                    >
                      S
                    </div>
                  )
                }
                
                if (cell.type === 'seat') {
                  const seat = seats.find(s => s.row === String(cell.row) && Number(s.number) === Number(cell.number))
                  
                  if (!seat) {
                    return <div key={colIndex} className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-200 dark:bg-slate-700 rounded flex-shrink-0 opacity-30" />
                  }
                  
                  return (
                    <button
                      key={colIndex}
                      onClick={() => toggleSeat(seat)}
                      disabled={isSeatDisabled(seat)}
                      className={cn(
                        "w-8 h-8 sm:w-9 sm:h-9 rounded text-xs font-bold transition-all duration-150 flex items-center justify-center flex-shrink-0 touch-manipulation",
                        getSeatStyle(seat)
                      )}
                    >
                      {seat.number}
                    </button>
                  )
                }
                
                return <div key={colIndex} className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0" />
              })}
            </div>
          ))}
        </div>
      )
    }

    // Fallback to row-based layout
    return (
      <div className="inline-block min-w-full">
        {sortedRows.map(rowName => {
          const rowSeats = seatsByRow[rowName]
          const minNum = Math.min(...rowSeats.map(s => s.number))
          const maxNum = Math.max(...rowSeats.map(s => s.number))
          const seatMap = new Map(rowSeats.map(s => [s.number, s]))
          
          return (
            <div key={rowName} className="flex items-center justify-center gap-1 mb-1.5">
              {/* Row label left */}
              <div className="w-6 sm:w-8 flex-shrink-0 text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 text-right pr-1">
                {rowName}
              </div>
              
              {/* Seats */}
              <div className="flex gap-0.5 sm:gap-1">
                {(() => {
                  const seatsToRender = []
                  for (let num = minNum; num <= maxNum; num++) {
                    const seat = seatMap.get(num)
                    if (seat) {
                      seatsToRender.push(
                        <button
                          key={getSeatKey(seat)}
                          onClick={() => toggleSeat(seat)}
                          disabled={isSeatDisabled(seat)}
                          className={cn(
                            "w-8 h-8 sm:w-9 sm:h-9 rounded text-xs font-bold transition-all duration-150 flex items-center justify-center touch-manipulation",
                            getSeatStyle(seat)
                          )}
                        >
                          {seat.number}
                        </button>
                      )
                    } else {
                      seatsToRender.push(
                        <div key={`gap-${num}`} className="w-8 h-8 sm:w-9 sm:h-9" />
                      )
                    }
                  }
                  return seatsToRender
                })()}
              </div>
              
              {/* Row label right */}
              <div className="w-6 sm:w-8 flex-shrink-0 text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 text-left pl-1">
                {rowName}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (!seats || seats.length === 0) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="text-center">
          <Armchair className="h-16 w-16 mx-auto mb-4 text-slate-300" />
          <h2 className="text-xl font-semibold mb-2">Ingen seter tilgjengelig</h2>
          <p className="text-muted-foreground">Seter har ikke blitt satt opp for denne forestillingen ennå.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sticky Header - Mobile optimized */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold truncate">{showTitle}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground mt-0.5">
                {show.show_datetime && (
                  <>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(show.show_datetime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(show.show_datetime)}
                    </span>
                  </>
                )}
                {show.venue?.name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {show.venue.name}
                  </span>
                )}
              </div>
            </div>
            {teamName && (
              <Badge variant="secondary" className="flex-shrink-0 text-xs">
                {teamName}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:p-6 lg:max-w-7xl lg:mx-auto">
        {/* Seat Map Section */}
        <div className="lg:col-span-2">
          {/* Legend Bar */}
          <div className="px-4 py-2.5 bg-white dark:bg-slate-800 border-b lg:rounded-t-xl lg:border flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700" />
                <span>Ledig</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-primary" />
                <span>Valgt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700" />
                <span>Opptatt</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {stats.available}/{stats.total} ledige
            </div>
          </div>

          {/* Stage Indicator */}
          <div className="bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 pt-4 pb-2 lg:border-x">
            <div className="text-center">
              <div className="inline-block px-10 sm:px-16 py-2 bg-gradient-to-b from-purple-600 to-purple-800 text-white rounded-b-xl font-semibold tracking-wider text-sm shadow-lg">
                SCENE
              </div>
            </div>
          </div>

          {/* Seat Map Container */}
          <div className="relative bg-slate-100 dark:bg-slate-900 lg:border-x">
            {/* Zoom Controls */}
            <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur rounded-lg shadow border p-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setZoom(z => Math.min(z + 0.2, 2))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setZoom(z => Math.max(z - 0.2, 0.6))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              {zoom !== 1 && (
                <>
                  <div className="h-px bg-border" />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setZoom(1)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Scrollable Map */}
            <div 
              ref={mapContainerRef}
              className="overflow-auto min-h-[45vh] max-h-[60vh] lg:min-h-[450px] lg:max-h-none touch-pan-x touch-pan-y"
            >
              <div 
                className="p-4 flex justify-center transition-transform duration-200"
                style={{ 
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  minWidth: zoom > 1 ? `${100 * zoom}%` : '100%'
                }}
              >
                {renderSeatMap()}
              </div>
            </div>

            {/* Zoom indicator */}
            {zoom !== 1 && (
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {Math.round(zoom * 100)}%
              </div>
            )}
          </div>

          {/* Mobile hint */}
          <div className="px-4 py-2 bg-slate-200/50 dark:bg-slate-800 text-center text-xs text-muted-foreground border-t lg:border lg:rounded-b-xl">
            Bruk to fingre for å zoome • Trykk på sete for å velge
          </div>
        </div>

        {/* Desktop Order Summary */}
        <div className="hidden lg:block space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Din bestilling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEarlyBird && (
                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">
                      Early Bird! Spar {formatPrice(earlyBirdDiscount)} per billett
                    </span>
                  </div>
                </div>
              )}

              {selectedSeats.length > 0 ? (
                <div className="space-y-2">
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {selectedSeats.map(seat => (
                      <div 
                        key={seat.id} 
                        className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm group"
                      >
                        <span className="font-medium">
                          Rad {seat.row}, Sete {seat.number}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{formatPrice(getActualPrice(seat))}</span>
                          <button
                            onClick={() => toggleSeat(seat)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-opacity"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Totalt</span>
                      <span className="text-primary">{formatPrice(totalPrice)}</span>
                    </div>
                    {totalSavings > 0 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 text-right mt-1">
                        Du sparer {formatPrice(totalSavings)}!
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Armchair className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Velg seter fra kartet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleProceed}
            disabled={selectedSeats.length === 0 || isLoading}
            size="lg"
            className="w-full h-12 text-base"
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

      {/* Mobile Bottom Sheet */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className={cn(
          "bg-white dark:bg-slate-800 border-t shadow-2xl transition-all duration-300",
          showMobileSummary && "rounded-t-2xl"
        )}>
          {/* Drag handle */}
          <button
            onClick={() => setShowMobileSummary(!showMobileSummary)}
            className="w-full py-2 flex items-center justify-center"
          >
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
          </button>

          {/* Expanded content */}
          {showMobileSummary && selectedSeats.length > 0 && (
            <div className="px-4 pb-2 max-h-[40vh] overflow-y-auto">
              {isEarlyBird && (
                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg p-2.5 mb-3 text-sm">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                    🎉 Early Bird! Spar {formatPrice(totalSavings)} totalt
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                {selectedSeats.map(seat => (
                  <div 
                    key={seat.id} 
                    className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700 rounded text-sm"
                  >
                    <span>Rad {seat.row}, Sete {seat.number}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatPrice(getActualPrice(seat))}</span>
                      <button
                        onClick={() => toggleSeat(seat)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action bar */}
          <div className="px-4 pb-4 pt-1 flex items-center gap-3">
            <button
              onClick={() => setShowMobileSummary(!showMobileSummary)}
              className="flex-1 text-left"
            >
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {selectedSeats.length} {selectedSeats.length === 1 ? 'sete' : 'seter'}
                </span>
                {showMobileSummary ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="text-xl font-bold text-primary">
                {formatPrice(totalPrice)}
              </div>
            </button>
            
            <Button
              onClick={handleProceed}
              disabled={selectedSeats.length === 0 || isLoading}
              size="lg"
              className="h-12 px-6"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Betal
                  <CheckCircle className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="px-4 pb-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </div>

      {/* Spacer for mobile bottom sheet */}
      <div className="lg:hidden h-28" />
    </div>
  )
}
