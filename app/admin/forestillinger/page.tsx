import Link from "next/link"
import { Plus, Edit, Eye, Calendar, MapPin, Clock, Users, MoreHorizontal, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { formatPrice } from "@/lib/utils/booking"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

async function getShows() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from("shows")
    .select(`
      *,
      ensemble:ensemble_id (title, slug),
      venue:venue_id (name)
    `)
    .order("show_datetime", { ascending: true })

  if (error) {
    console.log("[v0] Shows fetch error:", error.message)
    return []
  }
  return data || []
}

const statusLabels: Record<string, string> = {
  draft: "Kladd",
  scheduled: "Planlagt",
  on_sale: "I salg",
  sold_out: "Utsolgt",
  completed: "Fullført",
  cancelled: "Kansellert",
}

const statusConfig: Record<string, { className: string }> = {
  draft: { className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  scheduled: { className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  on_sale: { className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  sold_out: { className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  completed: { className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  cancelled: { className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 line-through" },
}

export default async function ShowsPage() {
  const shows = await getShows()
  
  // Group shows by upcoming vs past
  const now = new Date()
  const upcomingShows = shows.filter(s => new Date(s.show_datetime) >= now)
  const pastShows = shows.filter(s => new Date(s.show_datetime) < now)

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Forestillinger</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {upcomingShows.length} kommende • {pastShows.length} tidligere
          </p>
        </div>
        <Button asChild size="sm" className="w-fit bg-blue-600 hover:bg-blue-700">
          <Link href="/admin/forestillinger/ny">
            <Plus className="h-4 w-4 mr-2" />
            Ny forestilling
          </Link>
        </Button>
      </div>

      {/* Search & Filter */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Søk etter forestilling..." 
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

      {shows.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">Ingen forestillinger ennå</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Opprett din første forestilling for å komme i gang</p>
            <Button asChild size="sm">
              <Link href="/admin/forestillinger/ny">
                <Plus className="h-4 w-4 mr-2" />
                Opprett forestilling
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Upcoming Shows */}
          {upcomingShows.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                Kommende forestillinger
              </h2>
              <div className="space-y-3">
                {upcomingShows.map((show) => (
                  <ShowCard key={show.id} show={show} />
                ))}
              </div>
            </div>
          )}
          
          {/* Past Shows */}
          {pastShows.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                Tidligere forestillinger
              </h2>
              <div className="space-y-3">
                {pastShows.slice(0, 10).map((show) => (
                  <ShowCard key={show.id} show={show} isPast />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}

function ShowCard({ show, isPast = false }: { show: any; isPast?: boolean }) {
  const config = statusConfig[show.status] || statusConfig.draft
  const showDate = new Date(show.show_datetime)
  
  return (
    <Card className={`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors ${isPast ? 'opacity-75' : ''}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Date Badge */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-center shrink-0 w-14">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                {showDate.toLocaleDateString("nb-NO", { month: "short" })}
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {showDate.getDate()}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {showDate.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            
            <div className="h-12 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          </div>

          {/* Show Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {show.ensemble?.title || show.title || "Ukjent forestilling"}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {show.team === "yellow" ? "Gult lag" : "Blått lag"}
                  </span>
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {show.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {show.venue.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {showDate.toLocaleDateString("nb-NO", { weekday: "long" })}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="outline" className={config.className}>
                {statusLabels[show.status] || show.status}
              </Badge>
              {show.is_session && (
                <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Øving
                </Badge>
              )}
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {formatPrice(show.base_price_nok)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/bestill/${show.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/forestillinger/${show.id}`} className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Rediger
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/bestill/${show.id}`} className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Se bestillingsside
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
