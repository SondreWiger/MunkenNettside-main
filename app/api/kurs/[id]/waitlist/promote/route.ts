import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

// POST - Promote next person from kurs waitlist
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getSupabaseAdminClient()
    const kursId = params.id

    // Get kurs info
    const { data: kurs, error: kursError } = await supabase
      .from('kurs')
      .select('max_participants, current_participants, auto_accept_enabled, waitlist_enabled, title')
      .eq('id', kursId)
      .single()

    if (kursError) throw kursError

    if (!kurs.waitlist_enabled) {
      return NextResponse.json({ error: 'Waitlist not enabled' }, { status: 400 })
    }

    if (kurs.current_participants >= kurs.max_participants) {
      return NextResponse.json({ error: 'Kurs is full' }, { status: 400 })
    }

    // Get next person on waitlist
    const { data: nextInLine, error: waitlistError } = await supabase
      .from('kurs_waitlist')
      .select('*, user:users(id, full_name, email)')
      .eq('kurs_id', kursId)
      .eq('status', 'waiting')
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (waitlistError || !nextInLine) {
      return NextResponse.json({ error: 'No one on waitlist' }, { status: 404 })
    }

    if (kurs.auto_accept_enabled) {
      // Auto-accept: directly enroll
      const { data: enrollment, error: enrollError } = await supabase
        .from('kurs_enrollments')
        .insert({
          kurs_id: kursId,
          user_id: nextInLine.user_id,
          status: 'confirmed',
          enrolled_at: new Date().toISOString()
        })
        .select()
        .single()

      if (enrollError) throw enrollError

      // Increment current_participants
      await supabase
        .from('kurs')
        .update({ current_participants: kurs.current_participants + 1 })
        .eq('id', kursId)

      // Remove from waitlist
      await supabase
        .from('kurs_waitlist')
        .delete()
        .eq('id', nextInLine.id)

      // Send email notification
      const { sendWaitlistEmail } = await import('@/lib/email/send-waitlist-email')
      await sendWaitlistEmail({
        recipientEmail: nextInLine.user.email,
        recipientName: nextInLine.user.full_name,
        entityType: 'kurs',
        entityTitle: kurs.title || 'Kurs',
        entityId: kursId,
        action: 'promoted_auto'
      })

      return NextResponse.json({ 
        promoted: true, 
        autoAccepted: true,
        enrollment,
        user: nextInLine.user 
      })
    } else {
      // Manual accept: send offer
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 48) // 48 hour offer

      const { error: updateError } = await supabase
        .from('kurs_waitlist')
        .update({
          status: 'offered',
          offered_at: new Date().toISOString(),
          offer_expires_at: expiresAt.toISOString()
        })
        .eq('id', nextInLine.id)

      if (updateError) throw updateError

      // Send email with accept link
      const { sendWaitlistEmail } = await import('@/lib/email/send-waitlist-email')
      await sendWaitlistEmail({
        recipientEmail: nextInLine.user.email,
        recipientName: nextInLine.user.full_name,
        entityType: 'kurs',
        entityTitle: kurs.title || 'Kurs',
        entityId: kursId,
        action: 'promoted_offer',
        offerExpiresAt: expiresAt.toISOString()
      })

      return NextResponse.json({ 
        promoted: true, 
        autoAccepted: false,
        waitlistEntry: nextInLine,
        offerExpiresAt: expiresAt
      })
    }
  } catch (error: any) {
    console.error('Error promoting from kurs waitlist:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
