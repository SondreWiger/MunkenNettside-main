"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Trash2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// Simple seat types - removed HC features per request
export type SeatType = 'inactive' | 'active' | 'reserved' | 'taken';

export interface SimpleSeat {
  id: string;
  row: string;
  number: number;
  type: SeatType;
  x: number; // grid position
  y: number; // grid position
}

export interface SimpleSeatMap {
  id: string;
  name: string;
  rows: number;
  cols: number;
  seats: SimpleSeat[];
  created_at: string;
  updated_at: string;
}

interface SimpleSeatMapEditorProps {
  initialMap?: SimpleSeatMap;
  onSave: (seatMap: SimpleSeatMap) => void;
  venueId: string;
}

const SEAT_TYPES: { type: SeatType; label: string; color: string; description: string }[] = [
  { type: 'inactive', label: 'Inaktiv', color: 'bg-gray-200 border-gray-300', description: 'Tom plass' },
  { type: 'active', label: 'Aktiv', color: 'bg-green-500 border-green-600 text-white', description: 'Tilgjengelig sete' },
  { type: 'reserved', label: 'Reservert', color: 'bg-yellow-500 border-yellow-600 text-white', description: 'Reservert sete' },
  { type: 'taken', label: 'Opptatt', color: 'bg-gray-200 border-gray-300', description: 'Opptatt sete' },
];

// Seat types available in the editor (excluding reserved/taken which are set by checkout)
const EDITOR_SEAT_TYPES = SEAT_TYPES.filter(type => !['reserved', 'taken'].includes(type.type));

// Convert row index to letter (0=A, 1=B, etc.)
const rowIndexToLetter = (index: number): string => {
  return String.fromCharCode(65 + index);
};

