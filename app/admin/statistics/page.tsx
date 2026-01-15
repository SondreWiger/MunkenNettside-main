import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils/booking'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'
import { RevenueChartClient } from './components/RevenueChartClient'
import { TopShowsChartClient } from './components/TopShowsChartClient'

async function fetchStats() {
  const supabase = await getSupabaseServerClient()

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Revenue sums
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, total_amount_nok, booked_at')
    .in('status', ['confirmed', 'used'])
    .gte('booked_at', since)

  const { data: purchases } = await supabase
    .from('purchases')
    .select('id, amount_paid_nok, created_at')
    .eq('status', 'completed')
    .gte('created_at', since)

  const { data: kursEnrollments } = await supabase
    .from('kurs_enrollments')
    .select('id, amount_paid_nok, created_at')
    .gte('created_at', since)

  const bookingRevenue = (bookings || []).reduce((s: number, b: any) => s + (Number(b.total_amount_nok) || 0), 0)
  const purchasesRevenue = (purchases || []).reduce((s: number, p: any) => s + (Number(p.amount_paid_nok) || 0), 0)
  const kursRevenue = (kursEnrollments || []).reduce((s: number, k: any) => s + (Number(k.amount_paid_nok) || 0), 0)

  const monthly = {
    bookingRevenue,
    purchasesRevenue,
    kursRevenue,
    totalRevenue: bookingRevenue + purchasesRevenue + kursRevenue,
  }

  // User signups
  const { data: users } = await supabase
    .from('users')
    .select('created_at')
    .gte('created_at', since)

  // Enrollments counts
  const { count: kursEnrollCount } = await supabase.from('kurs_enrollments').select('*', { count: 'exact', head: true })
  const { count: ensembleEnrollCount } = await supabase.from('ensemble_enrollments').select('*', { count: 'exact', head: true })

  // Seat fill per show: get counts
  const { data: seats } = await supabase.from('seats').select('show_id, status')

  const seatsByShow = {} as Record<string, { total: number; sold: number }>
  (seats || []).forEach((s: any) => {
    if (!seatsByShow[s.show_id]) seatsByShow[s.show_id] = { total: 0, sold: 0 }
    seatsByShow[s.show_id].total++
    if (s.status === 'sold') seatsByShow[s.show_id].sold++
  })

  const showIds = Object.keys(seatsByShow)
  const shows: any[] = []
  if (showIds.length) {
    const { data: showsData } = await supabase
      .from('shows')
      .select('id, title, starts_at')
      .in('id', showIds)

    shows.push(...(showsData || []))
  }

  const seatFill = shows.map(s => {
    const counts = seatsByShow[s.id]
    return {
      id: s.id,
      title: s.title,
      starts_at: s.starts_at,
      total: counts.total,
      sold: counts.sold,
      fill_rate: counts.total ? (counts.sold / counts.total) * 100 : 0
    }
  }).sort((a, b) => b.sold - a.sold).slice(0, 10)

  // Build a simple daily timeseries for revenue (bookings + purchases)
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (29 - i))
    return d.toISOString().slice(0, 10)
  })

  const bookingsDayMap: Record<string, number> = {}
  ;(bookings || []).forEach((b: any) => {
    const d = (b.booked_at || '').slice(0, 10)
    if (!d) return
    bookingsDayMap[d] = (bookingsDayMap[d] || 0) + Number(b.total_amount_nok || 0)
  })

  const purchasesDayMap: Record<string, number> = {}
  ;(purchases || []).forEach((p: any) => {
    const d = (p.created_at || '').slice(0, 10)
    if (!d) return
    purchasesDayMap[d] = (purchasesDayMap[d] || 0) + Number(p.amount_paid_nok || 0)
  })

  const revenueTimeseries = days.map(day => ({
    date: day,
    bookings: bookingsDayMap[day] || 0,
    purchases: purchasesDayMap[day] || 0,
    total: (bookingsDayMap[day] || 0) + (purchasesDayMap[day] || 0)
  }))

  return {
    monthly,
    users: users || [],
    revenueTimeseries,
    kursEnrollCount: kursEnrollCount || 0,
    ensembleEnrollCount: ensembleEnrollCount || 0,
    seatFill
  }
}

