import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code } = body
    if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 })

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

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in verify-code:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
