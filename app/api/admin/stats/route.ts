import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    // Check auth and admin role
    const serverSupabase = await getSupabaseServerClient()
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()
    if (!user) return NextResponse.json({ status: 'error', message: 'Ikke autorisert' }, { status: 401 })

    const adminSupabase = await getSupabaseAdminClient()
    const { data: profile } = await adminSupabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ status: 'error', message: 'Ikke autorisert' }, { status: 403 })

    const supabase = adminSupabase

    // In-memory cache (short-lived). Useful to avoid heavy DB queries when admins
    // refresh repeatedly. TTL set to 30s.
    const TTL = 30 * 1000 // milliseconds
    // @ts-ignore
    ;(globalThis as any).__admin_stats_cache = (globalThis as any).__admin_stats_cache || { ts: 0, data: null }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const cache = (globalThis as any).__admin_stats_cache
    if (Date.now() - cache.ts < TTL && !new URL(request.url).searchParams.get('force')) {
      return NextResponse.json(cache.data)
    }

    // Total revenue by source: bookings, purchases (recordings), kurs
    const { data: bookingsRevenueData } = await supabase
      .from('bookings')
      .select('total_amount_nok')
      .in('status', ['confirmed', 'used'])

    const { data: purchasesRevenueData } = await supabase
      .from('purchases')
      .select('amount')
      .eq('status', 'completed')

    const { data: kursRevenueData } = await supabase
      .from('kurs_enrollments')
      .select('amount_paid_nok')
      .eq('status', 'confirmed')

    // Monthly revenue timeseries (last 30 days) - bookings and purchases
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: bookingsTimeseries } = await supabase
      .from('bookings')
      .select('booked_at, total_amount_nok')
      .in('status', ['confirmed', 'used'])
      .gte('booked_at', since)

    const { data: purchasesTimeseries } = await supabase
      .from('purchases')
      .select('created_at, amount')
      .eq('status', 'completed')
      .gte('created_at', since)

    // User signups per day last 30 days
    const { data: users } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', since)

    // Kurs and ensemble enroll counts (pending/confirmed)
    const { count: kursEnrollmentsCount } = await supabase
      .from('kurs_enrollments')
      .select('*', { count: 'exact', head: true })

    const { count: ensembleEnrollmentsCount } = await supabase
      .from('ensemble_enrollments')
      .select('*', { count: 'exact', head: true })

    // Seats fill per show - aggregate
    const { data: seats } = await supabase
      .from('seats')
      .select('show_id, status, section, row, number')

    // For budgets, pick totals
  const bookingRevenue = (bookingsRevenueData || []).reduce((s: number, b: any) => s + (parseFloat(b.total_amount_nok) || 0), 0)
  const purchaseRevenue = (purchasesRevenueData || []).reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0)
  const kursRevenue = (kursRevenueData || []).reduce((s: number, k: any) => s + (parseFloat(k.amount_paid_nok) || 0), 0)

    // Monthly timeseries aggregation into daily buckets (server side)
    const days = Array.from({ length: 30 }, (_, i) => {
      const day = new Date()
      day.setHours(0, 0, 0, 0)
      day.setDate(day.getDate() - (29 - i))
      return day.toISOString().slice(0, 10)
    })

    const bookingsDayMap: Record<string, number> = {}
    ;((bookingsTimeseries || []) as any[]).forEach((b: any) => {
      const d = (b.booked_at || '').slice(0, 10)
      if (!d) return
      bookingsDayMap[d] = (bookingsDayMap[d] || 0) + (parseFloat(b.total_amount_nok) || 0)
    })

    const purchasesDayMap: Record<string, number> = {}
    ;((purchasesTimeseries || []) as any[]).forEach((p: any) => {
      const d = (p.created_at || '').slice(0, 10)
      if (!d) return
      purchasesDayMap[d] = (purchasesDayMap[d] || 0) + (parseFloat(p.amount) || 0)
    })

    const monthlyTimeseries = days.map((day) => ({
      date: day,
      bookings: bookingsDayMap[day] || 0,
      purchases: purchasesDayMap[day] || 0,
      total: (bookingsDayMap[day] || 0) + (purchasesDayMap[day] || 0),
    }))

    // User sign-ups per day
    const usersDayMap: Record<string, number> = {}
    ;((users || []) as any[]).forEach((u: any) => {
      const d = (u.created_at || '').slice(0, 10) || new Date(u.created_at).toISOString().slice(0,10)
      usersDayMap[d] = (usersDayMap[d] || 0) + 1
    })

    const signupsTimeseries = days.map((day) => ({
      date: day,
      signups: usersDayMap[day] || 0
    }))

    // Seat fill per show
    const seatsByShow: Record<string, { total: number, sold: number }> = {}
    ;(seats || []).forEach((s: any) => {
      const showId = s.show_id
      if (!seatsByShow[showId]) seatsByShow[showId] = { total: 0, sold: 0 }
      seatsByShow[showId].total++
      if (s.status === 'sold') seatsByShow[showId].sold++
    })

    const seatFill = Object.entries(seatsByShow).map(([show_id, counts]) => ({
      show_id,
      total: counts.total,
      sold: counts.sold,
      fill_rate: counts.total ? (counts.sold / counts.total) * 100 : 0,
    }))

    // Top shows by sold seats
    seatFill.sort((a, b) => b.sold - a.sold)
    const topShows = seatFill.slice(0, 10)

    const result = {
      bookingRevenue,
      purchaseRevenue,
      kursRevenue,
      totalRevenue: (Number(bookingRevenue) || 0) + (Number(purchaseRevenue) || 0) + (Number(kursRevenue) || 0),
      monthlyTimeseries,
      signupsTimeseries,
      kursEnrollmentsCount: kursEnrollmentsCount || 0,
      ensembleEnrollmentsCount: ensembleEnrollmentsCount || 0,
      seatFill: topShows,
    }

    // Update cache
    cache.ts = Date.now()
    cache.data = result

    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
