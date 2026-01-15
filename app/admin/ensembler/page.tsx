import Link from "next/link"
import { Plus, Edit, Eye, Trash2, Film, Search, MoreHorizontal } from "lucide-react"
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

export const dynamic = "force-dynamic"

async function getEnsembles() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from("ensembles")
    .select("*, recordings(count)")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Ensembles fetch error:", error.message)
    return []
  }
  return data || []
}

const stageColors: Record<string, string> = {
  "Påmelding": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Audition": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Øving": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Forestilling": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Arkivert": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
}

export default async function EnsemblesPage() {
  const ensembles = await getEnsembles()
  const publishedCount = ensembles.filter(e => e.is_published).length

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ensembler</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {ensembles.length} ensembler • {publishedCount} publisert
          </p>
        </div>
        <Button asChild size="sm" className="w-fit bg-blue-600 hover:bg-blue-700">
          <Link href="/admin/ensembler/ny">
            <Plus className="h-4 w-4 mr-2" />
            Nytt ensemble
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Søk etter ensemble..." 
              className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
            />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {ensembles.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <Film className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">Ingen ensembler ennå</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Kom i gang ved å opprette ditt første ensemble</p>
            <Button asChild size="sm">
              <Link href="/admin/ensembler/ny">
                <Plus className="h-4 w-4 mr-2" />
                Opprett ensemble
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ensembles.map((ensemble) => (
            <Card key={ensemble.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors overflow-hidden">
              <div className="flex">
                {/* Thumbnail */}
                {ensemble.thumbnail_url ? (
                  <div className="w-24 sm:w-32 shrink-0">
                    <img
                      src={ensemble.thumbnail_url}
                      alt={ensemble.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 sm:w-32 shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Film className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  </div>
                )}
                
                {/* Content */}
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{ensemble.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {ensemble.year} • {Array.isArray(ensemble.genre) ? ensemble.genre.join(", ") : ensemble.genre}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/ensemble/${ensemble.slug}`} className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Se side
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/ensembler/${ensemble.id}`} className="flex items-center gap-2">
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
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <Badge 
                      variant={ensemble.is_published ? "default" : "secondary"} 
                      className={ensemble.is_published ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {ensemble.is_published ? "Publisert" : "Kladd"}
                    </Badge>
                    {ensemble.stage && (
                      <Badge variant="outline" className={stageColors[ensemble.stage] || ""}>
                        {ensemble.stage}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-slate-500">
                      {ensemble.recordings?.[0]?.count || 0} opptak
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
