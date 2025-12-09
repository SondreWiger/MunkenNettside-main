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

  // Check if seats already exist for this show
  const { data: existingSeats } = await supabase
    .from('seats')
    .select('id')
    .eq('show_id', showId)
    .limit(1)

  if (existingSeats && existingSeats.length > 0) {
    console.log("Seats already exist for this show, returning existing seats");
    const { data: seats } = await supabase
      .from('seats')
      .select('*')
      .eq('show_id', showId)
      .order('section')
      .order('row')
      .order('number')
    
    return { seats: seats || [], generated: false, count: seats?.length || 0 }
  }

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
        
        seatsToCreate.push({
          show_id: showId,
          section: 'Sal', // SimpleSeatMap uses single section
          row: seat.row,
          number: seat.number,
          price_nok: show.base_price_nok || 250,
          status: status,
        });
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
        
        seatsToCreate.push({
          show_id: showId,
          section: section?.name || seat.section || 'Sal',
          row: seat.row || 'A',
          number: seat.number || 1,
          price_nok: Math.round((show.base_price_nok || 250) * priceMultiplier),
          status: 'available',
        })
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

  // Insert seats into database
  if (seatsToCreate.length > 0) {
    const { data: newSeats, error } = await supabase
      .from('seats')
      .insert(seatsToCreate)
      .select()

    if (error) {
      console.error("Error creating seats:", error);
      throw error
    }

    console.log(`Successfully created ${newSeats?.length || 0} seats`);
    return { seats: newSeats || [], generated: true, count: newSeats?.length || 0 }
  }

  return { seats: [], generated: false, count: 0 }
}