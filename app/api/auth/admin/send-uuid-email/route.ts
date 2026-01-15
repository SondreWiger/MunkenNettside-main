import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, adminUuid, email } = await request.json()
    
    const supabase = await getSupabaseServerClient()
    
    // Verify this is a legitimate request for an admin user
    const { data: user } = await supabase
      .from('users')
      .select('id, role, full_name')
      .eq('id', userId)
      .eq('role', 'admin')
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found or not admin' }, { status: 404 })
    }

    // Send email with admin UUID (using your email service)
    // For now, just log it - replace with actual email service
    console.log(`
=== ADMIN UUID VERIFICATION EMAIL ===
To: ${email}
Subject: Ny Admin UUID - Teateret

Hei ${user.full_name || 'Administrator'},

Din admin UUID har blitt regenerert av sikkerhetshensyn.
Din nye Admin UUID er: ${adminUuid}

Denne UUID-en utløper om 24 timer.
Du trenger denne for å logge inn som administrator.

Kontakt superadmin hvis du har problemer.

Med vennlig hilsen,
Teateret Security System
=====================================`)

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error sending admin UUID email:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}