// Add venue heatmap helper
async function fetchVenueHeatmaps() {
  const supabase = await getSupabaseAdminClient()

  const { data: venues } = await supabase.from('venues').select('id, name, seat_map_config')
  const { data: shows } = await supabase.from('shows').select('id, venue_id')
  const showMap: Record<string, string> = {}
  ;(shows || []).forEach((s: any) => { showMap[s.id] = s.venue_id })

  const { data: seats } = await supabase.from('seats').select('show_id, section, row, number, status')

  // Map venue->seat position -> { soldCount, totalCount }
  const venueMaps: Record<string, Record<string, { sold: number; total: number }>> = {}

  ;(seats || []).forEach((s: any) => {
    const venueId = showMap[s.show_id]
    if (!venueId) return
    if (!venueMaps[venueId]) venueMaps[venueId] = {}
    const posKey = `${s.section}__${s.row}__${s.number}`
    if (!venueMaps[venueId][posKey]) venueMaps[venueId][posKey] = { sold: 0, total: 0 }
    venueMaps[venueId][posKey].total++
    if (s.status === 'sold') venueMaps[venueId][posKey].sold++
  })

  const heatmaps = (venues || []).map((v: any) => ({
    id: v.id,
    name: v.name,
    seat_map_config: v.seat_map_config,
    positions: venueMaps[v.id] || {}
  }))

  return heatmaps
}

export default async function AdminStatisticsPage() {
  const stats = await fetchStats()

  const heatmaps = await fetchVenueHeatmaps()

  const { monthly, revenueTimeseries, kursEnrollCount, ensembleEnrollCount, seatFill } = stats as any

  // Simple SVG sparkline generator
  function renderSparkline(data: number[]) {
    const width = 300
    const height = 60
    const max = Math.max(...data, 1)
    const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${Math.round((i / (data.length - 1)) * width)} ${Math.round(height - (v / max) * height)}`).join(' ')
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-14">
        <path d={path} stroke="#4f46e5" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistikk</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Oversikt over salg, brukere og ytelse</p>
        </div>
        <Badge variant="outline" className="w-fit text-slate-500">
          <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
          Siste 30 dager
        </Badge>
      </div>

      {/* Revenue Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-100">Total omsetning</CardDescription>
            <CardTitle className="text-3xl font-bold text-white">{formatPrice(monthly.totalRevenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="opacity-80"><RevenueChartClient initialData={revenueTimeseries as any} /></div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription>Billettsalg</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">{formatPrice(monthly.bookingRevenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-500">Fra forestillinger og shows</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription>Opptakssalg</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">{formatPrice(monthly.purchasesRevenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-500">Fra video on-demand</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription>Kursinntekt</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">{formatPrice(monthly.kursRevenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-500">Fra kurspåmeldinger</div>
          </CardContent>
        </Card>
      </div>

      {/* Growth & Enrollments */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Brukervekst</CardTitle>
            <CardDescription>Nye brukere siste 30 dager</CardDescription>
          </CardHeader>
          <CardContent>
            {renderSparkline((stats as any).users.map((u: any) => 1))}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-500">Nye registreringer</span>
              <span className="font-semibold text-slate-900 dark:text-white">{(stats as any).users.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Påmeldinger</CardTitle>
            <CardDescription>Kurs og ensemble</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="text-3xl font-bold text-green-700 dark:text-green-400">{kursEnrollCount}</div>
                <div className="text-sm text-green-600 dark:text-green-500">Kurspåmeldinger</div>
              </div>
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">{ensembleEnrollCount}</div>
                <div className="text-sm text-purple-600 dark:text-purple-500">Ensemblepåmeldinger</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Shows */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Mest fylte forestillinger</CardTitle>
          <CardDescription>Rangert etter solgte seter</CardDescription>
        </CardHeader>
        <CardContent>
          <TopShowsChartClient initialData={seatFill as any} />
        </CardContent>
      </Card>

      {/* Venue Heatmaps */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Setepopularitet per lokale</CardTitle>
          <CardDescription>Aggregert data over hvilke seter som selges mest</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {(heatmaps || []).map((v: any) => {
              const positions = Object.entries(v.positions || {})
              const totalOccurrences = positions.reduce((s: number, [, p]: any) => s + (p.total || 0), 0)
              const top = positions
                .map(([k, p]: any) => ({ pos: k, sold: p.sold, total: p.total, rate: p.total ? p.sold / p.total : 0 }))
                .sort((a, b) => b.sold - a.sold)
                .slice(0, 20)
              return (
                <div key={v.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-900 dark:text-white">{v.name}</div>
                    <div className="text-sm text-slate-500">{totalOccurrences} setebookinger</div>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-2">
                    {top.map((t: any) => (
                      <div key={t.pos} className="p-2 rounded-lg flex flex-col items-center bg-slate-50 dark:bg-slate-800">
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-full">{t.pos.replace(/__/g, ' ')}</div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 mt-1 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full" style={{ width: `${Math.round((t.rate || 0) * 100)}%` }} />
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{t.sold}/{t.total}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

    </main>
  )
}


