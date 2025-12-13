import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getDeviceByToken } from '@/lib/admin/devices'

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

    // Check for trusted device cookie
  const cookieStore = await cookies()
  const deviceToken = cookieStore.get('admin_device')?.value || null
    let deviceTrusted = false
    if (deviceToken) {
      const device = await getDeviceByToken(supabase, deviceToken)
      if (device && device.user_id === currentUser.id && !device.revoked) {
        deviceTrusted = true
      }
    }

    const requiresVerification = userRow.role === 'admin' && !deviceTrusted && !userRow.admin_verified

    const response: any = { role: userRow.role, adminVerified: !!userRow.admin_verified, adminUuidPresent: !!userRow.admin_uuid, requiresVerification, deviceTrusted }
    // In development only, expose the actual admin UUID to aid debugging
    if (process.env.NODE_ENV !== 'production') {
      response.adminUuid = userRow.admin_uuid || null
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('Error in admin status:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
