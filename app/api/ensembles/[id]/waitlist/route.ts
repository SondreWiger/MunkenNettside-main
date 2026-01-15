import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

// GET - Get waitlist for ensemble
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getSupabaseAdminClient()
    const ensembleId = params.id

    const { data: waitlist, error } = await supabase
      .from('ensemble_waitlist')
      .select(`
        *,
        user:users(id, full_name, email)
      `)
      .eq('ensemble_id', ensembleId)
      .order('position', { ascending: true })

    if (error) throw error

    return NextResponse.json({ waitlist })
  } catch (error: any) {
    console.error('Error fetching ensemble waitlist:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Add user to waitlist
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseBrowserClient()
    const ensembleId = params.id
    const { user_id, notes } = await request.json()

    // Check if waitlist is enabled
    const { data: ensemble, error: ensembleError } = await supabase
      .from('ensembles')
      .select('waitlist_enabled, max_actors')
      .eq('id', ensembleId)
      .single()

    if (ensembleError) throw ensembleError

    if (!ensemble.waitlist_enabled) {
      return NextResponse.json({ error: 'Waitlist is not enabled for this ensemble' }, { status: 400 })
    }

    // Check if user already enrolled or on waitlist
    const { data: existing } = await supabase
      .from('ensemble_enrollments')
      .select('id')
      .eq('ensemble_id', ensembleId)
      .eq('user_id', user_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'User already enrolled' }, { status: 400 })
    }

    const { data: existingWaitlist } = await supabase
      .from('ensemble_waitlist')
      .select('id')
      .eq('ensemble_id', ensembleId)
      .eq('user_id', user_id)
      .single()

    if (existingWaitlist) {
      return NextResponse.json({ error: 'User already on waitlist' }, { status: 400 })
    }

    // Get next position
    const { data: lastPosition } = await supabase
      .from('ensemble_waitlist')
      .select('position')
      .eq('ensemble_id', ensembleId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const position = (lastPosition?.position || 0) + 1

    // Add to waitlist
    const { data: waitlistEntry, error: insertError } = await supabase
      .from('ensemble_waitlist')
      .insert({
        ensemble_id: ensembleId,
        user_id,
        position,
        status: 'waiting',
        notes
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({ waitlistEntry }, { status: 201 })
  } catch (error: any) {
    console.error('Error adding to ensemble waitlist:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Remove from waitlist
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseBrowserClient()
    const { searchParams } = new URL(request.url)
    const waitlistId = searchParams.get('waitlistId')

    if (!waitlistId) {
      return NextResponse.json({ error: 'Waitlist ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('ensemble_waitlist')
      .delete()
      .eq('id', waitlistId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error removing from ensemble waitlist:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
