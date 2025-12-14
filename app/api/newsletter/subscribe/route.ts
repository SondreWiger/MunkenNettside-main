import { type NextRequest, NextResponse } from 'next/server'
import { sendNewsletterSubscription } from '@/lib/email/send-newsletter-subscription'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = (body?.email || '').trim().toLowerCase()

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'Ugyldig e-postadresse' }, { status: 400 })
    }

    const result = await sendNewsletterSubscription({ email })
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Kunne ikke abonnere' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
