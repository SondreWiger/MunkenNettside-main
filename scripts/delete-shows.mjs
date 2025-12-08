import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function deleteAllShows() {
  console.log('Deleting all seats...')
  const { error: seatsError, count: seatsCount } = await supabase
    .from('seats')
    .delete()
    .is('id', null)
    .not('id', 'is', null)

  if (seatsError) {
    console.log('First try had an error, trying direct method...')
  }

  // Get all seats first
  const { data: allSeats } = await supabase.from('seats').select('id')
  if (allSeats && allSeats.length > 0) {
    const seatIds = allSeats.map(s => s.id)
    const { error: deleteError } = await supabase
      .from('seats')
      .delete()
      .in('id', seatIds)
    
    if (deleteError) {
      console.error('Error deleting seats:', deleteError.message)
    } else {
      console.log(`Deleted ${allSeats.length} seats`)
    }
  }

  console.log('Deleting all shows...')
  const { data: allShows } = await supabase.from('shows').select('id')
  if (allShows && allShows.length > 0) {
    const showIds = allShows.map(s => s.id)
    const { error: deleteError } = await supabase
      .from('shows')
      .delete()
      .in('id', showIds)
    
    if (deleteError) {
      console.error('Error deleting shows:', deleteError.message)
      return
    }
    console.log(`Deleted ${allShows.length} shows`)
  }

  console.log('All shows (forestillinger) deleted successfully!')
}

deleteAllShows().catch(console.error)
