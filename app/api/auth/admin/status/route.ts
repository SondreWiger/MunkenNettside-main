import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userRow, error } = await supabase
      .from('users')
      .select('role, admin_verified, admin_uuid')
      .eq('id', currentUser.id)
      .single()

    if (error || !userRow) return NextResponse.json({ error: 'User row not found' }, { status: 404 })

    const requiresVerification = userRow.role === 'admin' && !userRow.admin_verified

    return NextResponse.json({ role: userRow.role, adminVerified: !!userRow.admin_verified, adminUuidPresent: !!userRow.admin_uuid, requiresVerification })
  } catch (err) {
    console.error('Error in admin status:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
