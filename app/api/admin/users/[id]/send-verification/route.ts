import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { sendAdminVerificationCode } from '@/lib/email/send-admin-verification'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id
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

    if (!targetUser.admin_uuid) {
      return NextResponse.json({ error: 'Target admin does not have an admin UUID' }, { status: 400 })
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

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in admin send-verification:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
