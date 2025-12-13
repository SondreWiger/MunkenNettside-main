import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import crypto from 'crypto'
import { sendAdminPromotionEmail } from '@/lib/email/send-admin-notification'

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    // Only allow access to verified admins
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: currentUserRow } = await supabase.from('users').select('role, admin_verified').eq('id', currentUser.id).single()
    if (currentUserRow?.role !== 'admin' || currentUserRow?.admin_verified !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
        actor:actors!users_actor_id_fkey(
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

    // Ensure all users have valid roles
    const validUsers = (users || []).map(user => ({
      ...user,
      role: ['customer', 'staff', 'admin'].includes(user.role) ? user.role : 'customer'
    }))

    return NextResponse.json({ users: validUsers })
  } catch (error) {
    console.error('Error in users endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // Check if user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, admin_verified')
      .eq('id', currentUser.id)
      .single()

    if (userData?.role !== 'admin' || userData?.admin_verified !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role, actorId, profileSlug } = body

    console.log('=== PUT /api/admin/users DEBUG ===')
    console.log('Raw body:', JSON.stringify(body, null, 2))
    console.log('Extracted values:', {
      userId,
      role: `"${role}"`,
      roleType: typeof role,
      actorId,
      profileSlug
    })

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (role && !['customer', 'staff', 'admin'].includes(role)) {
      console.error('Invalid role received:', role)
      return NextResponse.json({ error: `Invalid role: ${role}. Must be 'customer', 'staff', or 'admin'` }, { status: 400 })
    }

    // Update user
    const updateData: any = {}
    
    // Get current user data to check what needs updating
    const { data: currentUserData, error: fetchError } = await supabase
      .from('users')
      .select('role, actor_id, profile_slug')
      .eq('id', userId)
      .single()
    
    if (fetchError) {
      console.error('Error fetching current user:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
    }
    
    console.log('Current user data:', currentUserData)
    
    // CRITICAL: Only update role if it's explicitly different AND valid
    // DO NOT include role in update if it's the same to avoid constraint issues
    if (role !== undefined && role !== null) {
      const trimmedRole = String(role).trim() // Keep original casing - DB constraint is case-sensitive
      const currentRole = String(currentUserData.role).trim()
      
      console.log('Role comparison:', {
        receivedRaw: role,
        receivedTrimmed: trimmedRole,
        currentRaw: currentUserData.role,
        currentTrimmed: currentRole,
        areEqual: trimmedRole === currentRole,
        willUpdate: trimmedRole !== currentRole
      })
      
      if (trimmedRole && trimmedRole !== currentRole) {
        // Only update if role is different AND valid
        if (['customer', 'staff', 'admin'].includes(trimmedRole)) {
          updateData.role = trimmedRole // Use exact value, don't change casing
          console.log(`✓ Role will be updated from "${currentRole}" to "${trimmedRole}"`)
        } else {
          console.error('Invalid role value:', trimmedRole, 'Valid values:', ['customer', 'staff', 'admin'])
          return NextResponse.json({ 
            error: `Invalid role: "${trimmedRole}". Must be 'customer', 'staff', or 'admin'` 
          }, { status: 400 })
        }
      } else {
        console.log('✗ Role unchanged or empty, NOT including in update')
      }
    } else {
      console.log('✗ Role is undefined/null, NOT including in update')
    }
    
    // Handle actor_id - only update if different
    if (actorId !== undefined) {
      const newActorId = actorId === 'none' || actorId === null || actorId === '' ? null : actorId
      if (currentUserData.actor_id !== newActorId) {
        updateData.actor_id = newActorId
        console.log(`Actor ID will be updated from "${currentUserData.actor_id}" to "${newActorId}"`)
      } else {
        console.log('Actor ID unchanged, skipping')
      }
    }
    
    // Handle profile_slug - only update if different
    if (profileSlug !== undefined) {
      const newSlug = profileSlug && profileSlug.trim() !== '' ? profileSlug.trim() : null
      if (currentUserData.profile_slug !== newSlug) {
        updateData.profile_slug = newSlug
        console.log(`Profile slug will be updated from "${currentUserData.profile_slug}" to "${newSlug}"`)
      } else {
        console.log('Profile slug unchanged, skipping')
      }
    }

    console.log('Updating user with data:', JSON.stringify(updateData, null, 2))
    
    // Don't proceed if there's nothing to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: `Failed to update user: ${error.message}` }, { status: 500 })
    }

    console.log('User updated successfully:', user)

    // If role was changed to admin, ensure admin UUID and verification flags are set and notify staff email
    if (updateData.role === 'admin') {
      try {
        const adminUuid = crypto?.randomUUID ? crypto.randomUUID() : (await import('crypto')).randomUUID()
        const { data: updatedUser, error: adminUpdateError } = await supabase
          .from('users')
          .update({ admin_uuid: adminUuid, admin_verified: false, admin_uuid_created_at: new Date().toISOString() })
          .eq('id', userId)
          .select()
          .single()

        if (adminUpdateError) {
          console.error('Failed to set admin UUID:', adminUpdateError)
        } else {
          console.log('Set admin UUID for user:', updatedUser?.admin_uuid)
          // Notify central admin email so they can forward the UUID to the new admin
          try {
            await sendAdminPromotionEmail({
              userFullName: updatedUser?.full_name || '',
              userEmail: updatedUser?.email || '',
              adminUuid: String(updatedUser?.admin_uuid),
              promotedBy: currentUser?.email || currentUser?.id || undefined,
            })
          } catch (err) {
            console.log('ERROR: Error sending admin promotion email:', err)
            ;(user as any)._adminNotificationError = err instanceof Error ? err.message : String(err)
          }
        }
      } catch (err) {
        console.error('Error during admin UUID creation:', err)
      }
    }
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error in user update:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}