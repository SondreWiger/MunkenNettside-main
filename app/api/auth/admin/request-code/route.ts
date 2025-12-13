import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { sendAdminVerificationCode } from '@/lib/email/send-admin-verification'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { adminUuid } = body
    if (!adminUuid) return NextResponse.json({ error: 'adminUuid is required' }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userRow, error } = await supabase
      .from('users')
      .select('id, email, full_name, admin_uuid, admin_verified')
      .eq('id', currentUser.id)
      .single()

    if (error || !userRow) return NextResponse.json({ error: 'User row not found' }, { status: 404 })

    if (String(userRow.admin_uuid) !== String(adminUuid)) {
      return NextResponse.json({ error: 'Invalid admin UUID' }, { status: 400 })
    }

    if (userRow.admin_verified) {
      return NextResponse.json({ error: 'Admin already verified' }, { status: 400 })
    }

    // Generate 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: insertError } = await supabase
      .from('admin_verifications')
      .insert({ user_id: currentUser.id, code, expires_at: expiresAt })

    if (insertError) {
      console.error('Failed to insert admin_verification:', insertError)
      return NextResponse.json({ error: 'Failed to create verification' }, { status: 500 })
    }

    // Send email with code
    const sendResult = await sendAdminVerificationCode({ toEmail: userRow.email, userFullName: userRow.full_name || undefined, code, expiresAt })

    if (!sendResult.success) {
      return NextResponse.json({ error: sendResult.error || 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in request-code:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
