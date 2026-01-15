import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { sendAdminVerificationCode } from '@/lib/email/send-admin-verification'

function generateAlphanumericCode(length = 9) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export async function POST() {
  // QR-based verification has been removed. Use /api/auth/admin/request-code to request
  // a verification code be sent via email, then /api/auth/admin/verify-code to verify it.
  return NextResponse.json({ error: 'QR verification disabled. Use email code verification instead.' }, { status: 410 })
}
