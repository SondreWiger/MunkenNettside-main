"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Armchair, Grid3x3, Save, Trash2, Undo, Eye, Download, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type CellType = 'empty' | 'seat' | 'aisle' | 'stage' | 'wall'

interface GridCell {
  type: CellType
  row?: string
  number?: number
}

interface SeatMapBuilderProps {
  venue: any
}

export function SeatMapBuilder({ venue }: SeatMapBuilderProps) {
  const [gridRows, setGridRows] = useState(20)
  const [gridCols, setGridCols] = useState(25)
  const [grid, setGrid] = useState<GridCell[][]>(() => 
    Array(20).fill(null).map(() => Array(25).fill(null).map(() => ({ type: 'empty' as CellType })))
  )
  const [selectedTool, setSelectedTool] = useState<CellType>('seat')
  const [isDrawing, setIsDrawing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize grid when dimensions change
  const initializeGrid = useCallback(() => {
    const newGrid = Array(gridRows).fill(null).map(() => 
      Array(gridCols).fill(null).map(() => ({ type: 'empty' as CellType }))
    )
    setGrid(newGrid)
    toast.success(`Grid reset to ${gridRows}×${gridCols}`)
  }, [gridRows, gridCols])

  // Paint cell
  const paintCell = useCallback((rowIdx: number, colIdx: number) => {
    setGrid(prev => {
      const newGrid = prev.map(row => [...row])
      if (newGrid[rowIdx] && newGrid[rowIdx][colIdx]) {
        newGrid[rowIdx][colIdx] = { type: selectedTool }
      }
      return newGrid
    })
  }, [selectedTool])

  // Mouse handlers
  const handleMouseDown = (rowIdx: number, colIdx: number) => {
    setIsDrawing(true)
    paintCell(rowIdx, colIdx)
  }

  const handleMouseEnter = (rowIdx: number, colIdx: number) => {
    if (isDrawing) {
      paintCell(rowIdx, colIdx)
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  // Auto-number seats
  const autoNumberSeats = () => {
    let seatCount = 0
    const newGrid = grid.map((row, rowIdx) => {
      let rowSeatNum = 1
      return row.map(cell => {
        if (cell.type === 'seat') {
          seatCount++
          return {
            ...cell,
            row: String(rowIdx + 1),
            number: rowSeatNum++
          }
        }
        return cell
      })
    })
    setGrid(newGrid)
    toast.success(`Numbered ${seatCount} seats`)
  }

  // Convert grid to SimpleSeatMap format
  const convertToSeatMap = () => {
    const seats: any[] = []
    grid.forEach((row, rowIdx) => {
      row.forEach((cell, colIdx) => {
        if (cell.type === 'seat') {
          seats.push({
            row: cell.row || String(rowIdx + 1),
            number: cell.number || colIdx + 1,
            type: 'available'
          })
        }
      })
    })
    return { seats }
  }

  // Save to database
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const seatMap = convertToSeatMap()
      
      const response = await fetch('/api/admin/update-venue-seatmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: venue.id,
          capacity: seatMap.seats.length,
          seatMapConfig: seatMap,
          gridLayout: { gridRows, gridCols, grid }
        })
      })

      if (!response.ok) throw new Error('Failed to save')
      
      toast.success(`Saved ${seatMap.seats.length} seats!`)
    } catch (error) {
      toast.error('Failed to save seat map')
    } finally {
      setIsSaving(false)
    }
  }

  // Export/Import
  const handleExport = () => {
    const data = JSON.stringify({ gridRows, gridCols, grid }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'seatmap-layout.json'
    a.click()
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        setGridRows(data.gridRows)
        setGridCols(data.gridCols)
        setGrid(data.grid)
        toast.success('Layout imported!')
      } catch (error) {
        toast.error('Invalid file format')
      }
    }
    reader.readAsText(file)
  }

  // Get cell style
  const getCellStyle = (cell: GridCell) => {
    switch (cell.type) {
      case 'seat':
        return 'bg-green-500 hover:bg-green-600 cursor-pointer'
      case 'aisle':
        return 'bg-gray-200 hover:bg-gray-300 cursor-pointer'
      case 'stage':
        return 'bg-purple-500 hover:bg-purple-600 cursor-pointer'
      case 'wall':
        return 'bg-gray-800 hover:bg-gray-900 cursor-pointer'
      case 'empty':
      default:
        return 'bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer'
    }
  }

  const totalSeats = grid.flat().filter(c => c.type === 'seat').length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Seat Map Builder</CardTitle>
          <CardDescription>
            Create your venue layout by drawing on the grid below
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Toolbar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Grid Size */}
            <div className="space-y-4">
              <div>
                <Label>Rows</Label>
                <Input
                  type="number"
                  value={gridRows}
                  onChange={(e) => setGridRows(Number(e.target.value))}
                  min={1}
                  max={50}
                />
              </div>
              <div>
                <Label>Columns</Label>
                <Input
                  type="number"
                  value={gridCols}
                  onChange={(e) => setGridCols(Number(e.target.value))}
                  min={1}
                  max={50}
                />
              </div>
              <Button onClick={initializeGrid} variant="outline" className="w-full">
                <Grid3x3 className="mr-2 h-4 w-4" />
                Reset Grid
              </Button>
            </div>

            {/* Drawing Tools */}
            <div className="space-y-2">
              <Label>Drawing Tool</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={selectedTool === 'seat' ? 'default' : 'outline'}
                  onClick={() => setSelectedTool('seat')}
                  className="w-full"
                >
                  <Armchair className="mr-2 h-4 w-4" />
                  Seat
                </Button>
                <Button
                  variant={selectedTool === 'aisle' ? 'default' : 'outline'}
                  onClick={() => setSelectedTool('aisle')}
                  className="w-full"
                >
                  Aisle
                </Button>
                <Button
                  variant={selectedTool === 'stage' ? 'default' : 'outline'}
                  onClick={() => setSelectedTool('stage')}
                  className="w-full"
                >
                  Stage
                </Button>
                <Button
                  variant={selectedTool === 'wall' ? 'default' : 'outline'}
                  onClick={() => setSelectedTool('wall')}
                  className="w-full"
                >
                  Wall
                </Button>
                <Button
                  variant={selectedTool === 'empty' ? 'default' : 'outline'}
                  onClick={() => setSelectedTool('empty')}
                  className="col-span-2"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eraser
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button onClick={autoNumberSeats} variant="outline" className="w-full">
                Auto-Number Seats
              </Button>
              <Button onClick={() => setShowPreview(!showPreview)} variant="outline" className="w-full">
                <Eye className="mr-2 h-4 w-4" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>

            {/* Stats */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Seats:</span>
                <Badge variant="secondary">{totalSeats}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Grid Size:</span>
                <Badge variant="outline">{gridRows} × {gridCols}</Badge>
              </div>
            </div>

            {/* Save/Export */}
            <div className="space-y-2 pt-4 border-t">
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save to Database'}
              </Button>
              <Button onClick={handleExport} variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export Layout
              </Button>
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  id="import-file"
                />
                <Button asChild variant="outline" className="w-full">
                  <label htmlFor="import-file" className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Import Layout
                  </label>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid Canvas */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Canvas</CardTitle>
            <CardDescription>
              Click and drag to draw. Use the tools on the left to select what to draw.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="overflow-auto max-h-[70vh] border rounded-lg p-4 bg-gray-50"
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div className="inline-block">
                {grid.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex gap-0.5">
                    {/* Row label */}
                    <div className="w-8 flex items-center justify-center text-xs font-medium text-gray-500">
                      {rowIdx + 1}
                    </div>
                    {row.map((cell, colIdx) => (
                      <div
                        key={colIdx}
                        className={cn(
                          "w-6 h-6 flex items-center justify-center text-[8px] font-bold transition-colors",
                          getCellStyle(cell)
                        )}
                        onMouseDown={() => handleMouseDown(rowIdx, colIdx)}
                        onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                        title={cell.type === 'seat' ? `Row ${cell.row}, Seat ${cell.number}` : cell.type}
                      >
                        {cell.type === 'seat' && cell.number}
                      </div>
                    ))}
                  </div>
                ))}
                {/* Column labels */}
                <div className="flex gap-0.5 mt-1">
                  <div className="w-8" />
                  {Array(gridCols).fill(0).map((_, idx) => (
                    <div key={idx} className="w-6 text-center text-xs text-gray-500">
                      {idx + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span className="text-sm">Seat</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <span className="text-sm">Aisle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded" />
                <span className="text-sm">Stage</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-800 rounded" />
                <span className="text-sm">Wall</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border border-gray-300 rounded" />
                <span className="text-sm">Empty</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview - How it will look to customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center p-8 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                {grid.map((row, rowIdx) => {
                  const rowSeats = row.filter(c => c.type === 'seat')
                  if (rowSeats.length === 0) return null
                  
                  return (
                    <div key={rowIdx} className="flex items-center gap-2">
                      <div className="w-8 text-xs text-gray-500 text-right">
                        {rowIdx + 1}
                      </div>
                      <div className="flex gap-1">
                        {row.map((cell, colIdx) => {
                          if (cell.type === 'seat') {
                            return (
                              <div
                                key={colIdx}
                                className="w-7 h-7 bg-green-100 border border-green-300 rounded flex items-center justify-center text-xs hover:bg-green-200 cursor-pointer"
                              >
                                {cell.number}
                              </div>
                            )
                          } else if (cell.type === 'aisle') {
                            return <div key={colIdx} className="w-7 h-7" />
                          }
                          return null
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
