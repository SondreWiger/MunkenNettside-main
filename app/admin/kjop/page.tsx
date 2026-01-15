import Link from "next/link"
import { Eye, Search, Download, CreditCard, Filter, Users, Calendar, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { formatPrice } from "@/lib/utils/booking"

async function getPurchases() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from("purchases")
    .select(`
      *,
      user:user_id (
        name,
        email,
        phone
      ),
      ensemble:ensemble_id (
        title
      ),
      transactions:payment_transactions (
        id,
        processor,
        amount_nok,
        status,
        created_at
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.log("[v0] Purchases fetch error:", error.message)
    return []
  }
  return data || []
}

async function getStats() {
  const supabase = await getSupabaseServerClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { count: totalCount } = await supabase.from("purchases").select("*", { count: "exact", head: true })
  const { count: todayCount } = await supabase.from("purchases").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString())
  const { count: completedCount } = await supabase.from("purchases").select("*", { count: "exact", head: true }).eq("status", "completed")
  const { data: revenueData } = await supabase.from("purchases").select("amount_paid_nok").eq("status", "completed")
  
  const totalRevenue = (revenueData || []).reduce((sum, p) => sum + (Number(p.amount_paid_nok) || 0), 0)
  
  return { totalCount: totalCount || 0, todayCount: todayCount || 0, completedCount: completedCount || 0, totalRevenue }
}

const statusLabels: Record<string, string> = {
  pending: "Venter",
  completed: "Fullført",
  failed: "Feilet",
  refunded: "Refundert",
}

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  pending: { variant: "outline", className: "border-amber-500 text-amber-600 dark:text-amber-400" },
  completed: { variant: "default", className: "bg-green-600 hover:bg-green-700" },
  failed: { variant: "destructive" },
  refunded: { variant: "secondary", className: "bg-slate-500 hover:bg-slate-600" },
}

export default async function PurchasesPage() {
  const [purchases, stats] = await Promise.all([getPurchases(), getStats()])

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kjøp & Transaksjoner</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Administrer opptakskjøp og refusjoner</p>
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
                <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completedCount}</p>
                <p className="text-xs text-slate-500">Fullført</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
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
                placeholder="Søk på navn, e-post eller transaksjon..." 
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

      {/* Purchases List */}
      {purchases.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <CreditCard className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-center">Ingen kjøp ennå</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Kjøp vil vises her når kunder kjøper opptak</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {purchases.map((purchase: any) => {
            const config = statusConfig[purchase.status] || { variant: "secondary" as const }
            const transaction = Array.isArray(purchase.transactions) && purchase.transactions.length > 0 
              ? purchase.transactions[0] 
              : null
            
            return (
              <Card key={purchase.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-slate-900 dark:text-white truncate">
                          {purchase.user?.name || "Ukjent bruker"}
                        </h3>
                        <Badge variant={config.variant} className={config.className}>
                          {statusLabels[purchase.status] || purchase.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {purchase.user?.email}
                        {purchase.user?.phone && ` • ${purchase.user?.phone}`}
                      </p>
                    </div>

                    {/* Purchase Info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">
                        {purchase.ensemble?.title || "Ukjent"}
                      </span>
                      {transaction && (
                        <span className="text-slate-500 dark:text-slate-400 capitalize">
                          {transaction.processor}
                        </span>
                      )}
                      <span className="text-slate-500 dark:text-slate-400">
                        {new Date(purchase.created_at).toLocaleDateString("nb-NO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatPrice(purchase.amount_paid_nok)}
                      </span>
                    </div>

                    {/* Action */}
                    <Button asChild variant="ghost" size="sm" className="shrink-0">
                      <Link href={`/admin/kjop/${purchase.id}`}>
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
