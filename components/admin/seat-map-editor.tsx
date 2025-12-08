"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CircleCheckBig } from "lucide-react"
import { generateSeats, type SeatMapConfig } from "@/lib/utils/seatMapGenerator"

interface SeatMapEditorProps {
  initialConfig: SeatMapConfig
  onSave: (config: SeatMapConfig) => void
}

export function SeatMapEditor({ initialConfig, onSave }: SeatMapEditorProps) {
  const [config, setConfig] = useState<SeatMapConfig>(initialConfig)
  const [blockedSeats, setBlockedSeats] = useState<Set<string>>(
    new Set((initialConfig.blockedSeats || []).map((s) => `${s[0]},${s[1]}`)),
  )
  const [handicapSeats, setHandicapSeats] = useState<Set<string>>(
    new Set((initialConfig.handicapSeats || []).map((s) => `${s[0]},${s[1]}`)),
  )

  console.log("[v0] SeatMapEditor initialized with config:", {
    rows: initialConfig.rows,
    cols: initialConfig.cols,
    blockedCount: (initialConfig.blockedSeats || []).length,
    handicapCount: (initialConfig.handicapSeats || []).length,
  })

  const seats = generateSeats({
    ...config,
    blockedSeats: Array.from(blockedSeats).map((s) => {
      const [r, c] = s.split(",")
      return [parseInt(r), parseInt(c)]
    }),
    handicapSeats: Array.from(handicapSeats).map((s) => {
      const [r, c] = s.split(",")
      return [parseInt(r), parseInt(c)]
    }),
  })

  const handleRowsChange = useCallback((newRows: number) => {
    setConfig((prev) => ({ ...prev, rows: Math.max(1, newRows) }))
  }, [])

  const handleColsChange = useCallback((newCols: number) => {
    setConfig((prev) => ({ ...prev, cols: Math.max(1, newCols) }))
  }, [])

  const toggleBlockedSeat = useCallback((row: number, col: number) => {
    const key = `${row},${col}`
    console.log("[v0] toggleBlockedSeat:", { row, col, key })
    setBlockedSeats((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        console.log("[v0] Unblocked seat:", key)
      } else {
        next.add(key)
        console.log("[v0] Blocked seat:", key)
      }
      console.log("[v0] Total blocked seats now:", next.size)
      return next
    })
  }, [])

  const toggleHandicapSeat = useCallback((row: number, col: number) => {
    const key = `${row},${col}`
    console.log("[v0] toggleHandicapSeat:", { row, col, key })
    setHandicapSeats((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        console.log("[v0] Removed HC from seat:", key)
      } else {
        next.add(key)
        console.log("[v0] Marked as HC seat:", key)
      }
      console.log("[v0] Total HC seats now:", next.size)
      return next
    })
  }, [])

  const handleSave = useCallback(() => {
    const configToSave: SeatMapConfig = {
      ...config,
      blockedSeats: Array.from(blockedSeats).map((s) => {
        const [r, c] = s.split(",")
        return [parseInt(r), parseInt(c)] as [number, number]
      }),
      handicapSeats: Array.from(handicapSeats).map((s) => {
        const [r, c] = s.split(",")
        return [parseInt(r), parseInt(c)] as [number, number]
      }),
    }
    console.log("[v0] SeatMapEditor saving config:", {
      rows: configToSave.rows,
      cols: configToSave.cols,
      blockedSeats: configToSave.blockedSeats,
      handicapSeats: configToSave.handicapSeats,
    })
    onSave(configToSave)
  }, [config, blockedSeats, handicapSeats, onSave])

  const totalSeats = config.rows * config.cols
  const activeSeats = seats.filter((s) => !s.isBlocked).length
  const handicapCount = handicapSeats.size

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sete kart redigering</CardTitle>
          <CardDescription>Konfigurer siteplassene ved å velge dimensjoner og markere blokkerte eller HC-seter</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Grid Size Controls */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rows-input">Antall rader</Label>
              <Input
                id="rows-input"
                type="number"
                min={1}
                max={30}
                value={config.rows}
                onChange={(e) => handleRowsChange(Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cols-input">Seter per rad</Label>
              <Input
                id="cols-input"
                type="number"
                min={1}
                max={30}
                value={config.cols}
                onChange={(e) => handleColsChange(Number(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-3 md:grid-cols-3 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Totale seter</p>
              <p className="text-2xl font-bold">{totalSeats}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aktive seter</p>
              <p className="text-2xl font-bold text-green-600">{activeSeats}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">HC seter</p>
              <p className="text-2xl font-bold text-blue-600">{handicapCount}</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium text-blue-900">Instruksjoner:</p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Klikk på et sete for å blokkere det (gjør det utilgjengelig)</li>
              <li>Høyreklikk eller Shift+Klikk for å markere som HC-tilgjengelig</li>
              <li>Grønne seter er tilgjengelige, røde er blokkerte, blå er HC</li>
            </ul>
          </div>

          {/* Seat Grid */}
          <div className="overflow-x-auto border rounded-lg p-4 bg-gray-50 w-full">
            <div className="space-y-2 flex flex-col min-w-max">
              {Array.from({ length: config.rows }).map((_, rowIdx) => (
                <div key={rowIdx} className="flex gap-2 items-center">
                  <span className="w-8 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                    {String.fromCharCode(65 + rowIdx)}
                  </span>
                  <div className="flex gap-2">
                    {Array.from({ length: config.cols }).map((_, colIdx) => {
                      const key = `${rowIdx},${colIdx}`
                      const isBlocked = blockedSeats.has(key)
                      const isHandicap = handicapSeats.has(key)

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleBlockedSeat(rowIdx, colIdx)}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            toggleHandicapSeat(rowIdx, colIdx)
                          }}
                          className={`
                            w-10 h-10 rounded border-2 transition-all flex-shrink-0
                            flex items-center justify-center text-xs font-semibold
                            ${
                              isHandicap
                                ? "bg-blue-200 border-blue-400 text-blue-900 hover:bg-blue-300"
                                : isBlocked
                                  ? "bg-red-200 border-red-400 text-red-900 hover:bg-red-300"
                                  : "bg-green-200 border-green-400 text-green-900 hover:bg-green-300"
                            }
                          `}
                          title={
                            isHandicap
                              ? `HC-sete (høyreklikk for å fjerne)`
                              : isBlocked
                                ? `Blokkert sete (klikk for å aktivere)`
                                : `Aktivt sete (klikk for å blokkere)`
                          }
                        >
                          {isHandicap && <CircleCheckBig className="h-4 w-4" />}
                          {!isHandicap && !isBlocked && <span>{colIdx + 1}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-200 border-2 border-green-400 rounded" />
              <span>Aktivt sete</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-200 border-2 border-red-400 rounded" />
              <span>Blokkert sete</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-200 border-2 border-blue-400 rounded flex items-center justify-center">
                <CircleCheckBig className="h-3 w-3" />
              </div>
              <span>HC-sete</span>
            </div>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} className="w-full">
            Lagre sete kart
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
