import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: regs, error } = await supabase.from('admin_device_registrations').select('*').eq('token', token).limit(1)
    if (error || !regs || regs.length === 0) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

    const reg = regs[0]
    if (reg.used && reg.confirmed_device_token) {
      return NextResponse.json({ status: 'registered', deviceToken: reg.confirmed_device_token })
    }

    const expires = reg.expires_at && new Date(reg.expires_at) < new Date()
    if (expires) return NextResponse.json({ error: 'Expired' }, { status: 400 })

    return NextResponse.json({ status: 'pending' })
  } catch (err) {
    console.error('Error in registration-status:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
