#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load .env file manually
const envFile = readFileSync('.env', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const VENUE_ID = '00000000-0000-0000-0000-000000000001'

// Build the new seat map - exact theater layout from grid coordinates
const seats = []

// Parse the label to get row number and seat number
// Labels are like "1-1", "1-2", "19-1", "M1", etc.
const seatData = [
  // Row 19 (back)
  {row: "19", seats: [1, 2, 3, 4, 5, 6]},
  // Row 18
  {row: "18", seats: [1, 2, 3, 4, 5, 6, 7, 8]},
  // Row 17
  {row: "17", seats: [1, 2, 3, 4, 5, 6, 7, 8]},
  // Row 16
  {row: "16", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9]},
  // Row 15
  {row: "15", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9]},
  // Row 14
  {row: "14", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]},
  // Row 13
  {row: "13", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]},
  // Row 12
  {row: "12", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]},
  // Row 11
  {row: "11", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]},
  // Row 10
  {row: "10", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]},
  // Row 9
  {row: "9", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]},
  // Row 8
  {row: "8", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]},
  // Row 7
  {row: "7", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]},
  // Row 6
  {row: "6", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]},
  // Row 5
  {row: "5", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]},
  // Row 4
  {row: "4", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]},
  // Row 3
  {row: "3", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]},
  // Row 2
  {row: "2", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]},
  // Row M (Motorang - wheelchair accessible)
  {row: "M", seats: [1, 2, 3, 4]},
  // Row 1 (front) - has a gap in the middle
  {row: "1", seats: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]},
]

// Build seats array
seatData.forEach(rowData => {
  rowData.seats.forEach(seatNum => {
    seats.push({ 
      row: rowData.row, 
      number: seatNum, 
      type: 'available' 
    })
  })
})

console.log('🎭 Updating venue seat map...')
console.log(`📊 Total seats: ${seats.length}`)

const { error } = await supabase
  .from('venues')
  .update({
    capacity: seats.length,
    seat_map_config: { seats }
  })
  .eq('id', VENUE_ID)

if (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

console.log('✅ Venue updated successfully!')
console.log('\n📝 Next steps:')
console.log('1. Delete existing seats for your shows')
console.log('2. Visit a show booking page to regenerate seats')
console.log('\nOr run: DELETE FROM seats WHERE show_id IN (SELECT id FROM shows WHERE venue_id = \'00000000-0000-0000-0000-000000000001\');')
