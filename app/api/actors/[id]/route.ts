import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: actorId } = await params
    const body = await request.json()
    const { name, bio, photo_url, contact_email, contact_phone, user_id } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Actor name is required' }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Update actor
    const { data: actor, error } = await supabase
      .from('actors')
      .update({
        name: name.trim(),
        bio: bio?.trim() || null,
        photo_url: photo_url?.trim() || null,
        contact_email: contact_email?.trim() || null,
        contact_phone: contact_phone?.trim() || null,
        user_id: user_id || null
      })
      .eq('id', actorId)
      .select()
      .single()

    if (error) {
      console.error('Error updating actor:', error)
      
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Actors table not initialized. Please run database setup first.',
          code: 'TABLES_NOT_EXIST'
        }, { status: 500 })
      }
      
      if (error.code === '23505') {
        return NextResponse.json({ error: 'An actor with this name already exists' }, { status: 409 })
      }
      
      return NextResponse.json({ error: 'Failed to update actor' }, { status: 500 })
    }

    return NextResponse.json({ actor })
  } catch (error) {
    console.error('Error in actor update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: actorId } = await params
    const supabase = await getSupabaseServerClient()

    // Delete actor
    const { error } = await supabase
      .from('actors')
      .delete()
      .eq('id', actorId)

    if (error) {
      console.error('Error deleting actor:', error)
      
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Actors table not initialized. Please run database setup first.',
          code: 'TABLES_NOT_EXIST'
        }, { status: 500 })
      }
      
      return NextResponse.json({ error: 'Failed to delete actor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in actor deletion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}