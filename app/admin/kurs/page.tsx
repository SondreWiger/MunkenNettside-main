"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Tilbake til dashboard
          </Link>
          <h1 className="text-3xl font-bold">Administrer Kurs</h1>
        </div>
        <Button asChild>
          <Link href="/admin/kurs/ny">
            <Plus className="h-4 w-4 mr-2" />
            Nytt kurs
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Søk i kurs</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Søk etter kursnavn eller beskrivelse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Laster kurs...</p>
        </div>
      ) : filteredKurs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Ingen kurs funnet." : "Ingen kurs opprettet ennå."}
          </p>
          <Button asChild>
            <Link href="/admin/kurs/ny">Opprett første kurs</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredKurs.map((k) => (
            <Card key={k.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{k.title}</CardTitle>
                      <Badge variant={k.is_published ? "default" : "secondary"}>
                        {k.is_published ? "Publisert" : "Kladd"}
                      </Badge>
                      <Badge variant="outline">{levelLabels[k.level] || k.level}</Badge>
                      {k.featured && <Badge className="bg-yellow-500">Fremhevet</Badge>}
                    </div>
                    <CardDescription className="line-clamp-2">{k.description}</CardDescription>
                    <p className="text-sm text-muted-foreground mt-2">
                      Deltakere: {k.current_participants}/{k.max_participants || "Ubegrenset"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        togglePublished(k.id, k.is_published)
                      }}
                    >
                      {k.is_published ? (
                        <div className="flex items-center gap-1">
                          <EyeOff className="h-4 w-4" />
                          Skjul
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          Publiser
                        </div>
                      )}
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/kurs/${k.id}`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Rediger
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteKurs(k.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
