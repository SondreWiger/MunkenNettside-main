import Link from "next/link"
import { 
  Film, Ticket, Users, MapPin, QrCode, Tag, Settings, TrendingUp, Calendar, Plus,
  ArrowRight, GraduationCap, Clock
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClearReservationsButtonWrapper } from "@/components/admin/clear-reservations-wrapper"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { formatPrice } from "@/lib/utils/booking"

async function getAdminData() {
  const supabase = await getSupabaseServerClient()

  try {
    const { count: ensembleCount } = await supabase.from("ensembles").select("*", { count: "exact", head: true })
    const { count: kursCount } = await supabase.from("kurs").select("*", { count: "exact", head: true })
    const { count: showCount } = await supabase
      .from("shows")
      .select("*", { count: "exact", head: true })
      .in("status", ["scheduled", "on_sale"])
    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed")
    
    // Recent bookings (last 5)
    const { data: recentBookings } = await supabase
      .from("bookings")
      .select(`
        id, customer_name, customer_email, total_amount_nok, status, created_at,
        show:show_id (show_datetime, team, ensemble:ensemble_id (title))
      `)
      .order("created_at", { ascending: false })
      .limit(5)
    
    // Upcoming shows
    const { data: upcomingShows } = await supabase
      .from("shows")
      .select(`
        id, show_datetime, team, status,
        ensemble:ensemble_id (title)
      `)
      .gte("show_datetime", new Date().toISOString())
      .order("show_datetime", { ascending: true })
      .limit(5)
    
    // Revenue for last 30 days
    const { data: recentRevenueBookings } = await supabase
      .from("bookings")
      .select("total_amount_nok")
      .in("status", ["confirmed", "used"])
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const { data: recentPurchases } = await supabase
      .from("purchases")
      .select("amount")
      .eq("status", "completed")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const { data: recentKurs } = await supabase
      .from("kurs_enrollments")
      .select("amount_paid_nok")
      .eq("status", "confirmed")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const monthlyRevenue = (recentRevenueBookings?.reduce((sum, b) => sum + (b.total_amount_nok || 0), 0) || 0)
      + (recentPurchases?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0)
      + (recentKurs?.reduce((sum, k) => sum + (k.amount_paid_nok || 0), 0) || 0)

    return {
      ensembleCount: ensembleCount || 0,
      kursCount: kursCount || 0,
      showCount: showCount || 0,
      bookingCount: bookingCount || 0,
      monthlyRevenue,
      recentBookings: recentBookings || [],
      upcomingShows: upcomingShows || [],
    }
  } catch {
    return { 
      ensembleCount: 0, kursCount: 0, showCount: 0, bookingCount: 0, monthlyRevenue: 0,
      recentBookings: [], upcomingShows: []
    }
  }
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("nb-NO", { 
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  })
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m siden`
  if (hours < 24) return `${hours}t siden`
  return `${days}d siden`
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Venter", variant: "outline" },
  confirmed: { label: "Bekreftet", variant: "default" },
  checked_in: { label: "Innsjekket", variant: "secondary" },
  cancelled: { label: "Kansellert", variant: "destructive" },
  used: { label: "Brukt", variant: "secondary" },
}

export default async function AdminDashboard() {
  const { 
    ensembleCount, kursCount, showCount, bookingCount, monthlyRevenue,
    recentBookings, upcomingShows 
  } = await getAdminData()

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Velkommen tilbake! Her er en oversikt over teateret.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ClearReservationsButtonWrapper />
          <Button asChild size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Link href="/admin/ensembler/ny">
              <Plus className="h-4 w-4 mr-1" />
              Nytt ensemble
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/kurs/ny">
              <Plus className="h-4 w-4 mr-1" />
              Nytt kurs
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Film className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{ensembleCount}</span>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Ensembler</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{kursCount}</span>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Kurs</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{showCount}</span>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Aktive show</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Ticket className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{bookingCount}</span>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Aktive billetter</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 shadow-sm col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">{formatPrice(monthlyRevenue)}</span>
            </div>
            <p className="mt-2 text-sm text-emerald-100">Siste 30 dager</p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Siste bestillinger</CardTitle>
                <CardDescription>Nylige billettkjøp</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/bestillinger" className="text-blue-600 hover:text-blue-700">
                  Se alle
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentBookings.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Ingen bestillinger ennå</p>
            ) : (
              recentBookings.map((booking: any) => (
                <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                      {booking.customer_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {booking.show?.ensemble?.title || "Ukjent"} • {formatRelativeTime(booking.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {formatPrice(booking.total_amount_nok || 0)}
                    </span>
                    <Badge variant={statusConfig[booking.status]?.variant || "outline"} className="text-xs">
                      {statusConfig[booking.status]?.label || booking.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Shows */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Kommende forestillinger</CardTitle>
                <CardDescription>Neste show på programmet</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/forestillinger" className="text-blue-600 hover:text-blue-700">
                  Se alle
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingShows.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Ingen kommende forestillinger</p>
            ) : (
              upcomingShows.map((show: any) => (
                <div key={show.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                      {show.ensemble?.title || "Ukjent produksjon"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>{formatDateTime(show.show_datetime)}</span>
                      {show.team && (
                        <>
                          <span>•</span>
                          <span>Lag {show.team}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant={show.status === "on_sale" ? "default" : "outline"} className="text-xs ml-2">
                    {show.status === "on_sale" ? "Til salgs" : "Planlagt"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Hurtighandlinger</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { name: "Ensembler", href: "/admin/ensembler", icon: Film, bg: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-400" },
            { name: "Kurs", href: "/admin/kurs", icon: GraduationCap, bg: "bg-purple-100 dark:bg-purple-900/30", iconColor: "text-purple-600 dark:text-purple-400" },
            { name: "Forestillinger", href: "/admin/forestillinger", icon: Calendar, bg: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-400" },
            { name: "Skann billetter", href: "/admin/scan", icon: QrCode, bg: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-600 dark:text-green-400" },
            { name: "Brukere", href: "/admin/brukere", icon: Users, bg: "bg-pink-100 dark:bg-pink-900/30", iconColor: "text-pink-600 dark:text-pink-400" },
            { name: "Innstillinger", href: "/admin/innstillinger", icon: Settings, bg: "bg-slate-100 dark:bg-slate-800", iconColor: "text-slate-600 dark:text-slate-400" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mb-2`}>
                    <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
