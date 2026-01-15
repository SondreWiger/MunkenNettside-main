"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Edit, Trash2, Eye, EyeOff, GraduationCap, Search, Users, MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Kurs {
  id: string
  title: string
  slug: string
  description: string
  level: string
  max_participants: number
  current_participants: number
  is_published: boolean
  featured: boolean
  created_at: string
}

export default function KursListPage() {
  const [kurs, setKurs] = useState<Kurs[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    loadKurs()
  }, [])

  const loadKurs = async () => {
    try {
      const { data, error } = await supabase
        .from("kurs")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setKurs(data || [])
    } catch (error) {
      console.error("Feil ved lasting av kurs:", error)
      toast.error("Kunne ikke laste kurs")
    } finally {
      setIsLoading(false)
    }
  }

  const togglePublished = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("kurs")
        .update({ is_published: !currentStatus })
        .eq("id", id)

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      setKurs(kurs.map((k) => (k.id === id ? { ...k, is_published: !currentStatus } : k)))
      toast.success(!currentStatus ? "Kurs publisert" : "Kurs skjult")
    } catch (error) {
      console.error("Feil ved oppdatering:", error)
      toast.error("Kunne ikke oppdatere kurs")
    }
  }

  const deleteKurs = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette dette kurset?")) return

    try {
      const { error } = await supabase.from("kurs").delete().eq("id", id)

      if (error) throw error

      setKurs(kurs.filter((k) => k.id !== id))
      toast.success("Kurs slettet")
    } catch (error) {
      console.error("Feil ved sletting:", error)
      toast.error("Kunne ikke slette kurs")
    }
  }

  const filteredKurs = kurs.filter(
    (k) =>
      k.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const levelLabels: Record<string, string> = {
    beginner: "Nybegynner",
    intermediate: "Mellomliggende",
    advanced: "Avansert",
    mixed: "Blandet",
  }

  const levelColors: Record<string, string> = {
    beginner: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    intermediate: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    advanced: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    mixed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  }

  const publishedCount = kurs.filter(k => k.is_published).length

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kurs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {kurs.length} kurs • {publishedCount} publisert
          </p>
        </div>
        <Button asChild size="sm" className="w-fit bg-blue-600 hover:bg-blue-700">
          <Link href="/admin/kurs/ny">
            <Plus className="h-4 w-4 mr-2" />
            Nytt kurs
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Søk etter kurs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm text-slate-500">Laster kurs...</p>
          </CardContent>
        </Card>
      ) : filteredKurs.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <GraduationCap className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">
              {searchTerm ? "Ingen kurs funnet" : "Ingen kurs ennå"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {searchTerm ? "Prøv et annet søk" : "Opprett ditt første kurs for å komme i gang"}
            </p>
            {!searchTerm && (
              <Button asChild size="sm">
                <Link href="/admin/kurs/ny">
                  <Plus className="h-4 w-4 mr-2" />
                  Opprett kurs
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredKurs.map((k) => {
            const fillPercent = k.max_participants ? (k.current_participants / k.max_participants) * 100 : 0
            
            return (
              <Card key={k.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{k.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {k.description}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => togglePublished(k.id, k.is_published)}>
                          {k.is_published ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Skjul kurs
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Publiser
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/kurs/${k.id}`} className="flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            Rediger
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteKurs(k.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Slett
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <Badge 
                      variant={k.is_published ? "default" : "secondary"}
                      className={k.is_published ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {k.is_published ? "Publisert" : "Kladd"}
                    </Badge>
                    <Badge variant="outline" className={levelColors[k.level] || levelColors.mixed}>
                      {levelLabels[k.level] || k.level}
                    </Badge>
                    {k.featured && (
                      <Badge className="bg-amber-500 hover:bg-amber-600">Fremhevet</Badge>
                    )}
                  </div>

                  {/* Participants */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Users className="h-4 w-4" />
                        Deltakere
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {k.current_participants}/{k.max_participants || "∞"}
                      </span>
                    </div>
                    {k.max_participants > 0 && (
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            fillPercent >= 90 ? 'bg-red-500' : fillPercent >= 70 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(fillPercent, 100)}%` }}
                        />
                      </div>
                    )}
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
