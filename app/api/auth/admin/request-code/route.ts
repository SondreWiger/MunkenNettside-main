import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { sendAdminVerificationCode } from '@/lib/email/send-admin-verification'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { adminUuid } = body
    // Validate adminUuid if provided
    if (adminUuid && typeof adminUuid === 'string') {
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      if (!uuidRegex.test(adminUuid)) {
        return NextResponse.json({ error: 'Invalid admin UUID format' }, { status: 400 })
      }
    }

    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userRow, error } = await supabase
      .from('users')
      .select('id, email, full_name, admin_uuid, admin_verified')
      .eq('id', currentUser.id)
      .single()
    if (error || !userRow) {
      console.error('request-code: user row not found for', { currentUserId: currentUser.id, error })
      return NextResponse.json({ error: 'User row not found' }, { status: 404 })
    }

    console.log('request-code:', { currentUserId: currentUser.id, adminUuidProvided: adminUuid || null, userAdminUuid: userRow.admin_uuid || null, adminVerified: userRow.admin_verified })

    // Rate limiting: limit sending to 5 codes per hour per user
    try {
      const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('admin_action_logs')
        .select('id', { count: 'exact' })
        .gte('created_at', windowStart)
        .eq('action_type', 'admin_code_sent')
        .eq('performed_by', currentUser.id)

      if ((count || 0) >= 5) {
        return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 })
      }
    } catch (err) {
      console.error('request-code: rate limit check failed', err)
    }

    // If adminUuid is provided, require it to match; otherwise allow sending code if the user is indeed an admin
    if (adminUuid && String(userRow.admin_uuid) !== String(adminUuid)) {
      console.warn('request-code: invalid admin UUID provided', { currentUserId: currentUser.id })
      return NextResponse.json({ error: 'Invalid admin UUID' }, { status: 400 })
    }

    if (!userRow.admin_uuid) {
      console.warn('request-code: user has no admin_uuid set', { currentUserId: currentUser.id })
      return NextResponse.json({ error: 'No admin UUID set for this account' }, { status: 400 })
    }

    if (userRow.admin_verified) {
      return NextResponse.json({ error: 'Admin already verified' }, { status: 400 })
    }

      // If there exists an outstanding verification that requires a QR scan, force that flow
      try {
        const { data: pending, error: pendingErr } = await supabase
          .from('admin_verifications')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('code_type', 'alphanumeric')
          .eq('qr_scanned', false)
          .gt('expires_at', new Date().toISOString())
          .limit(1)

        if (pendingErr) {
          console.error('request-code: failed to check pending QR verifications', pendingErr)
        } else if (pending && pending.length > 0) {
          return NextResponse.json({ error: 'QR verification required before requesting a code' }, { status: 400 })
        }
      } catch (err) {
        console.error('request-code: error checking pending QR verifications', err)
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

    // Log action for auditing/rate-limiting
    try {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
      const ua = request.headers.get('user-agent') || null
      await supabase.from('admin_action_logs').insert({ action_type: 'admin_code_sent', performed_by: currentUser.id, target_user_id: currentUser.id, ip_address: ip, user_agent: ua, metadata: { adminUuidProvided: !!adminUuid } })
    } catch (err) {
      console.error('request-code: failed to insert audit log', err)
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
