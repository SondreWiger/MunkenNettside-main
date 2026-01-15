import Link from "next/link"
import { Eye, Search, Download, Ticket, Filter, Users, CreditCard, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { formatPrice } from "@/lib/utils/booking"

async function getBookings() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      show:show_id (
        show_datetime,
        team,
        ensemble:ensemble_id (title)
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.log("[v0] Bookings fetch error:", error.message)
    return []
  }
  return data || []
}

async function getStats() {
  const supabase = await getSupabaseServerClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { count: totalCount } = await supabase.from("bookings").select("*", { count: "exact", head: true })
  const { count: todayCount } = await supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString())
  const { count: confirmedCount } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed")
  const { data: revenueData } = await supabase.from("bookings").select("total_amount_nok").in("status", ["confirmed", "checked_in"])
  
  const totalRevenue = (revenueData || []).reduce((sum, b) => sum + (Number(b.total_amount_nok) || 0), 0)
  
  return { totalCount: totalCount || 0, todayCount: todayCount || 0, confirmedCount: confirmedCount || 0, totalRevenue }
}

const statusLabels: Record<string, string> = {
  pending: "Venter",
  confirmed: "Bekreftet",
  checked_in: "Innsjekket",
  cancelled: "Kansellert",
}

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  pending: { variant: "outline", className: "border-amber-500 text-amber-600 dark:text-amber-400" },
  confirmed: { variant: "default", className: "bg-green-600 hover:bg-green-700" },
  checked_in: { variant: "secondary", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  cancelled: { variant: "destructive" },
}

export default async function BookingsPage() {
  const [bookings, stats] = await Promise.all([getBookings(), getStats()])

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bestillinger</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Administrer og følg opp alle bestillinger</p>
        </div>
        <Button variant="outline" size="sm" className="w-fit">
          <Download className="h-4 w-4 mr-2" />
          Eksporter CSV
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Ticket className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalCount}</p>
                <p className="text-xs text-slate-500">Totalt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.todayCount}</p>
                <p className="text-xs text-slate-500">I dag</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.confirmedCount}</p>
                <p className="text-xs text-slate-500">Bekreftet</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatPrice(stats.totalRevenue)}</p>
                <p className="text-xs text-slate-500">Inntekt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Søk på navn, e-post eller referanse..." 
                className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
              />
            </div>
            <Button variant="outline" size="sm" className="w-fit">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <Ticket className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-center">Ingen bestillinger ennå</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Bestillinger vil vises her når kunder kjøper billetter</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const config = statusConfig[booking.status] || { variant: "secondary" as const }
            return (
              <Card key={booking.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-slate-900 dark:text-white truncate">
                          {booking.customer_name || "Ukjent kunde"}
                        </h3>
                        <Badge variant={config.variant} className={config.className}>
                          {statusLabels[booking.status] || booking.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {booking.customer_email}
                        {booking.customer_phone && ` • ${booking.customer_phone}`}
                      </p>
                    </div>

                    {/* Show Info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">
                        {booking.show?.ensemble?.title || "Ukjent"}
                        <span className="text-slate-400 ml-1">
                          ({booking.show?.team === "yellow" ? "Gult" : "Blått"})
                        </span>
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {booking.show?.show_datetime
                          ? new Date(booking.show.show_datetime).toLocaleDateString("nb-NO", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {booking.seat_ids?.length || 0} seter
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatPrice(booking.total_amount_nok)}
                      </span>
                    </div>

                    {/* Action */}
                    <Button asChild variant="ghost" size="sm" className="shrink-0">
                      <Link href={`/admin/bestillinger/${booking.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Vis
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}
