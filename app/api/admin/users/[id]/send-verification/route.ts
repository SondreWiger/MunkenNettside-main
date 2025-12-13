import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { sendAdminVerificationCode } from '@/lib/email/send-admin-verification'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await params
    if (!userId) return NextResponse.json({ error: 'User id required' }, { status: 400 })

    const supabase = await getSupabaseServerClient()

    // Check current user is an admin and verified
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: currentUserRow, error: curErr } = await supabase
      .from('users')
      .select('role, admin_verified')
      .eq('id', currentUser.id)
      .single()

    if (curErr || !currentUserRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (currentUserRow.role !== 'admin' || currentUserRow.admin_verified !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get target user
    const { data: targetUser, error: targetErr } = await supabase
      .from('users')
      .select('id, email, full_name, role, admin_uuid')
      .eq('id', userId)
      .single()

    if (targetErr || !targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (targetUser.role !== 'admin') {
      return NextResponse.json({ error: 'Target user is not an admin' }, { status: 400 })
    }

    // If the target admin doesn't yet have an admin_uuid (older accounts), create one now
    if (!targetUser.admin_uuid) {
      try {
        const adminUuid = crypto?.randomUUID ? crypto.randomUUID() : (await import('crypto')).randomUUID()
        const { data: updatedUser, error: adminUpdateError } = await supabase
          .from('users')
          .update({ admin_uuid: adminUuid, admin_verified: false, admin_uuid_created_at: new Date().toISOString() })
          .eq('id', userId)
          .select()
          .single()

        if (adminUpdateError) {
          console.error('Failed to set admin UUID for target user:', adminUpdateError)
          return NextResponse.json({ error: 'Failed to set admin UUID for target user' }, { status: 500 })
        }

        console.log('Created admin_uuid for target user:', updatedUser?.admin_uuid)
        // Notify central admin email about the new UUID (reuse promotion email path)
        try {
          await import('crypto') // ensure crypto available
        } catch (_) {}

        try {
          // sendAdminPromotionEmail is async; we don't fail the main flow if it errors
          await (await import('@/lib/email/send-admin-notification')).sendAdminPromotionEmail({
            userFullName: updatedUser?.full_name || '',
            userEmail: updatedUser?.email || '',
            adminUuid: String(updatedUser?.admin_uuid),
            promotedBy: currentUser?.email || currentUser?.id || undefined,
          })
        } catch (err) {
          console.error('Error sending admin promotion notification for auto-created UUID:', err)
        }

        // Refresh targetUser reference with updated data
        const { data: refreshed, error: refreshErr } = await supabase.from('users').select('id, email, full_name, role, admin_uuid').eq('id', userId).single()
        if (refreshErr || !refreshed) {
          console.error('Failed to refresh target user after admin_uuid creation:', refreshErr)
        } else {
          targetUser.admin_uuid = refreshed.admin_uuid
        }
      } catch (err) {
        console.error('Error while creating admin_uuid for target user:', err)
        return NextResponse.json({ error: 'Failed to generate admin UUID' }, { status: 500 })
      }
    }

    // Rate limiting: do not allow sending more than 3 codes to the same target within 1 hour
    try {
      const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('admin_action_logs')
        .select('id', { count: 'exact' })
        .gte('created_at', windowStart)
        .eq('action_type', 'admin_code_sent_by_admin')
        .eq('target_user_id', userId)

      if ((count || 0) >= 3) {
        return NextResponse.json({ error: 'Rate limit exceeded for this target user. Try again later.' }, { status: 429 })
      }
    } catch (err) {
      console.error('send-verification: rate limit check failed', err)
    }

  // Generate code and insert
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: insertError } = await supabase.from('admin_verifications').insert({ user_id: userId, code, expires_at: expiresAt })
    if (insertError) {
      console.error('Failed to insert admin_verification:', insertError)
      return NextResponse.json({ error: 'Failed to create verification' }, { status: 500 })
    }

    // Send email
    const sendResult = await sendAdminVerificationCode({ toEmail: targetUser.email, userFullName: targetUser.full_name || undefined, code, expiresAt })
    if (!sendResult.success) {
      console.error('Failed to send admin verification email:', sendResult.error)
      return NextResponse.json({ error: sendResult.error || 'Failed to send email' }, { status: 500 })
    }

    console.log('Admin verification code created and emailed to', targetUser.email)

    // Log that an admin triggered sending a code to another admin
    try {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
      const ua = request.headers.get('user-agent') || null
      await supabase.from('admin_action_logs').insert({ action_type: 'admin_code_sent_by_admin', performed_by: currentUser.id, target_user_id: userId, ip_address: ip, user_agent: ua, metadata: { codeId: null } })
    } catch (err) {
      console.error('send-verification: failed to insert audit log', err)
    }

    return NextResponse.json({ success: true, adminUuidCreated: !!(!targetUser.admin_uuid), adminUuid: targetUser.admin_uuid || null })
  } catch (err) {
    console.error('Error in admin send-verification:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
