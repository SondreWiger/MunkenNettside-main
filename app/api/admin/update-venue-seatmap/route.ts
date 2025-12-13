import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { venueId, capacity, seatMapConfig, gridLayout } = await request.json()

    // Handle both old format (gridLayout) and new format (seatMapConfig.gridData)
    const gridData = gridLayout || seatMapConfig.gridData

    // Update venue with both seat list and grid layout
    const { error } = await supabase
      .from('venues')
      .update({
        capacity,
        seat_map_config: {
          seats: seatMapConfig.seats,
          gridData: gridData
        }
      })
      .eq('id', venueId)

    if (error) {
      console.error('Error updating venue:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Delete existing seats for all shows at this venue
    const { data: shows } = await supabase
      .from('shows')
      .select('id')
      .eq('venue_id', venueId)

    if (shows && shows.length > 0) {
      const showIds = shows.map(s => s.id)
      await supabase
        .from('seats')
        .delete()
        .in('show_id', showIds)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Seat map updated with ${capacity} seats. Existing seats cleared for ${shows?.length || 0} shows.` 
    })
  } catch (error) {
    console.error('Error in update-venue-seatmap:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
