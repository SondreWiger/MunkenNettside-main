import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getDeviceByToken } from '@/lib/admin/devices'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Missing Supabase env vars in middleware")
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Protect admin routes
    if (request.nextUrl.pathname.startsWith("/admin") && !user) {
      const url = request.nextUrl.clone()
      url.pathname = "/logg-inn"
      url.searchParams.set("redirect", request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // If the authenticated user is an admin but not yet verified and not using a trusted device,
    // force them to the login/verification flow so they cannot access other pages until verified.
    if (user) {
      try {
        const { data: userRow } = await supabase.from('users').select('role, admin_verified').eq('id', user.id).single()
        if (userRow && userRow.role === 'admin' && !userRow.admin_verified) {
          // Check for trusted device cookie (either admin_device or device cookie)
          const deviceToken = request.cookies.get('admin_device')?.value || request.cookies.get('device')?.value || null
          let deviceTrusted = false
          if (deviceToken) {
            const device = await getDeviceByToken(supabase, deviceToken)
            if (device && device.user_id === user.id && !device.revoked) deviceTrusted = true
          }

          if (!deviceTrusted) {
            // Instead of redirecting the admin away from /admin UI, set a short-lived cookie
            // that signals the frontend the user still needs verification. Sensitive API
            // endpoints will continue to enforce admin_verified or trusted-device checks.
            supabaseResponse.cookies.set('admin_verification_required', '1', { path: '/', maxAge: 60 * 5 })
          } else {
            // Clear flag when device trusted
            supabaseResponse.cookies.set('admin_verification_required', '', { path: '/', maxAge: 0 })
          }
        }
      } catch (err) {
        // ignore errors in this check and allow request to proceed
        console.error('middleware admin verification check failed:', err)
      }
    }

    // Protect user routes
    if (
      (request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/billetter") ||
        request.nextUrl.pathname.startsWith("/se/")) &&
      !user
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/logg-inn"
      url.searchParams.set("redirect", request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (error) {
    console.error("[v0] Error in updateSession:", error)
    return supabaseResponse
  }
}
