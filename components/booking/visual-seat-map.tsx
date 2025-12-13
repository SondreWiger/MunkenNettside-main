"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Armchair, User, X, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type CellType = 'empty' | 'seat' | 'aisle' | 'stage' | 'wall'

interface GridCell {
  type: CellType
  row?: string
  number?: number
}

interface Seat {
  id: string
  section: string
  row: string
  number: number
  price_nok: number
  status: 'available' | 'reserved' | 'sold' | 'blocked'
  is_handicap_accessible?: boolean
  reserved_until?: string
}

interface VisualSeatMapProps {
  venueGrid: {
    gridRows: number
    gridCols: number
    grid: GridCell[][]
  }
  seats: Seat[]
  selectedSeatIds: string[]
  onSeatSelect: (seatId: string) => void
  onSeatDeselect: (seatId: string) => void
  isLoading?: boolean
  showPrices?: boolean
  seatMapConfig?: any
}

export function VisualSeatMap({
  venueGrid,
  seats,
  selectedSeatIds,
  onSeatSelect,
  onSeatDeselect,
  isLoading = false,
  showPrices = true
  ,seatMapConfig
}: VisualSeatMapProps) {
  const [hoveredCell, setHoveredCell] = useState<{row: number, col: number} | null>(null)

  // Detect freeform seat positions from seatMapConfig
  const isFreeform = !!(seatMapConfig && Array.isArray(seatMapConfig.seats) && seatMapConfig.seats.some((s: any) => typeof s.x === 'number' && typeof s.y === 'number'))

  // Create a map of seat positions to seat data
  const seatMap = useCallback(() => {
    const map: Record<string, Seat> = {}
    seats.forEach(seat => {
      const key = `${seat.row}-${seat.number}`
      map[key] = seat
    })
    return map
  }, [seats])

  const seatsByPosition = seatMap()

  // Compute display row mapping so that "Rad 1" is the bottom-most row and
  // only rows that contain seats are counted (skip aisles/walkways).
  const rowDisplayMap = useMemo(() => {
    const map: any = {}

    if (isFreeform) {
      const groups: any = {}
      ;(seatMapConfig.seats || []).forEach((s: any, idx: number) => {
        const rowKey = String(s.row || s.row_label || s.r || '')
        if (!groups[rowKey]) groups[rowKey] = { totalY: 0, count: 0, firstIdx: idx }
        const y = (typeof s.y === 'number' && s.y <= 1) ? s.y * 100 : (typeof s.y === 'number' ? s.y : 0)
        groups[rowKey].totalY += y
        groups[rowKey].count += 1
      })

      const rows = Object.keys(groups)
        .map(k => ({ key: k, avgY: groups[k].count ? groups[k].totalY / groups[k].count : 0, idx: groups[k].firstIdx }))
        .sort((a, b) => {
          if (b.avgY !== a.avgY) return b.avgY - a.avgY
          return a.idx - b.idx
        })

      rows.forEach((r, i) => { map[r.key] = i + 1 })
      return map
    }

    const rowsBottomUp: string[] = []
    for (let r = venueGrid.grid.length - 1; r >= 0; r--) {
      const row = venueGrid.grid[r]
      if (!row) continue
      if (!row.some(cell => cell.type === 'seat')) continue
      const cellWithRow = row.find(c => c.row != null)
      const label = cellWithRow ? String(cellWithRow.row) : String(r + 1)
      if (!rowsBottomUp.includes(label)) rowsBottomUp.push(label)
    }

    rowsBottomUp.forEach((label, idx) => { map[label] = idx + 1 })
    return map
  }, [isFreeform, seatMapConfig, venueGrid.grid])

  const getDisplayRowLabel = (rowLabel: string | number | undefined) => {
    const key = rowLabel == null ? '' : String(rowLabel)
    return rowDisplayMap[key] || key
  }

  const handleCellClick = (rowIdx: number, colIdx: number) => {
    const cell = venueGrid.grid[rowIdx]?.[colIdx]
    if (!cell || cell.type !== 'seat') return

    const seatKey = `${cell.row || (rowIdx + 1)}-${cell.number || (colIdx + 1)}`
    const seat = seatsByPosition[seatKey]

    if (!seat) return

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

  const getCellContent = (cell: GridCell, rowIdx: number, colIdx: number) => {
    if (cell.type === 'seat') {
      const seatKey = `${cell.row || (rowIdx + 1)}-${cell.number || (colIdx + 1)}`
      const seat = seatsByPosition[seatKey]
      if (!seat) return null;

      const isSelected = selectedSeatIds.includes(seat.id)
      let seatClass = "w-full h-full rounded flex items-center justify-center text-xs font-medium cursor-pointer transition-all "

      if (isSelected) {
        seatClass += "bg-primary text-primary-foreground border-2 border-primary-foreground"
      } else {
        switch (seat.status) {
          case 'available':
            seatClass += "bg-green-100 text-green-800 border border-green-300 hover:bg-green-200"
            break
          case 'reserved':
            if (seat.reserved_until && new Date(seat.reserved_until) > new Date()) {
              seatClass += "bg-yellow-100 text-yellow-800 border border-yellow-300"
            } else {
              seatClass += "bg-green-100 text-green-800 border border-green-300 hover:bg-green-200"
            }
            break
          case 'sold':
            seatClass += "bg-red-100 text-red-800 border border-red-300 cursor-not-allowed"
            break
          case 'blocked':
            seatClass += "bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed"
            break
          default:
            seatClass += "bg-gray-100 text-gray-500 border border-gray-300"
        }
      }

      // Normalize display values to avoid NaN or non-printable chars
      const displayRow = String(seat.row || '')
      const displayNumber = Number.isFinite(Number(seat.number)) ? Number(seat.number) : ''

      return (
        <div
          className={seatClass}
          onClick={() => handleCellClick(rowIdx, colIdx)}
          onMouseEnter={() => setHoveredCell({row: rowIdx, col: colIdx})}
          onMouseLeave={() => setHoveredCell(null)}
          title={`Rad ${getDisplayRowLabel(seat.row)} Sete ${seat.number} - ${seat.price_nok} NOK`}
        >
          {displayNumber}
        </div>
      )
    }
    return null
  }

  const getCellStyle = (cell: GridCell) => {
    switch (cell.type) {
      case 'aisle':
        return 'bg-gray-200'
      case 'stage':
        return 'bg-purple-500'
      case 'wall':
        return 'bg-gray-800'
      case 'empty':
      default:
        return 'bg-white border border-gray-100'
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

  if (!isFreeform && (!venueGrid.grid || venueGrid.grid.length === 0)) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Armchair className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Ingen setekart tilgjengelig</p>
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

      {/* Visual Seat Map */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Velg seter</CardTitle>
          <CardDescription>
            Klikk på et sete for å velge det. Grønne seter er tilgjengelige.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isFreeform ? (
            <div className="w-full overflow-auto">
              <div className="relative bg-gray-50 rounded-lg border p-4" style={{ minHeight: 400 }}>
                {/* Freeform container - seats positioned by x/y (percent) from seatMapConfig */}
                {seatMapConfig.seats.map((sc: any, idx: number) => {
                  // normalize x/y to percentages
                  let x = sc.x
                  let y = sc.y
                  if (x <= 1) x = x * 100
                  if (y <= 1) y = y * 100

                  // Try to find matching seat record by row/number
                  const key = `${sc.row || sc.r || (sc.row_label) || ''}-${sc.number || sc.num || sc.n || ''}`
                  // fallback: try numeric mapping
                  const seatRecord = seats.find(s => (s.row === String(sc.row) || s.row === String(sc.row_label) || s.row === sc.r) && Number(s.number) === Number(sc.number))

                  const isSelected = seatRecord ? selectedSeatIds.includes(seatRecord.id) : false

                  // build class based on status if seatRecord exists
                  let seatClass = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                  if (!seatRecord) {
                    seatClass += " bg-gray-100 text-gray-500 border border-gray-300"
                  } else if (isSelected) {
                    seatClass += " bg-primary text-primary-foreground ring-2 ring-primary"
                  } else {
                    switch (seatRecord.status) {
                      case 'available':
                        seatClass += " bg-green-100 text-green-800 border border-green-300 hover:bg-green-200"
                        break
                      case 'reserved':
                        if (seatRecord.reserved_until && new Date(seatRecord.reserved_until) > new Date()) {
                          seatClass += " bg-yellow-100 text-yellow-800 border border-yellow-300"
                        } else {
                          seatClass += " bg-green-100 text-green-800 border border-green-300 hover:bg-green-200"
                        }
                        break
                      case 'sold':
                        seatClass += " bg-red-100 text-red-800 border border-red-300 cursor-not-allowed"
                        break
                      case 'blocked':
                        seatClass += " bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed"
                        break
                      default:
                        seatClass += " bg-gray-100 text-gray-500 border border-gray-300"
                    }
                  }

                  return (
                    <div
                      key={`free-${idx}`}
                      className={seatClass}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      onClick={() => {
                        if (!seatRecord) return
                        if (seatRecord.status === 'sold' || seatRecord.status === 'blocked') {
                          toast.error('Dette setet er ikke tilgjengelig')
                          return
                        }
                        if (seatRecord.status === 'reserved' && seatRecord.reserved_until && new Date(seatRecord.reserved_until) > new Date()) {
                          if (!selectedSeatIds.includes(seatRecord.id)) {
                            toast.error('Dette setet er midlertidig reservert')
                            return
                          }
                        }
                        if (selectedSeatIds.includes(seatRecord.id)) onSeatDeselect(seatRecord.id)
                        else onSeatSelect(seatRecord.id)
                      }}
                      title={seatRecord ? `Rad ${getDisplayRowLabel(seatRecord.row)} Sete ${seatRecord.number} - ${seatRecord.price_nok} NOK` : (sc.label || sc.row + '-' + sc.number)}
                    >
                      {sc.label || sc.number || (seatRecord ? seatRecord.number : '')}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="flex justify-center min-w-max">
                <div
                  className="inline-grid gap-1 p-4 bg-gray-50 rounded-lg border"
                  style={{
                    gridTemplateColumns: `repeat(${venueGrid.gridCols}, 2rem)`,
                    gridTemplateRows: `repeat(${venueGrid.gridRows}, 2rem)`
                  }}
                >
                  {venueGrid.grid.map((row, rowIdx) =>
                    row.map((cell, colIdx) => (
                      <div
                        key={`${rowIdx}-${colIdx}`}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-sm",
                          getCellStyle(cell)
                        )}
                      >
                        {cell.type === 'seat' ? getCellContent(cell, rowIdx, colIdx) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>Ledig</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary border border-primary-foreground rounded"></div>
              <span>Valgt</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span>Solgt</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>Reservert</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <span>Gang</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span>Scene</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-800 rounded"></div>
              <span>Vegg</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}