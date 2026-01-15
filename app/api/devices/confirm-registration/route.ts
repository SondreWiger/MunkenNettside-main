import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createAdminDevice } from '@/lib/admin/devices'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, deviceName } = body || {}
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Require a trusted device cookie for performing confirmations
    const { cookies: cookieStore } = (await import('next/headers'))
    const cookieObj = await cookieStore()
    const deviceTokenCookie = cookieObj.get('device')?.value || null
    let deviceTrusted = false
    if (deviceTokenCookie) {
      const { data: device } = await supabase.from('admin_devices').select('*').eq('device_token', deviceTokenCookie).eq('revoked', false).single()
      if (device && device.user_id === currentUser.id) deviceTrusted = true
    }
    if (!deviceTrusted) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Find registration token
    const nowIso = new Date().toISOString()
    const { data: regs, error } = await supabase.from('admin_device_registrations').select('*').eq('token', token).eq('used', false).gt('expires_at', nowIso).limit(1)
    if (error || !regs || regs.length === 0) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })

    const reg = regs[0]

    // Create device and update registration
    const { device, token: deviceToken } = await createAdminDevice(supabase, currentUser.id, deviceName || reg.device_name, reg.device_info)

    const { error: updateErr } = await supabase.from('admin_device_registrations').update({ used: true, confirmed_at: new Date().toISOString(), confirmed_device_token: deviceToken, confirmed_by: currentUser.id }).eq('id', reg.id)
    if (updateErr) {
      console.error('devices/confirm-registration: failed to update registration', updateErr)
      return NextResponse.json({ error: 'Failed to confirm registration' }, { status: 500 })
    }

    // Log action
    try {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
      const ua = request.headers.get('user-agent') || null
      await supabase.from('admin_action_logs').insert({ action_type: 'device_registered_via_qr', performed_by: currentUser.id, target_user_id: currentUser.id, ip_address: ip, user_agent: ua, metadata: { registrationId: reg.id, deviceId: device.id } })
    } catch (err) {
      console.error('devices/confirm-registration: failed to log action', err)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in devices/confirm-registration:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
