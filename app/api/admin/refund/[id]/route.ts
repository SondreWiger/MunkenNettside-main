import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

// GET - Check refund eligibility for a purchase
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getSupabaseAdminClient()
    
    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['admin', 'superadmin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const purchaseId = params.id

    // Get purchase with related data
    const { data: purchase, error } = await supabase
      .from('purchases')
      .select(`
        *,
        transactions(*),
        bookings(*, show:shows(title, show_datetime)),
        kurs_enrollments(*, kurs:kurs(title)),
        ensemble_enrollments(*, ensemble:ensembles(title))
      `)
      .eq('id', purchaseId)
      .single()

    if (error || !purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    // Check refund eligibility based on status
    const isEligible = purchase.status === 'completed'
    const alreadyRefunded = purchase.status === 'refunded'
    
    // Get successful transaction
    const successfulTransaction = purchase.transactions?.find(
      (t: any) => t.status === 'succeeded'
    )

    // Determine refund policy based on purchase type
    let refundPolicy = 'standard' // full refund on cancellation only
    let canRefund = isEligible
    let refundReason = ''

    // Check if show/kurs/ensemble has been cancelled
    if (purchase.bookings) {
      const show = purchase.bookings[0]?.show
      if (show) {
        refundReason = `Forestilling: ${show.title}`
        // Could add show cancellation check here
      }
    } else if (purchase.kurs_enrollments) {
      const kurs = purchase.kurs_enrollments[0]?.kurs
      if (kurs) {
        refundReason = `Kurs: ${kurs.title}`
      }
    } else if (purchase.ensemble_enrollments) {
      const ensemble = purchase.ensemble_enrollments[0]?.ensemble
      if (ensemble) {
        refundReason = `Ensemble: ${ensemble.title}`
      }
    }

    return NextResponse.json({
      purchaseId: purchase.id,
      status: purchase.status,
      amount: purchase.total_amount_nok,
      processor: successfulTransaction?.processor || 'unknown',
      isEligible: canRefund,
      alreadyRefunded,
      refundPolicy,
      refundReason,
      purchaseDate: purchase.created_at,
      transactionId: successfulTransaction?.id,
      relatedItem: purchase.bookings?.[0] || purchase.kurs_enrollments?.[0] || purchase.ensemble_enrollments?.[0]
    })
  } catch (error: any) {
    console.error('Refund check error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
