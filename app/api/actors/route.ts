import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    // Get all actors
    const { data: actors, error } = await supabase
      .from('actors')
      .select('id, name, bio, photo_url, contact_email, contact_phone, user_id, created_at, updated_at')
      .order('name')

    if (error) {
      console.error('Error fetching actors:', error)
      return NextResponse.json({ error: 'Failed to fetch actors' }, { status: 500 })
    }

    return NextResponse.json({ actors })
  } catch (error) {
    console.error('Error in get actors endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, bio, photo_url, contact_email, contact_phone, user_id } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Create new actor
    const { data: actor, error } = await supabase
      .from('actors')
      .insert({
        name,
        bio: bio || null,
        photo_url: photo_url || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        user_id: user_id || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating actor:', error)
      
      // Handle specific database errors
      if (error.code === '23505') {
        return NextResponse.json({ error: 'En skuespiller med dette navnet eksisterer allerede' }, { status: 400 })
      }
      
      return NextResponse.json({ error: 'Failed to create actor' }, { status: 500 })
    }

    return NextResponse.json({ actor })
  } catch (error) {
    console.error('Error in create actor endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}