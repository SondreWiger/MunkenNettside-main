import { createClient } from '@supabase/supabase-js'

// Utility function to generate seats from venue seat map config
export async function generateSeatsFromConfig(showId: string, supabaseClient?: any) {
  // Use provided client or create admin client
  const supabase = supabaseClient || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Get show and venue data
  const { data: show } = await supabase
    .from('shows')
    .select(`
      *,
      venue:venues(seat_map_config)
    `)
    .eq('id', showId)
    .single()

  if (!show || !show.venue?.seat_map_config) {
    return { seats: [], generated: false, count: 0 }
  }

  console.log("Generating seats for show:", showId);
  console.log("Venue seat map config:", show.venue.seat_map_config);

  const seatMapConfig = show.venue.seat_map_config
  const seatsToCreate: any[] = []

  // Fetch existing seats for this show and avoid overwriting them.
  // We used to delete all seats and recreate them, but that erased runtime
  // reservation/sold state (causing reservations to disappear). Instead,
  // preserve existing seats and only insert new seats that are missing.
  const { data: existingSeatsList } = await supabase
    .from('seats')
    .select('section, row, number')
    .eq('show_id', showId)

  const existingKeys = new Set<string>()
  ;(existingSeatsList || []).forEach((s: any) => {
    existingKeys.add(`${s.section}::${String(s.row)}::${String(s.number)}`)
  })

  // Process SimpleSeatMap format (our new format)
  if (seatMapConfig.seats && Array.isArray(seatMapConfig.seats)) {
    console.log("Using SimpleSeatMap format, found", seatMapConfig.seats.length, "seats");
    
    seatMapConfig.seats.forEach((seat: any) => {
      if (seat.type !== 'inactive') {
        // Map seat types to database format - only basic types, no handicap features
        let status = 'available';
        
        switch (seat.type) {
          case 'reserved':
            status = 'reserved';
            break;
          case 'taken':
            status = 'sold';
            break;
          case 'hc':
          case 'hc_reserved':
            // Convert handicap seats to regular seats
            status = seat.type === 'hc_reserved' ? 'reserved' : 'available';
            break;
          default:
            status = 'available';
        }
        
        // Normalize row as string and number as integer to avoid NaN/encoding issues
        const normalizedRow = seat.row != null ? String(seat.row) : 'A'
        const normalizedNumber = Number.isFinite(Number(seat.number)) ? Number(seat.number) : (seat.number ? parseInt(String(seat.number)) || 0 : 0)

        const key = `Sal::${normalizedRow}::${normalizedNumber}`
        // Only create if it doesn't already exist - preserve reserved/sold
        if (!existingKeys.has(key)) {
          seatsToCreate.push({
          show_id: showId,
          section: 'Sal', // SimpleSeatMap uses single section
          row: normalizedRow,
          number: normalizedNumber,
          price_nok: show.base_price_nok || 250,
          status: status,
          })
        }
      }
    });
  }
  // Handle other legacy formats...
  else if (seatMapConfig.version === 3 && seatMapConfig.elements) {
    // V3 format
    const seatElements = seatMapConfig.elements.filter((el: any) => el.type === 'seat')
    const sections = seatMapConfig.sections || []
    
    seatElements.forEach((seat: any) => {
      if (!seat.isBlocked) {
        const section = sections.find((s: any) => s.id === seat.section)
        const priceMultiplier = section?.priceMultiplier || 1.0
        
        // Normalize for safety
        const normalizedRowV3 = seat.row != null ? String(seat.row) : (seat.rowLabel ? String(seat.rowLabel) : 'A')
        const normalizedNumberV3 = Number.isFinite(Number(seat.number)) ? Number(seat.number) : (seat.number ? parseInt(String(seat.number)) || 0 : 0)

        const key = `${section?.name || seat.section || 'Sal'}::${normalizedRowV3}::${normalizedNumberV3}`
        if (!existingKeys.has(key)) {
          seatsToCreate.push({
          show_id: showId,
          section: section?.name || seat.section || 'Sal',
          row: normalizedRowV3,
          number: normalizedNumberV3,
          price_nok: Math.round((show.base_price_nok || 250) * priceMultiplier),
          status: 'available',
          })
        }
      }
    })
  }
  else {
    // Fallback: create a simple grid if no valid config
    console.log("No valid seat map config found, creating fallback seats");
    for (let row = 0; row < 5; row++) {
      for (let seat = 1; seat <= 10; seat++) {
        seatsToCreate.push({
          show_id: showId,
          section: 'Sal',
          row: String.fromCharCode(65 + row), // A, B, C, etc.
          number: seat,
          price_nok: show.base_price_nok || 250,
          status: 'available',
        })
      }
    }
  }

  console.log(`Prepared ${seatsToCreate.length} seats for creation`);

  // Insert new seats into database (don't delete existing seats)
  if (seatsToCreate.length > 0) {
    let newSeats, error;
    try {
      const result = await supabase
        .from('seats')
        .insert(seatsToCreate)
        .select();
      newSeats = result.data;
      error = result.error;
    } catch (err) {
      error = err;
    }
    // If duplicate error (some concurrent process inserted seats since we checked),
    // don't delete existing seats (that would wipe reservations). Instead re-fetch
    // the current seats for the show and use those as the result.
    if (error && error.code === '23505') {
      console.warn('Duplicate seat error detected - re-querying existing seats instead of deleting')
      const { data: reFetched } = await supabase
        .from('seats')
        .select()
        .eq('show_id', showId)
      newSeats = reFetched
      error = null
    }
    if (error) {
      console.error("Error creating seats:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Failed to create seats: ${error.message || 'Unknown error'}`)
    }
    console.log(`Successfully created ${newSeats?.length || 0} seats`);
    return { seats: newSeats || [], generated: true, count: newSeats?.length || 0 }
  }

  return { seats: [], generated: false, count: 0 }
}