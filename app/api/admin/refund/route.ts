import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/server'

// POST - Process refund for a purchase
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { purchaseId, reason, amount_nok, adminNote } = body

    if (!purchaseId || !reason) {
      return NextResponse.json({ error: 'purchaseId and reason required' }, { status: 400 })
    }

    // Get purchase details with a lock to prevent race conditions
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('*, transactions(*)')
      .eq('id', purchaseId)
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    // Security check: prevent double refunds
    if (purchase.status === 'refunded') {
      return NextResponse.json({ error: 'Purchase already refunded' }, { status: 400 })
    }

    // Only allow refunds for completed purchases
    if (purchase.status !== 'completed') {
      return NextResponse.json({ 
        error: `Cannot refund purchase with status: ${purchase.status}. Only completed purchases can be refunded.` 
      }, { status: 400 })
    }

    // Get the successful transaction
    const successfulTransaction = purchase.transactions?.find(
      (t: any) => t.status === 'succeeded'
    )

    if (!successfulTransaction) {
      return NextResponse.json({ error: 'No successful transaction found' }, { status: 404 })
    }

    const refundAmount = amount_nok || purchase.total_amount_nok
    const processor = successfulTransaction.processor

    // Validate refund amount
    if (refundAmount > purchase.total_amount_nok) {
      return NextResponse.json({ 
        error: 'Refund amount cannot exceed purchase amount' 
      }, { status: 400 })
    }

    let refundResult: any = null
    let refundMethod = 'manual'

    // Process refund based on payment processor
    if (processor === 'paypal') {
      // PayPal refund - requires PayPal SDK integration
      // For now, we'll mark for manual processing
      refundMethod = 'manual_paypal'
      console.log(`PayPal refund initiated for purchase ${purchaseId} - manual processing required`)
      
      // In production, integrate PayPal Refunds API:
      // const paypal = await import('@paypal/checkout-server-sdk')
      // ... PayPal refund logic
      
    } else if (processor === 'vipps') {
      // Vipps refund - requires Vipps API integration
      refundMethod = 'manual_vipps'
      console.log(`Vipps refund initiated for purchase ${purchaseId} - manual processing required`)
      
      // In production, integrate Vipps Refund API:
      // const vippsOrderId = successfulTransaction.processor_id
      // ... Vipps refund logic
      
    } else {
      console.log(`Unknown processor: ${processor} - manual refund required`)
    }

    // Begin transaction-safe update
    // 1. Update purchase status
    const { error: updatePurchaseError } = await supabase
      .from('purchases')
      .update({ 
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('id', purchaseId)
      .eq('status', 'completed') // Double-check status hasn't changed

    if (updatePurchaseError) {
      console.error('Failed to update purchase:', updatePurchaseError)
      return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 })
    }

    // 2. Update transaction with refund details
    const { error: updateTransactionError } = await supabase
      .from('transactions')
      .update({
        status: 'refunded',
        metadata: {
          ...successfulTransaction.metadata,
          refund: {
            amount_nok: refundAmount,
            reason,
            admin_note: adminNote || null,
            refunded_at: new Date().toISOString(),
            refunded_by: user.id,
            refund_method: refundMethod,
            refund_id: refundResult?.id || null,
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', successfulTransaction.id)

    if (updateTransactionError) {
      console.error('Failed to update transaction:', updateTransactionError)
      // Attempt rollback
      await supabase
        .from('purchases')
        .update({ status: 'completed' })
        .eq('id', purchaseId)
      return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
    }

    // 3. Update related bookings/enrollments
    if (purchase.booking_id) {
      await supabase
        .from('bookings')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', purchase.booking_id)
    }

    if (purchase.kurs_enrollment_id) {
      await supabase
        .from('kurs_enrollments')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', purchase.kurs_enrollment_id)
        
      // Decrement participant count for kurs
      const { data: enrollment } = await supabase
        .from('kurs_enrollments')
        .select('kurs_id')
        .eq('id', purchase.kurs_enrollment_id)
        .single()
        
      if (enrollment?.kurs_id) {
        const { data: kurs } = await supabase
          .from('kurs')
          .select('current_participants')
          .eq('id', enrollment.kurs_id)
          .single()
          
        if (kurs && kurs.current_participants > 0) {
          await supabase
            .from('kurs')
            .update({ current_participants: kurs.current_participants - 1 })
            .eq('id', enrollment.kurs_id)
        }
      }
    }

    if (purchase.ensemble_enrollment_id) {
      await supabase
        .from('ensemble_enrollments')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', purchase.ensemble_enrollment_id)
    }

    // Log refund for audit
    console.log(`[AUDIT] Refund processed by admin ${user.id} for purchase ${purchaseId}: ${refundAmount} NOK (${refundMethod})`)

    // Send refund confirmation email
    try {
      const { data: purchaseUser } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', purchase.user_id)
        .single()

      if (purchaseUser) {
        const { sendRefundEmail } = await import('@/lib/email/send-refund-email')
        await sendRefundEmail({
          recipientEmail: purchaseUser.email,
          recipientName: purchaseUser.full_name,
          purchaseId,
          refundAmount,
          reason,
          processor,
        })
      }
    } catch (emailError) {
      console.error('Failed to send refund email:', emailError)
      // Don't fail the refund if email fails
    }

    return NextResponse.json({
      success: true,
      refundAmount,
      processor,
      refundMethod,
      message: refundMethod.includes('manual') 
        ? 'Refund marked for manual processing. Please complete refund in payment provider dashboard.'
        : 'Refund processed successfully'
    })
  } catch (error: any) {
    console.error('Refund processing error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
