"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Armchair, Grid3x3, Save, Trash2, Eye, Download, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type CellType = 'empty' | 'seat' | 'aisle' | 'stage' | 'wall'

interface GridCell {
  type: CellType
  row?: string
  number?: number
}

interface VisualSeatMapEditorProps {
  venueId: string
  initialConfig?: any
  onSave?: (config: any) => void
}

export function VisualSeatMapEditor({ venueId, initialConfig, onSave }: VisualSeatMapEditorProps) {
  const [gridRows, setGridRows] = useState(20)
  const [gridCols, setGridCols] = useState(25)
  const [grid, setGrid] = useState<GridCell[][]>([])
  const [selectedTool, setSelectedTool] = useState<CellType>('seat')
  const [isDrawing, setIsDrawing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize grid on mount or when initialConfig changes
  useEffect(() => {
    if (initialConfig?.seats && Array.isArray(initialConfig.seats)) {
      // Load existing config
      loadFromConfig(initialConfig)
    } else {
      // Create empty grid
      const newGrid: GridCell[][] = Array(gridRows).fill(null).map(() => 
        Array(gridCols).fill(null).map(() => ({ type: 'empty' as CellType }))
      )
      setGrid(newGrid)
    }
  }, [])

  // Load config into grid
  const loadFromConfig = (config: any) => {
    if (!config) return

    // Check if we have full grid data (new format)
    if (config.gridData?.grid) {
      setGridRows(config.gridData.rows)
      setGridCols(config.gridData.cols)
      setGrid(config.gridData.grid)
      return
    }

    // Otherwise load from seats only (old format)
    if (!config.seats) return

    // Find grid dimensions needed
    let maxRow = 0
    let maxCol = 0
    config.seats.forEach((seat: any) => {
      const row = parseInt(seat.row) || 0
      const num = seat.number || 0
      if (row > maxRow) maxRow = row
      if (num > maxCol) maxCol = num
    })

    const rows = Math.max(maxRow, 20)
    const cols = Math.max(maxCol, 25)
    
    setGridRows(rows)
    setGridCols(cols)

    // Create grid
    const newGrid: GridCell[][] = Array(rows).fill(null).map(() => 
      Array(cols).fill(null).map(() => ({ type: 'empty' as CellType }))
    )

    // Place seats
    config.seats.forEach((seat: any) => {
      const rowIdx = parseInt(seat.row) - 1
      const colIdx = seat.number - 1
      if (rowIdx >= 0 && rowIdx < rows && colIdx >= 0 && colIdx < cols) {
        newGrid[rowIdx][colIdx] = {
          type: 'seat' as CellType,
          row: String(seat.row),
          number: Number(seat.number)
        }
      }
    })

    setGrid(newGrid)
  }

  // Reset grid
  const resetGrid = () => {
    const newGrid: GridCell[][] = Array(gridRows).fill(null).map(() => 
      Array(gridCols).fill(null).map(() => ({ type: 'empty' as CellType }))
    )
    setGrid(newGrid)
    toast.success(`Grid reset to ${gridRows}×${gridCols}`)
  }

  // Expand grid
  const expandGrid = () => {
    const newRows = gridRows + 5
    const newCols = gridCols + 5
    
    const newGrid: GridCell[][] = Array(newRows).fill(null).map((_, rowIdx) => 
      Array(newCols).fill(null).map((_, colIdx) => {
        if (rowIdx < gridRows && colIdx < gridCols && grid[rowIdx]?.[colIdx]) {
          return { ...grid[rowIdx][colIdx] }
        }
        return { type: 'empty' as CellType }
      })
    )
    
    setGridRows(newRows)
    setGridCols(newCols)
    setGrid(newGrid)
    toast.success(`Grid expanded to ${newRows}×${newCols}`)
  }

  // Apply new dimensions
  const applyNewDimensions = () => {
    const newGrid: GridCell[][] = Array(gridRows).fill(null).map((_, rowIdx) => 
      Array(gridCols).fill(null).map((_, colIdx) => {
        if (grid[rowIdx]?.[colIdx]) {
          return { ...grid[rowIdx][colIdx] }
        }
        return { type: 'empty' as CellType }
      })
    )
    setGrid(newGrid)
    toast.success(`Grid resized to ${gridRows}×${gridCols}`)
  }

  // Paint cell
  const paintCell = (rowIdx: number, colIdx: number) => {
    setGrid(prev => {
      const newGrid = prev.map(row => row.map(cell => ({ ...cell })))
      if (newGrid[rowIdx]?.[colIdx]) {
        newGrid[rowIdx][colIdx] = { type: selectedTool }
      }
      return newGrid
    })
  }

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent, rowIdx: number, colIdx: number) => {
    e.preventDefault()
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
    let totalSeats = 0
    const newGrid = grid.map((row, rowIdx) => {
      // Count seats in this row first
      const seatsInRow = row.filter(cell => cell.type === 'seat').length
      let rowSeatNum = seatsInRow
      
      return row.map(cell => {
        if (cell.type === 'seat') {
          totalSeats++
          return {
            ...cell,
            row: String(rowIdx + 1),
            number: rowSeatNum--
          }
        }
        return cell
      })
    })
    setGrid(newGrid)
    toast.success(`Numbered ${totalSeats} seats`)
  }

  // Convert to SimpleSeatMap
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
    return { 
      seats,
      gridData: {
        rows: gridRows,
        cols: gridCols,
        grid: grid
      }
    }
  }

  // Save
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const seatMap = convertToSeatMap()
      
      const response = await fetch('/api/admin/update-venue-seatmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId,
          capacity: seatMap.seats.length,
          seatMapConfig: seatMap
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save')
      }
      
      toast.success(`Saved ${seatMap.seats.length} seats!`)
      
      if (onSave) {
        onSave(seatMap)
      }
    } catch (error: any) {
      console.error('Save error:', error)
      toast.error(error.message || 'Failed to save seat map')
    } finally {
      setIsSaving(false)
    }
  }

  // Export
  const handleExport = () => {
    const data = JSON.stringify({ gridRows, gridCols, grid }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `venue-${venueId}-seatmap.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Layout exported!')
  }

  // Import
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

  // Cell style
  const getCellStyle = (cell: GridCell) => {
    switch (cell.type) {
      case 'seat':
        return 'bg-green-500 hover:bg-green-600 text-white'
      case 'aisle':
        return 'bg-gray-200 hover:bg-gray-300'
      case 'stage':
        return 'bg-purple-500 hover:bg-purple-600 text-white'
      case 'wall':
        return 'bg-gray-800 hover:bg-gray-900 text-white'
      default:
        return 'bg-white border border-gray-300 hover:bg-gray-50'
    }
  }

  const totalSeats = grid.flat().filter(c => c.type === 'seat').length

  return (
    <div className="w-full space-y-4" onMouseUp={handleMouseUp}>
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Toolbar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Grid Size */}
          <div className="space-y-3">
            <Label>Grid Size</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={gridRows}
                onChange={(e) => setGridRows(Math.min(50, Math.max(1, Number(e.target.value))))}
                min={1}
                max={50}
                className="w-20"
              />
              <span>×</span>
              <Input
                type="number"
                value={gridCols}
                onChange={(e) => setGridCols(Math.min(50, Math.max(1, Number(e.target.value))))}
                min={1}
                max={50}
                className="w-20"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={applyNewDimensions} variant="outline" size="sm">
                Apply Size
              </Button>
              <Button onClick={expandGrid} variant="outline" size="sm">
                +5 Rows/Cols
              </Button>
            </div>
            <Button onClick={resetGrid} variant="outline" size="sm" className="w-full">
              <Grid3x3 className="mr-2 h-4 w-4" />
              Clear Grid
            </Button>
          </div>

          {/* Tools */}
          <div className="space-y-2">
            <Label>Draw Tool</Label>
            <div className="grid gap-2">
              <Button
                variant={selectedTool === 'seat' ? 'default' : 'outline'}
                onClick={() => setSelectedTool('seat')}
                size="sm"
              >
                <Armchair className="mr-2 h-4 w-4" />
                Seat
              </Button>
              <Button
                variant={selectedTool === 'aisle' ? 'default' : 'outline'}
                onClick={() => setSelectedTool('aisle')}
                size="sm"
              >
                Aisle
              </Button>
              <Button
                variant={selectedTool === 'stage' ? 'default' : 'outline'}
                onClick={() => setSelectedTool('stage')}
                size="sm"
              >
                Stage
              </Button>
              <Button
                variant={selectedTool === 'wall' ? 'default' : 'outline'}
                onClick={() => setSelectedTool('wall')}
                size="sm"
              >
                Wall
              </Button>
              <Button
                variant={selectedTool === 'empty' ? 'default' : 'outline'}
                onClick={() => setSelectedTool('empty')}
                size="sm"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Erase
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button onClick={autoNumberSeats} variant="outline" size="sm" className="w-full">
              Auto-Number
            </Button>
            <Button onClick={() => setShowPreview(!showPreview)} variant="outline" size="sm" className="w-full">
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
          </div>

          {/* Stats */}
          <div className="space-y-2 pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span>Seats:</span>
              <Badge>{totalSeats}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Grid:</span>
              <Badge variant="outline">{gridRows}×{gridCols}</Badge>
            </div>
          </div>

          {/* Save/Export */}
          <div className="space-y-2 pt-3 border-t">
            <Button onClick={handleSave} disabled={isSaving} size="sm" className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                id={`import-${venueId}`}
              />
              <Button asChild variant="outline" size="sm" className="w-full">
                <label htmlFor={`import-${venueId}`} className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </label>
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-4">
          <div className="overflow-auto max-h-[600px] border rounded bg-gray-50 p-4">
            <div className="inline-block select-none">
              {grid.map((row, rowIdx) => (
                <div key={rowIdx} className="flex gap-px">
                  <div className="w-8 flex items-center justify-center text-xs text-gray-500 font-mono">
                    {rowIdx + 1}
                  </div>
                  {row.map((cell, colIdx) => (
                    <div
                      key={colIdx}
                      className={cn(
                        "w-7 h-7 flex items-center justify-center text-[9px] font-bold transition-colors cursor-crosshair",
                        getCellStyle(cell)
                      )}
                      onMouseDown={(e) => handleMouseDown(e, rowIdx, colIdx)}
                      onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                    >
                      {cell.type === 'seat' && cell.number}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-500 rounded" />
              <span>Seat</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-200 rounded" />
              <span>Aisle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-purple-500 rounded" />
              <span>Stage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-800 rounded" />
              <span>Wall</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      {showPreview && totalSeats > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Customer View Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center p-6 bg-gray-50 rounded">
              <div className="space-y-1">
                {grid.map((row, rowIdx) => {
                  const seats = row.filter(c => c.type === 'seat')
                  if (seats.length === 0) return null
                  
                  return (
                    <div key={rowIdx} className="flex items-center gap-2">
                      <div className="w-8 text-xs text-right text-gray-500">{rowIdx + 1}</div>
                      <div className="flex gap-1">
                        {row.map((cell, colIdx) => 
                          cell.type === 'seat' ? (
                            <div
                              key={colIdx}
                              className="w-8 h-8 bg-green-100 border border-green-300 rounded flex items-center justify-center text-xs"
                            >
                              {cell.number}
                            </div>
                          ) : cell.type === 'aisle' ? (
                            <div key={colIdx} className="w-8 h-8" />
                          ) : null
                        )}
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
