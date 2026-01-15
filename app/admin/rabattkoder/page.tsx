import Link from "next/link"
import { Plus, Edit, Tag, Percent, Trash2, MoreHorizontal, Copy, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

async function getDiscountCodes() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.from("discount_codes").select("*").order("created_at", { ascending: false })

  if (error) return []
  return data || []
}

export default async function DiscountCodesPage() {
  const codes = await getDiscountCodes()
  const activeCount = codes.filter(code => {
    return (!code.valid_from || new Date(code.valid_from) <= new Date()) &&
           (!code.valid_until || new Date(code.valid_until) >= new Date()) &&
           (!code.max_uses || code.current_uses < code.max_uses)
  }).length

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rabattkoder</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {codes.length} koder • {activeCount} aktive
          </p>
        </div>
        <Button asChild size="sm" className="w-fit bg-blue-600 hover:bg-blue-700">
          <Link href="/admin/rabattkoder/ny">
            <Plus className="h-4 w-4 mr-2" />
            Ny rabattkode
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Søk etter kode..." 
              className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
            />
          </div>
        </CardContent>
      </Card>

      {codes.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <Tag className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">Ingen rabattkoder ennå</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Opprett din første rabattkode for å tilby rabatter</p>
            <Button asChild size="sm">
              <Link href="/admin/rabattkoder/ny">
                <Plus className="h-4 w-4 mr-2" />
                Opprett rabattkode
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {codes.map((code) => {
            const isActive =
              (!code.valid_from || new Date(code.valid_from) <= new Date()) &&
              (!code.valid_until || new Date(code.valid_until) >= new Date()) &&
              (!code.max_uses || code.current_uses < code.max_uses)

            const usagePercent = code.max_uses ? (code.current_uses / code.max_uses) * 100 : 0

            return (
              <Card key={code.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {code.code}
                        </code>
                        <Badge 
                          variant={isActive ? "default" : "secondary"}
                          className={isActive ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {isActive ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <Percent className="h-3.5 w-3.5" />
                        {code.type === "percentage" ? `${code.value}% rabatt` : `${code.value} kr rabatt`}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="flex items-center gap-2">
                          <Copy className="h-4 w-4" />
                          Kopier kode
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/rabattkoder/${code.id}`} className="flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            Rediger
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 dark:text-red-400">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Slett
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Usage bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Brukt {code.current_uses} av {code.max_uses || "∞"}</span>
                      {code.max_uses && <span>{Math.round(usagePercent)}%</span>}
                    </div>
                    {code.max_uses && (
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Expiry */}
                  {code.valid_until && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      Utløper: {new Date(code.valid_until).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}
