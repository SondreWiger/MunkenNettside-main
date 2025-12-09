import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function updateShowAvailableSeats(showId: string): Promise<number> {
  const supabase = await getSupabaseServerClient()
  
  // Get total seats for the show
  const { data: totalSeats } = await supabase
    .from("seats")
    .select("id")
    .eq("show_id", showId)
  
  // Get sold/reserved seats
  const { data: unavailableSeats } = await supabase
    .from("seats")
    .select("id")
    .eq("show_id", showId)
    .in("status", ["sold", "reserved"])
  
  const availableSeats = (totalSeats?.length || 0) - (unavailableSeats?.length || 0)
  
  // Update the show record
  await supabase
    .from("shows")
    .update({ available_seats: availableSeats })
    .eq("id", showId)
  
  return availableSeats
}

export async function getEarlyBirdPrice(basePrice: number, showDateTime: string): Promise<{ price: number; isEarlyBird: boolean }> {
  const showDate = new Date(showDateTime)
  const now = new Date()
  const oneMonthBeforeShow = new Date(showDate.getTime() - (30 * 24 * 60 * 60 * 1000))
  
  const isEarlyBird = now < oneMonthBeforeShow
  const price = isEarlyBird ? basePrice - 100 : basePrice
  
  return { price, isEarlyBird }
}