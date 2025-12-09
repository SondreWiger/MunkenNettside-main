import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const ensembleId = searchParams.get('ensembleId')

    if (!query || query.length < 1) {
      return NextResponse.json({ actors: [] })
    }

    const supabase = await getSupabaseServerClient()

    if (ensembleId) {
      // Search only actors who are enrolled in this ensemble
      // First get user_ids of enrolled members
      const { data: enrollments, error: enrollError } = await supabase
        .from('ensemble_enrollments')
        .select('user_id')
        .eq('ensemble_id', ensembleId)
        .in('status', ['yellow', 'blue'])

      if (enrollError) {
        console.error('Error fetching enrollments:', enrollError)
        return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 })
      }

      const enrolledUserIds = enrollments?.map(e => e.user_id) || []

      if (enrolledUserIds.length === 0) {
        // No enrolled users, return empty
        return NextResponse.json({ actors: [] })
      }

      // Search actors who are linked to these users
      const { data: actors, error } = await supabase
        .from('actors')
        .select('id, name, photo_url, bio, user_id')
        .ilike('name', `%${query}%`)
        .in('user_id', enrolledUserIds)
        .order('name')
        .limit(10)

      if (error) {
        console.error('Error searching actors:', error)
        
        if (error.code === '42P01') {
          console.log('Actors table does not exist yet, returning empty array')
          return NextResponse.json({ actors: [] })
        }
        
        return NextResponse.json({ error: 'Failed to search actors' }, { status: 500 })
      }

      return NextResponse.json({ actors })
    } else {
      // No ensemble filter - search all actors
      const { data: actors, error } = await supabase
        .from('actors')
        .select('id, name, photo_url, bio')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(10)

      if (error) {
        console.error('Error searching actors:', error)
        
        if (error.code === '42P01') {
          console.log('Actors table does not exist yet, returning empty array')
          return NextResponse.json({ actors: [] })
        }
        
        return NextResponse.json({ error: 'Failed to search actors' }, { status: 500 })
      }

      return NextResponse.json({ actors })
    }

  } catch (error) {
    console.error('Error in actor search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create new actor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, bio, photo_url, birth_date, contact_email, contact_phone } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data: actor, error } = await supabase
      .from('actors')
      .insert({
        name: name.trim(),
        bio,
        photo_url,
        birth_date,
        contact_email,
        contact_phone
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Actor with this name already exists' }, { status: 409 })
      }
      if (error.code === '42P01') { // Table doesn't exist
        return NextResponse.json({ 
          error: 'Database tables not initialized. Please run database setup first.',
          code: 'TABLES_NOT_EXIST'
        }, { status: 500 })
      }
      console.error('Error creating actor:', error)
      return NextResponse.json({ error: 'Failed to create actor' }, { status: 500 })
    }

    return NextResponse.json({ actor })

  } catch (error) {
    console.error('Error in actor creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}