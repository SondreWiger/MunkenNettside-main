import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils/booking'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'
import dynamic from 'next/dynamic'
const RevenueChartClient = dynamic(() => import('./components/RevenueChartClient').then(m => m.RevenueChartClient), { ssr: false })
const TopShowsChartClient = dynamic(() => import('./components/TopShowsChartClient').then(m => m.TopShowsChartClient), { ssr: false })

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
    .select('id, amount, created_at')
    .eq('status', 'completed')
    .gte('created_at', since)

  const { data: kursEnrollments } = await supabase
    .from('kurs_enrollments')
    .select('id, amount_paid_nok, created_at')
    .gte('created_at', since)

  const bookingRevenue = (bookings || []).reduce((s: number, b: any) => s + (Number(b.total_amount_nok) || 0), 0)
  const purchasesRevenue = (purchases || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0)
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
    purchasesDayMap[d] = (purchasesDayMap[d] || 0) + Number(p.amount || 0)
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
    <main className="container px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Statistikk</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Månedlig omsetning</CardTitle>
            <CardDescription>Siste 30 dager (bokninger + opptak + kurs)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPrice(monthly.totalRevenue)}</div>
            <div className="mt-3"><RevenueChartClient initialData={revenueTimeseries as any} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bokninger</CardTitle>
            <CardDescription>Inntekt fra billettsalg</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPrice(monthly.bookingRevenue)}</div>
            <div className="mt-3"><RevenueChartClient initialData={revenueTimeseries as any} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opptak</CardTitle>
            <CardDescription>Inntekt fra video-salg</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPrice(monthly.purchasesRevenue)}</div>
            <div className="mt-3"><RevenueChartClient initialData={revenueTimeseries as any} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kurs</CardTitle>
            <CardDescription>Inntekt fra kurs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPrice(monthly.kursRevenue)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Brukervekst siste 30 dager</CardTitle>
          </CardHeader>
          <CardContent>
            {renderSparkline((stats as any).users.map((u: any) => 1))}
            <div className="text-sm text-muted-foreground mt-2">Totalt brukere: {(stats as any).users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Påmeldinger</CardTitle>
            <CardDescription>Kurs og ensemble påmeldinger</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div>
                <div className="text-3xl font-bold">{kursEnrollCount}</div>
                <div className="text-sm text-muted-foreground">Kurspåmeldinger</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{ensembleEnrollCount}</div>
                <div className="text-sm text-muted-foreground">Ensemblepåmeldinger</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Mest fylte forestillinger</CardTitle>
            <CardDescription>Toppliste basert på solgte seter</CardDescription>
          </CardHeader>
          <CardContent>
            <TopShowsChartClient initialData={seatFill as any} />
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Venue seat heatmaps</CardTitle>
            <CardDescription>Aggregated seat heatmaps (densely sold seats) per venue</CardDescription>
          </CardHeader>
          <CardContent>
            <VenueHeatmaps />
          </CardContent>
        </Card>
      </div>

    </main>
  )
}

async function VenueHeatmaps() {
  const heatmaps = await fetchVenueHeatmaps()

  return (
    <div className="space-y-6">
      {(heatmaps || []).map((v: any) => {
        const positions = Object.entries(v.positions || {})
        const totalOccurrences = positions.reduce((s: number, [, p]: any) => s + (p.total || 0), 0)
        const top = positions
          .map(([k, p]: any) => ({ pos: k, sold: p.sold, total: p.total, rate: p.total ? p.sold / p.total : 0 }))
          .sort((a, b) => b.sold - a.sold)
          .slice(0, 20)
        return (
          <div key={v.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">{v.name}</div>
              <div className="text-sm text-muted-foreground">Seat occurrences: {totalOccurrences}</div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {top.map((t: any) => (
                <div key={t.pos} className="p-2 rounded-md flex flex-col items-center bg-gray-50">
                  <div className="text-xs font-semibold">{t.pos.replace(/__/g, ' ')}</div>
                  <div className="w-16 h-2 bg-gray-200 mt-1 rounded overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${Math.round((t.rate || 0) * 100)}%` }} />
                  </div>
                  <div className="text-xs text-muted-foreground">{t.sold}/{t.total}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
