// ============================================
// SEAT MAP CONFIGURATION TYPES
// Complete type system for venue seat maps
// ============================================

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

// ============================================
// SEAT TYPES
// ============================================

export type SeatCategory = 'standard' | 'premium' | 'vip' | 'economy' | 'handicap'

export interface SeatElement {
  type: 'seat'
  id: string
  x: number
  y: number
  row: string
  number: number
  section: string
  category: SeatCategory
  isBlocked: boolean
  isHandicap: boolean
  label?: string // Optional custom label
  rotation?: number // Degrees, for angled seats
}

// ============================================
// STRUCTURAL ELEMENTS
// ============================================

export interface WallElement {
  type: 'wall'
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  label?: string
}

export interface WalkwayElement {
  type: 'walkway'
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  label?: string
}

export interface EntranceElement {
  type: 'entrance'
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  label?: string
  entranceType: 'main' | 'emergency' | 'side' | 'backstage'
}

export interface StageElement {
  type: 'stage'
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  label?: string
  shape: 'rectangle' | 'curved' | 'thrust'
}

export interface LabelElement {
  type: 'label'
  id: string
  x: number
  y: number
  text: string
  fontSize?: number
  rotation?: number
}

export interface GapElement {
  type: 'gap'
  id: string
  x: number
  y: number
  width: number
  height: number
}

// ============================================
// SECTION - Groups seats together
// ============================================

export interface SectionConfig {
  id: string
  name: string
  color: string // For visual distinction
  priceMultiplier: number // 1.0 = base price, 1.5 = 50% more
}

// ============================================
// UNION TYPE FOR ALL ELEMENTS
// ============================================

export type MapElement = 
  | SeatElement 
  | WallElement 
  | WalkwayElement 
  | EntranceElement 
  | StageElement 
  | LabelElement
  | GapElement

export type GridCellType = 'empty' | 'seat' | 'handicap'

export interface GridCellConfig {
  type: GridCellType
  section?: string
  row?: string
  number?: number
}

// ============================================
// COMPLETE SEAT MAP CONFIG
// ============================================

export interface SeatMapConfig {
  version: 3
  
  // Canvas settings
  canvasWidth: number
  canvasHeight: number
  gridSize: number // Snap-to-grid size in pixels
  
  // All elements on the map
  elements: MapElement[]
  
  // Section definitions
  sections: SectionConfig[]
  
  // Default seat size
  seatSize: number
  
  // Metadata
  notes?: string
  lastModified?: string

  // Simple grid support
  gridRows?: number
  gridCols?: number
  cells?: GridCellConfig[][]
}

// ============================================
// EDITOR STATE TYPES
// ============================================

export type EditorTool = 
  | 'select'
  | 'pan'
  | 'seat'
  | 'seat-row'
  | 'seat-grid'
  | 'wall'
  | 'walkway'
  | 'entrance'
  | 'stage'
  | 'label'
  | 'gap'
  | 'eraser'

