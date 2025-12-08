/**
 * Seat Map Generator
 * Generates seat arrays from a simple configuration object
 */

export interface SeatMapConfig {
  rows: number
  cols: number
  sections?: Array<{
    name: string
    startRow?: number
    endRow?: number
    startCol?: number
    endCol?: number
  }>
  blockedSeats?: Array<[number, number]> // [row, col] pairs
  handicapSeats?: Array<[number, number]> // [row, col] pairs
}

export interface GeneratedSeat {
  row: number
  col: number
  section: string
  rowLabel: string
  seatNumber: number
  isBlocked: boolean
  isHandicap: boolean
}

/**
 * Generate a seat array from configuration
 * Produces a flat array of all seats that can be rendered or stored
 */
export function generateSeats(config: SeatMapConfig): GeneratedSeat[] {
  const {
    rows,
    cols,
    sections = [],
    blockedSeats = [],
    handicapSeats = [],
  } = config

  const seats: GeneratedSeat[] = []
  const blockedSet = new Set(blockedSeats.map((s) => `${s[0]},${s[1]}`))
  const handicapSet = new Set(handicapSeats.map((s) => `${s[0]},${s[1]}`))

  // Default section if none provided
  const defaultSection = "Sal"

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Find which section this seat belongs to
      let section = defaultSection
      if (sections.length > 0) {
        const matchingSection = sections.find((s) => {
          const inRow =
            s.startRow === undefined ||
            s.endRow === undefined ||
            (r >= s.startRow && r <= s.endRow)
          const inCol =
            s.startCol === undefined ||
            s.endCol === undefined ||
            (c >= s.startCol && c <= s.endCol)
          return inRow && inCol
        })
        if (matchingSection) {
          section = matchingSection.name
        }
      }

      const isBlocked = blockedSet.has(`${r},${c}`)
      const isHandicap = handicapSet.has(`${r},${c}`)

      seats.push({
        row: r,
        col: c,
        section,
        rowLabel: String.fromCharCode(65 + r), // A, B, C, ...
        seatNumber: c + 1,
        isBlocked,
        isHandicap,
      })
    }
  }

  return seats
}

/**
 * Create a seat key for identification/comparison
 * Used in booking and reservation flows
 */
export function getSeatKey(seat: { row: number; col: number; section?: string }): string {
  return `${seat.section || "Sal"}-${String.fromCharCode(65 + seat.row)}-${seat.col + 1}`
}

/**
 * Get seat from key
 */
export function parseSeatKey(
  key: string,
): { row: number; col: number; section: string } | null {
  const match = key.match(/^(.+)-([A-Z])-(\d+)$/)
  if (!match) return null

  const section = match[1]
  const row = match[2].charCodeAt(0) - 65
  const col = parseInt(match[3]) - 1

  return { section, row, col }
}
