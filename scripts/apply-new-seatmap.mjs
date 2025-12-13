#!/usr/bin/env node

/**
 * Apply the new seat map configuration to the venue
 * This script:
 * 1. Updates the venue with the new seat map
 * 2. Deletes existing seats for all shows at this venue
 * 3. Regenerates seats for all shows
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const VENUE_ID = '00000000-0000-0000-0000-000000000001'

// New seat map configuration
const NEW_SEAT_MAP = {
  seats: []
}

// Generate rows 1-5 (seats 1-25)
for (let row = 1; row <= 5; row++) {
  for (let seat = 1; seat <= 25; seat++) {
    NEW_SEAT_MAP.seats.push({
      row: String(row),
      number: seat,
      type: 'available'
    })
  }
}

// Generate rows 6-10 (seats 13-25 only)
for (let row = 6; row <= 10; row++) {
  for (let seat = 13; seat <= 25; seat++) {
    NEW_SEAT_MAP.seats.push({
      row: String(row),
      number: seat,
      type: 'available'
    })
  }
}

async function main() {
  console.log('🎭 Starting seat map update...\n')

  // Step 1: Update venue
  console.log('📝 Updating venue configuration...')
  const { error: venueError } = await supabase
    .from('venues')
    .update({
      capacity: 235,
      seat_map_config: NEW_SEAT_MAP
    })
    .eq('id', VENUE_ID)

  if (venueError) {
    console.error('❌ Failed to update venue:', venueError)
    process.exit(1)
  }
  console.log('✅ Venue updated with new seat map (235 seats)\n')

  // Step 2: Get all shows for this venue
  console.log('🔍 Finding shows at this venue...')
  const { data: shows, error: showsError } = await supabase
    .from('shows')
    .select('id, title')
    .eq('venue_id', VENUE_ID)

  if (showsError) {
    console.error('❌ Failed to fetch shows:', showsError)
    process.exit(1)
  }

  if (!shows || shows.length === 0) {
    console.log('ℹ️  No shows found at this venue')
    console.log('✨ Seat map updated successfully!')
    return
  }

  console.log(`📊 Found ${shows.length} show(s)\n`)

  // Step 3: Delete existing seats
  console.log('🗑️  Deleting old seats...')
  const showIds = shows.map(s => s.id)
  const { error: deleteError } = await supabase
    .from('seats')
    .delete()
    .in('show_id', showIds)

  if (deleteError) {
    console.error('❌ Failed to delete old seats:', deleteError)
    process.exit(1)
  }
  console.log('✅ Old seats deleted\n')

  // Step 4: Regenerate seats for each show
  console.log('🎪 Regenerating seats for each show...')
  for (const show of shows) {
    console.log(`  - ${show.title || 'Untitled'} (${show.id})`)
    
    const seatsToInsert = NEW_SEAT_MAP.seats.map(seat => ({
      show_id: show.id,
      section: 'Sal',
      row: seat.row,
      number: seat.number,
      status: 'available',
      price_nok: 0, // Will use show's base price
      is_handicap_accessible: false
    }))

    const { error: insertError } = await supabase
      .from('seats')
      .insert(seatsToInsert)

    if (insertError) {
      console.error(`    ❌ Failed:`, insertError.message)
    } else {
      console.log(`    ✅ ${seatsToInsert.length} seats created`)
    }
  }

  console.log('\n✨ Seat map update complete!')
  console.log(`
📋 Summary:
  - Layout: 235 seats total
  - Rows 1-5: Seats 1-25 (125 seats)
  - Rows 6-10: Seats 13-25 (65 seats, gap on left)
  - Shows updated: ${shows.length}
`)
}

main().catch(console.error)
