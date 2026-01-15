import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

// POST - Promote next person from waitlist
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getSupabaseAdminClient()
    const ensembleId = params.id

    // Get ensemble info
    const { data: ensemble, error: ensembleError } = await supabase
      .from('ensembles')
      .select('max_actors, auto_accept_enabled, waitlist_enabled, title')
      .eq('id', ensembleId)
      .single()

    if (ensembleError) throw ensembleError

    if (!ensemble.waitlist_enabled) {
      return NextResponse.json({ error: 'Waitlist not enabled' }, { status: 400 })
    }

    // Check current enrollment count
    const { count: currentCount } = await supabase
      .from('ensemble_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('ensemble_id', ensembleId)
      .eq('status', 'confirmed')

    if (ensemble.max_actors && currentCount && currentCount >= ensemble.max_actors) {
      return NextResponse.json({ error: 'Ensemble is full' }, { status: 400 })
    }

    // Get next person on waitlist
    const { data: nextInLine, error: waitlistError } = await supabase
      .from('ensemble_waitlist')
      .select('*, user:users(id, full_name, email)')
      .eq('ensemble_id', ensembleId)
      .eq('status', 'waiting')
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (waitlistError || !nextInLine) {
      return NextResponse.json({ error: 'No one on waitlist' }, { status: 404 })
    }

    if (ensemble.auto_accept_enabled) {
      // Auto-accept: directly enroll
      const { data: enrollment, error: enrollError } = await supabase
        .from('ensemble_enrollments')
        .insert({
          ensemble_id: ensembleId,
          user_id: nextInLine.user_id,
          status: 'confirmed',
          joined_at: new Date().toISOString()
        })
        .select()
        .single()

      if (enrollError) throw enrollError

      // Remove from waitlist
      await supabase
        .from('ensemble_waitlist')
        .delete()
        .eq('id', nextInLine.id)

      // Send email notification
      const { sendWaitlistEmail } = await import('@/lib/email/send-waitlist-email')
      await sendWaitlistEmail({
        recipientEmail: nextInLine.user.email,
        recipientName: nextInLine.user.full_name,
        entityType: 'ensemble',
        entityTitle: ensemble.title || 'Ensemble',
        entityId: ensembleId,
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
        .from('ensemble_waitlist')
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
        entityType: 'ensemble',
        entityTitle: ensemble.title || 'Ensemble',
        entityId: ensembleId,
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
    console.error('Error promoting from waitlist:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
