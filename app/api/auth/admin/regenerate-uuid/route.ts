import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role, admin_uuid')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 })
    }

    // Generate new admin UUID
    const newAdminUuid = globalThis.crypto.randomUUID()
    
    // Update user with new admin UUID and reset verification
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        admin_uuid: newAdminUuid,
        admin_verified: false,
        admin_uuid_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating admin UUID:', updateError)
      return NextResponse.json({ error: 'Failed to regenerate admin UUID' }, { status: 500 })
    }

    // Send verification email with new UUID
    const { error: emailError } = await fetch('/api/auth/admin/send-uuid-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.id,
        adminUuid: newAdminUuid,
        email: user.email
      })
    })

    return NextResponse.json({ 
      success: true,
      message: 'Admin UUID regenerated. Check your email for the new UUID.',
      adminUuid: newAdminUuid // Only for development
    })
    
  } catch (error) {
    console.error('Error in regenerate admin UUID:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}