import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
  const { code } = body
  if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 })
  // Basic format check to avoid brute-force or malformed inputs
  if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) return NextResponse.json({ error: 'Invalid code format' }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Find a matching unused, unexpired code
    const nowIso = new Date().toISOString()
    const { data: verifications, error } = await supabase
      .from('admin_verifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error querying verifications:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!verifications || verifications.length === 0) {
      // Log failed attempt
      try {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
        const ua = request.headers.get('user-agent') || null
        await supabase.from('admin_action_logs').insert({ action_type: 'admin_code_verify_failed', performed_by: currentUser.id, target_user_id: currentUser.id, ip_address: ip, user_agent: ua, metadata: { attemptedCode: code } })
      } catch (err) {
        console.error('verify-code: failed to insert audit log for failed attempt', err)
      }

      // Check for lockout: 5 failed attempts in last 30 minutes
      try {
        const windowStart = new Date(Date.now() - 30 * 60 * 1000).toISOString()
        const { count } = await supabase
          .from('admin_action_logs')
          .select('id', { count: 'exact' })
          .gte('created_at', windowStart)
          .eq('action_type', 'admin_code_verify_failed')
          .eq('performed_by', currentUser.id)

        if ((count || 0) >= 5) {
          return NextResponse.json({ error: 'Too many failed attempts. Try again later.' }, { status: 429 })
        }
      } catch (err) {
        console.error('verify-code: failed to check failed attempts count', err)
      }
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
    }

    const verification = verifications[0]

    // Mark verification as used and mark user as verified
    const { error: markError } = await supabase
      .from('admin_verifications')
      .update({ used: true })
      .eq('id', verification.id)

    if (markError) {
      console.error('Failed to mark verification used:', markError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ admin_verified: true })
      .eq('id', currentUser.id)

    if (userUpdateError) {
      console.error('Failed to update user admin_verified:', userUpdateError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Log successful verification
    try {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
      const ua = request.headers.get('user-agent') || null
      await supabase.from('admin_action_logs').insert({ action_type: 'admin_code_verified', performed_by: currentUser.id, target_user_id: currentUser.id, ip_address: ip, user_agent: ua, metadata: { verificationId: verification.id } })
    } catch (err) {
      console.error('verify-code: failed to insert audit log for success', err)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in verify-code:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
