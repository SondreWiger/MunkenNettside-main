import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  try {
    const res = await updateSession(request)

    // Add security headers to every response
    // Note: keep headers small and compatible with existing responses
    res.headers.set('X-Frame-Options', 'DENY')
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'same-origin')
    if (process.env.NODE_ENV === 'production') {
      res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    }

    // A reasonably strict CSP that allows connecting to our Supabase backend and common hosts
    // Note: connect-src controls fetch/XHR/websocket endpoints; default-src is fallback when connect-src missing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    let supabaseOrigin = ''
    try {
      if (supabaseUrl) supabaseOrigin = new URL(supabaseUrl).origin
    } catch (e) {}

    // Build connect-src list (allow self and Supabase)
    const connectSrc = ["'self'"]
    if (supabaseOrigin) {
      connectSrc.push(supabaseOrigin)
      // Also allow project wildcard subdomains for Supabase REST/auth endpoints
      connectSrc.push('https://*.supabase.co')
    }

    const csp = [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      `connect-src ${connectSrc.join(' ')}`,
      "frame-ancestors 'none'",
    ].join('; ')

    res.headers.set('Content-Security-Policy', csp)

    return res
  } catch (error) {
    console.error("[v0] Middleware error:", error)
    // Return a basic response to prevent 500 error
    return new Response("Internal Server Error", { status: 500 })
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
