import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { deviceToken } = body || {}
    if (!deviceToken) return NextResponse.json({ error: 'deviceToken is required' }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: device } = await supabase.from('admin_devices').select('*').eq('device_token', deviceToken).eq('revoked', false).single()
    if (!device) return NextResponse.json({ error: 'Invalid device token' }, { status: 400 })

    // Set cookie on this device for the device token
    const res = NextResponse.json({ success: true })
    res.cookies.set('device', deviceToken, {
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    })
    return res
  } catch (err) {
    console.error('Error in devices/complete-registration:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
