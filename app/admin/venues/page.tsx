import Link from "next/link"
import { Plus, Edit, MapPin, Armchair, MoreHorizontal, Settings, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

async function getVenues() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from("venues").select("*").order("name")

  if (error) return []
  return data || []
}

export default async function VenuesPage() {
  const venues = await getVenues()
  const totalCapacity = venues.reduce((sum, v) => sum + (v.capacity || 0), 0)

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Venues</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {venues.length} lokaler • {totalCapacity} totale seter
          </p>
        </div>
        <Button asChild size="sm" className="w-fit bg-blue-600 hover:bg-blue-700">
          <Link href="/admin/venues/ny">
            <Plus className="h-4 w-4 mr-2" />
            Nytt lokale
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Søk etter lokale..." 
              className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
            />
          </div>
        </CardContent>
      </Card>

      {venues.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <MapPin className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">Ingen lokaler ennå</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Opprett ditt første lokale med setekart</p>
            <Button asChild size="sm">
              <Link href="/admin/venues/ny">
                <Plus className="h-4 w-4 mr-2" />
                Opprett lokale
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <Card key={venue.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{venue.name}</h3>
                      {venue.address && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                          {venue.address}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/venues/${venue.id}`} className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          Rediger
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/seatmap-builder?venue=${venue.id}`} className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Setekart
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Armchair className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {venue.capacity || 0} seter
                    </span>
                  </div>
                  {venue.seat_map_config && (
                    <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
                      Setekart konfigurert
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
