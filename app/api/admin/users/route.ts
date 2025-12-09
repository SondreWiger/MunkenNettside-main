import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    // Get all users with their linked actor information
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        full_name,
        email,
        phone,
        role,
        profile_slug,
        actor_id,
        created_at,
        updated_at,
        actor:actor_id(
          id,
          name,
          bio,
          photo_url
        )
      `)
      .order('full_name')

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error('Error in users endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, role, actorId, profileSlug } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (role && !['customer', 'staff', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Update user
    const updateData: any = {}
    if (role) updateData.role = role
    if (actorId !== undefined) updateData.actor_id = actorId || null
    if (profileSlug !== undefined) updateData.profile_slug = profileSlug || null

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error in user update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}