export interface EditorState {
  tool: EditorTool
  selectedIds: string[]
  zoom: number
  panOffset: Point
  isDragging: boolean
  isDrawing: boolean
  currentSection: string
  currentCategory: SeatCategory
  showGrid: boolean
  snapToGrid: boolean
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function createDefaultConfig(): SeatMapConfig {
  return {
    version: 3,
    canvasWidth: 1200,
    canvasHeight: 800,
    gridSize: 10,
    seatSize: 28,
    elements: [
      {
        type: 'stage',
        id: 'stage-1',
        x: 100,
        y: 50,
        width: 600,
        height: 80,
        label: 'SCENE',
        shape: 'rectangle'
      }
    ],
    sections: [
      { id: 'main', name: 'Sal', color: '#22C55E', priceMultiplier: 1.0 },
      { id: 'premium', name: 'Premium', color: '#A855F7', priceMultiplier: 1.5 },
      { id: 'balcony', name: 'Balkong', color: '#3B82F6', priceMultiplier: 0.8 },
    ]
  }
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function createSeat(
  x: number, 
  y: number, 
  row: string, 
  number: number, 
  section: string,
  category: SeatCategory = 'standard'
): SeatElement {
  return {
    type: 'seat',
    id: generateId('seat'),
    x,
    y,
    row,
    number,
    section,
    category,
    isBlocked: false,
    isHandicap: category === 'handicap'
  }
}

export function createSeatRow(
  startX: number,
  y: number,
  count: number,
  row: string,
  section: string,
  seatSize: number,
  gap: number = 4,
  startNumber: number = 1,
  category: SeatCategory = 'standard'
): SeatElement[] {
  const seats: SeatElement[] = []
  for (let i = 0; i < count; i++) {
    seats.push(createSeat(
      startX + i * (seatSize + gap),
      y,
      row,
      startNumber + i,
      section,
      category
    ))
  }
  return seats
}

export function createSeatGrid(
  startX: number,
  startY: number,
  cols: number,
  rows: number,
  section: string,
  seatSize: number,
  colGap: number = 4,
  rowGap: number = 8,
  startRow: string = 'A',
  category: SeatCategory = 'standard'
): SeatElement[] {
  const seats: SeatElement[] = []
  for (let r = 0; r < rows; r++) {
    const rowLabel = String.fromCharCode(startRow.charCodeAt(0) + r)
    for (let c = 0; c < cols; c++) {
      seats.push(createSeat(
        startX + c * (seatSize + colGap),
        startY + r * (seatSize + rowGap),
        rowLabel,
        c + 1,
        section,
        category
      ))
    }
  }
  return seats
}

export function createWall(x: number, y: number, width: number, height: number): WallElement {
  return {
    type: 'wall',
    id: generateId('wall'),
    x,
    y,
    width,
    height
  }
}

export function createWalkway(x: number, y: number, width: number, height: number, label?: string): WalkwayElement {
  return {
    type: 'walkway',
    id: generateId('walkway'),
    x,
    y,
    width,
    height,
    label
  }
}

export function createEntrance(
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  entranceType: EntranceElement['entranceType'] = 'main'
): EntranceElement {
  return {
    type: 'entrance',
    id: generateId('entrance'),
    x,
    y,
    width,
    height,
    entranceType,
    label: entranceType === 'main' ? 'Inngang' : 
           entranceType === 'emergency' ? 'Nødutgang' :
           entranceType === 'side' ? 'Sideinngang' : 'Bakscene'
  }
}

export function createGap(x: number, y: number, width: number, height: number): GapElement {
  return {
    type: 'gap',
    id: generateId('gap'),
    x,
    y,
    width,
    height
  }
}

export function createLabel(x: number, y: number, text: string, fontSize: number = 14): LabelElement {
  return {
    type: 'label',
    id: generateId('label'),
    x,
    y,
    text,
    fontSize
  }
}

// Get bounds of all elements
export function getMapBounds(elements: MapElement[]): Bounds {
  if (elements.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600 }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  elements.forEach(el => {
    const x = el.x
    const y = el.y
    const width = 'width' in el ? el.width : 28
    const height = 'height' in el ? el.height : 28

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)
  })

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

// Count seats by status
export function countSeats(elements: MapElement[]): { total: number; blocked: number; handicap: number } {
  const seats = elements.filter((el): el is SeatElement => el.type === 'seat')
  return {
    total: seats.length,
    blocked: seats.filter(s => s.isBlocked).length,
    handicap: seats.filter(s => s.isHandicap).length
  }
}

// Get all unique sections from seats
export function getSections(elements: MapElement[]): string[] {
  const sections = new Set<string>()
  elements.forEach(el => {
    if (el.type === 'seat') {
      sections.add(el.section)
    }
  })
  return Array.from(sections)
}

// Get all unique rows from seats
export function getRows(elements: MapElement[]): string[] {
  const rows = new Set<string>()
  elements.forEach(el => {
    if (el.type === 'seat') {
      rows.add(el.row)
    }
  })
  return Array.from(rows).sort()
}