export function SimpleSeatMapEditor({ initialMap, onSave, venueId }: SimpleSeatMapEditorProps) {
  const [rows, setRows] = useState(initialMap?.rows || 10);
  const [cols, setCols] = useState(initialMap?.cols || 20);
  const [selectedTool, setSelectedTool] = useState<SeatType>('active');
  const [seats, setSeats] = useState<Map<string, SimpleSeat>>(() => {
    const seatMap = new Map<string, SimpleSeat>();
    if (initialMap?.seats) {
      initialMap.seats.forEach(seat => {
        seatMap.set(`${seat.x}-${seat.y}`, seat);
      });
    }
    return seatMap;
  });

  const getSeat = useCallback((x: number, y: number): SimpleSeat | null => {
    return seats.get(`${x}-${y}`) || null;
  }, [seats]);

  const setSeat = useCallback((x: number, y: number, type: SeatType) => {
    const rowLetter = rowIndexToLetter(y);
    // Calculate seat number (only count active seats in this row)
    let seatNumber = 1;
    for (let col = 0; col <= x; col++) {
      const existingSeat = seats.get(`${col}-${y}`);
      if (col < x && existingSeat && existingSeat.type !== 'inactive') {
        seatNumber++;
      }
    }

    const seatId = `${rowLetter}${seatNumber}`;
    
    setSeats(prev => {
      const newSeats = new Map(prev);
      if (type === 'inactive') {
        newSeats.delete(`${x}-${y}`);
      } else {
        newSeats.set(`${x}-${y}`, {
          id: seatId,
          row: rowLetter,
          number: seatNumber,
          type,
          x,
          y,
        });
      }
      
      // Recalculate seat numbers for the entire row
      for (let col = 0; col < cols; col++) {
        const seat = newSeats.get(`${col}-${y}`);
        if (seat && seat.type !== 'inactive') {
          let newNumber = 1;
          for (let prevCol = 0; prevCol < col; prevCol++) {
            const prevSeat = newSeats.get(`${prevCol}-${y}`);
            if (prevSeat && prevSeat.type !== 'inactive') {
              newNumber++;
            }
          }
          seat.number = newNumber;
          seat.id = `${rowLetter}${newNumber}`;
        }
      }
      
      return newSeats;
    });
  }, [seats, cols]);

  const handleCellClick = useCallback((x: number, y: number) => {
    setSeat(x, y, selectedTool);
  }, [setSeat, selectedTool]);

  const clearAll = useCallback(() => {
    setSeats(new Map());
  }, []);

  const resetGrid = useCallback(() => {
    setRows(10);
    setCols(20);
    setSeats(new Map());
  }, []);

  const handleSave = useCallback(() => {
    const seatArray = Array.from(seats.values());
    const seatMap: SimpleSeatMap = {
      id: initialMap?.id || `venue-${venueId}-${Date.now()}`,
      name: `Setekart for venue ${venueId}`,
      rows,
      cols,
      seats: seatArray,
      created_at: initialMap?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log("Saving seat map:", seatMap);
    onSave(seatMap);
  }, [seats, rows, cols, initialMap, venueId, onSave]);

  // Manual save function
  const handleManualSave = useCallback(() => {
    const seatArray = Array.from(seats.values());
    const seatMap: SimpleSeatMap = {
      id: initialMap?.id || `venue-${venueId}-${Date.now()}`,
      name: `Setekart for venue ${venueId}`,
      rows,
      cols,
      seats: seatArray,
      created_at: initialMap?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    onSave(seatMap);
  }, [seats, rows, cols, initialMap, venueId, onSave]);

  const seatCounts = SEAT_TYPES.reduce((acc, { type }) => {
    acc[type] = Array.from(seats.values()).filter(seat => seat.type === type).length;
    return acc;
  }, {} as Record<SeatType, number>);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label>Rader</Label>
          <Input
            type="number"
            min="1"
            max="30"
            value={rows}
            onChange={(e) => setRows(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
            className="w-20"
          />
        </div>
        <div className="space-y-1">
          <Label>Kolonner</Label>
          <Input
            type="number"
            min="1"
            max="50"
            value={cols}
            onChange={(e) => setCols(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
            className="w-20"
          />
        </div>
        <Button variant="outline" onClick={clearAll} size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Tøm alt
        </Button>
        <Button variant="outline" onClick={resetGrid} size="sm">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Seat Type Tools */}
      <div className="space-y-2">
        <Label>Velg setetype:</Label>
        <div className="flex flex-wrap gap-2">
          {EDITOR_SEAT_TYPES.map(({ type, label, color }) => (
            <Button
              key={type}
              variant={selectedTool === type ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTool(type)}
              className={cn(
                "min-w-[100px]",
                selectedTool === type && "ring-2 ring-offset-2"
              )}
            >
              <div className={cn("w-3 h-3 rounded mr-2", color)} />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Seat Map Grid */}
      <div className="border rounded-lg p-4 bg-gray-50 overflow-auto">
        <div className="mb-4 text-center">
          <div className="inline-block bg-gradient-to-b from-purple-100 to-purple-50 px-8 py-2 rounded-lg border text-sm font-medium text-purple-700">
            SCENE / STAGE
          </div>
        </div>
        
        <div className="inline-block bg-white p-4 rounded border shadow-sm">
          {/* Grid container using CSS Grid for perfect alignment */}
          <div 
            className="grid gap-3"
            style={{
              gridTemplateColumns: `36px repeat(${cols}, 36px)`,
            }}
          >
            {/* Top-left corner */}
            <div className="h-6 flex items-center justify-center text-xs font-medium text-gray-500">
              #
            </div>
            
            {/* Column headers */}
            {Array.from({ length: cols }, (_, i) => (
              <div key={i} className="h-6 flex items-center justify-center text-xs font-medium text-gray-500">
                {i + 1}
              </div>
            ))}

            {/* Seat rows with labels */}
            {Array.from({ length: rows }, (_, rowIndex) => [
              // Row label
              <div key={`row-${rowIndex}`} className="h-9 flex items-center justify-center text-xs font-medium text-gray-500">
                {rowIndexToLetter(rowIndex)}
              </div>,
              // Seats in this row
              ...Array.from({ length: cols }, (_, colIndex) => {
                const seat = getSeat(colIndex, rowIndex);
                let seatType = seat?.type || 'inactive';
                
                // Handle legacy seat types that were removed (hc, hc_reserved)
                // Cast to string to handle legacy data that might have old types
                const seatTypeStr = seatType as string;
                if (seatTypeStr === 'hc' || seatTypeStr === 'hc_reserved') {
                  const newType = seatTypeStr === 'hc_reserved' ? 'reserved' : 'active';
                  seatType = newType as SeatType;
                  // Update the seat in our map to the new type
                  if (seat) {
                    setSeat(colIndex, rowIndex, newType as SeatType);
                  }
                }
                
                const typeConfig = SEAT_TYPES.find(t => t.type === seatType) || SEAT_TYPES[0]; // fallback to first type
                
                return (
                  <button
                    key={`seat-${rowIndex}-${colIndex}`}
                    onClick={() => handleCellClick(colIndex, rowIndex)}
                    className={cn(
                      "h-8 w-8 mx-auto text-xs font-medium border rounded transition-all hover:scale-105",
                      typeConfig.color,
                      "cursor-pointer"
                    )}
                    title={`${rowIndexToLetter(rowIndex)}${seat?.number || '?'} - ${typeConfig.description}`}
                  >
                    {seat?.number || ''}
                  </button>
                );
              })
            ]).flat()}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {SEAT_TYPES.map(({ type, label, color }) => (
          <div key={type} className="text-center p-3 border rounded-lg">
            <div className={cn("w-4 h-4 mx-auto mb-1 rounded", color)} />
            <div className="text-sm font-medium">{label}</div>
            <div className="text-lg font-bold">{seatCounts[type]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}