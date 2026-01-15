import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { deviceName, deviceInfo } = body || {}

    // Create a one-time registration token that a new device can display as a QR
    const token = (await import('crypto')).randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes

    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.from('admin_device_registrations').insert({ token, device_name: deviceName || null, device_info: deviceInfo || null, expires_at: expiresAt })
    if (error) {
      console.error('create-registration: failed to insert', error)
      return NextResponse.json({ error: 'Failed to create registration' }, { status: 500 })
    }

    return NextResponse.json({ success: true, token, expiresAt })
  } catch (err) {
    console.error('Error in create-registration:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
