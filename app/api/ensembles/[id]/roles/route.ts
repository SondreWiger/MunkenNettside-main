import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ensembleId } = await params
    const supabase = await getSupabaseServerClient()

    // Get roles with actor details
    const { data: roles, error } = await supabase
      .from('roles')
      .select(`
        id,
        character_name,
        description,
        importance,
        yellow_actor_id,
        blue_actor_id,
        yellow_actor:yellow_actor_id(
          id,
          name,
          bio,
          photo_url,
          contact_email,
          contact_phone,
          user_id
        ),
        blue_actor:blue_actor_id(
          id,
          name,
          bio,
          photo_url,
          contact_email,
          contact_phone,
          user_id
        )
      `)
      .eq('ensemble_id', ensembleId)
      .order('importance, character_name')

    if (error) {
      console.error('Error fetching roles:', error)
      
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        console.log('Roles table does not exist yet, returning empty array')
        return NextResponse.json({ roles: [] })
      }
      
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
    }

    return NextResponse.json({ roles: roles || [] })
  } catch (error) {
    console.error('Error in roles endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ensembleId } = await params
    const body = await request.json()
    const { character_name, description, importance, yellow_actor_id, blue_actor_id } = body

    if (!character_name || !character_name.trim()) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Create new role
    const { data: role, error } = await supabase
      .from('roles')
      .insert({
        ensemble_id: ensembleId,
        character_name: character_name.trim(),
        description: description?.trim() || null,
        importance: importance || 'supporting',
        yellow_actor_id: yellow_actor_id || null,
        blue_actor_id: blue_actor_id || null
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'A role with this character name already exists' }, { status: 409 })
      }
      console.error('Error creating role:', error)
      return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
    }

    return NextResponse.json({ role })
  } catch (error) {
    console.error('Error in role creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ensembleId } = await params
    const body = await request.json()
    const { roles } = body

    console.log('PUT /api/ensembles/[id]/roles - Received data:', { 
      ensembleId, 
      rolesCount: roles?.length,
      roles: roles
    })

    if (!Array.isArray(roles)) {
      return NextResponse.json({ error: 'Roles must be an array' }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Update all roles in batch
    const updatePromises = roles.map(async (role: any, index: number) => {
      console.log(`Processing role ${index + 1}:`, role)
      
      if (role.id) {
        // Update existing role
        const updateData = {
          character_name: role.character_name,
          description: role.description || null,
          importance: role.importance || 'supporting',
          yellow_actor_id: role.yellow_actor?.id || null,
          blue_actor_id: role.blue_actor?.id || null
        }
        
        console.log(`Updating role ${role.id} with:`, updateData)
        
        return supabase
          .from('roles')
          .update(updateData)
          .eq('id', role.id)
          .select()
          .single()
      } else {
        // Create new role
        const insertData = {
          ensemble_id: ensembleId,
          character_name: role.character_name,
          description: role.description || null,
          importance: role.importance || 'supporting',
          yellow_actor_id: role.yellow_actor?.id || null,
          blue_actor_id: role.blue_actor?.id || null
        }
        
        console.log(`Creating new role with:`, insertData)
        
        return supabase
          .from('roles')
          .insert(insertData)
          .select()
          .single()
      }
    })

    const results = await Promise.all(updatePromises)
    
    console.log('Results from database operations:', results)
    
    // Check for any errors
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      console.error('Error updating roles:', errors)
      
      // Check if it's a table doesn't exist error
      if (errors.some(e => e.error?.code === '42P01')) {
        return NextResponse.json({ 
          error: 'Database tables not initialized. Please run database setup first.',
          code: 'TABLES_NOT_EXIST'
        }, { status: 500 })
      }
      
      return NextResponse.json({ error: 'Failed to update some roles', details: errors }, { status: 500 })
    }

    const updatedRoles = results.map(result => result.data)
    console.log('Successfully updated roles:', updatedRoles.length)
    return NextResponse.json({ roles: updatedRoles })
  } catch (error) {
    console.error('Error in role update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}