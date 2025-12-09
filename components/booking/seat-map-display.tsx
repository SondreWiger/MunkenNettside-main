"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Armchair, User, X, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Seat {
  id: string
  section: string
  row: string
  number: number
  price_nok: number
  status: 'available' | 'reserved' | 'sold' | 'blocked'
  is_handicap_accessible: boolean
  reserved_until?: string
}

interface SeatSection {
  name: string
  seats: Seat[]
}

interface SeatMapProps {
  showId: string
  seats: Seat[]
  selectedSeatIds: string[]
  onSeatSelect: (seatId: string) => void
  onSeatDeselect: (seatId: string) => void
  isLoading?: boolean
  showPrices?: boolean
}

export function SeatMapDisplay({ 
  showId, 
  seats, 
  selectedSeatIds, 
  onSeatSelect, 
  onSeatDeselect,
  isLoading = false,
  showPrices = true
}: SeatMapProps) {
  const [seatSections, setSeatSections] = useState<SeatSection[]>([])

  useEffect(() => {
    // Group seats by section
    const sections = seats.reduce((acc, seat) => {
      if (!acc[seat.section]) {
        acc[seat.section] = { name: seat.section, seats: [] }
      }
      acc[seat.section].seats.push(seat)
      return acc
    }, {} as Record<string, SeatSection>)

    // Sort seats within each section by row and number
    Object.values(sections).forEach(section => {
      section.seats.sort((a, b) => {
        if (a.row === b.row) {
          return a.number - b.number
        }
        return a.row.localeCompare(b.row)
      })
    })

    setSeatSections(Object.values(sections))
  }, [seats])

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === 'sold' || seat.status === 'blocked') {
      toast.error("Dette setet er ikke tilgjengelig")
      return
    }

    if (seat.status === 'reserved' && seat.reserved_until && new Date(seat.reserved_until) > new Date()) {
      if (!selectedSeatIds.includes(seat.id)) {
        toast.error("Dette setet er midlertidig reservert")
        return
      }
    }

    if (selectedSeatIds.includes(seat.id)) {
      onSeatDeselect(seat.id)
    } else {
      onSeatSelect(seat.id)
    }
  }

  const getSeatIcon = (seat: Seat) => {
    if (seat.is_handicap_accessible) {
      return User
    }
    return Armchair
  }

  const getSeatColor = (seat: Seat) => {
    const isSelected = selectedSeatIds.includes(seat.id)
    
    if (isSelected) {
      return "bg-primary text-primary-foreground border-primary"
    }

    switch (seat.status) {
      case 'available':
        return "bg-green-100 text-green-800 border-green-300 hover:bg-green-200 cursor-pointer"
      case 'reserved':
        if (seat.reserved_until && new Date(seat.reserved_until) > new Date()) {
          return "bg-yellow-100 text-yellow-800 border-yellow-300"
        }
        return "bg-green-100 text-green-800 border-green-300 hover:bg-green-200 cursor-pointer"
      case 'sold':
        return "bg-red-100 text-red-800 border-red-300"
      case 'blocked':
        return "bg-gray-100 text-gray-500 border-gray-300"
      default:
        return "bg-gray-100 text-gray-500 border-gray-300"
    }
  }

  const getSelectedCount = () => selectedSeatIds.length
  const getTotalPrice = () => {
    return seats
      .filter(seat => selectedSeatIds.includes(seat.id))
      .reduce((total, seat) => total + seat.price_nok, 0)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Laster setekart...</span>
        </CardContent>
      </Card>
    )
  }

  if (seatSections.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Armchair className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Ingen seter tilgjengelig</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selection summary */}
      {getSelectedCount() > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {getSelectedCount()} sete{getSelectedCount() > 1 ? 'r' : ''} valgt
                </span>
              </div>
              {showPrices && (
                <Badge variant="secondary" className="text-lg">
                  {getTotalPrice().toLocaleString()} NOK
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seat sections */}
      <div className="space-y-8">
        {seatSections.map((section) => {
          // Group seats by row
          const rowGroups = section.seats.reduce((acc, seat) => {
            if (!acc[seat.row]) {
              acc[seat.row] = []
            }
            acc[seat.row].push(seat)
            return acc
          }, {} as Record<string, Seat[]>)

          return (
            <Card key={section.name}>
              <CardHeader>
                <CardTitle className="text-lg">{section.name}</CardTitle>
                <CardDescription>
                  {section.seats.length} seter totalt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(rowGroups).map(([rowName, rowSeats]) => (
                    <div key={rowName} className="flex items-center gap-3">
                      <div className="w-8 text-center font-medium text-sm">
                        {rowName}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {rowSeats.map((seat) => {
                          const Icon = getSeatIcon(seat)
                          return (
                            <Button
                              key={seat.id}
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-10 w-10 p-0 relative",
                                getSeatColor(seat)
                              )}
                              onClick={() => handleSeatClick(seat)}
                              disabled={
                                seat.status === 'sold' || 
                                seat.status === 'blocked' ||
                                (seat.status === 'reserved' && 
                                 seat.reserved_until !== null &&
                                 seat.reserved_until !== undefined &&
                                 new Date(seat.reserved_until) > new Date() &&
                                 !selectedSeatIds.includes(seat.id))
                              }
                              title={`Sete ${seat.number} - ${seat.status === 'available' ? 'Tilgjengelig' : seat.status === 'sold' ? 'Solgt' : seat.status === 'blocked' ? 'Blokkert' : 'Reservert'}${showPrices ? ` (${seat.price_nok} NOK)` : ''}`}
                            >
                              <Icon className="h-4 w-4" />
                              {selectedSeatIds.includes(seat.id) && (
                                <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                                  <Check className="h-2.5 w-2.5" />
                                </div>
                              )}
                              <span className="sr-only">
                                Sete {seat.number} i rad {seat.row}
                              </span>
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
              <span>Tilgjengelig</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
              <span>Reservert</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
              <span>Solgt</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary border border-primary rounded" />
              <span>Valgt</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}