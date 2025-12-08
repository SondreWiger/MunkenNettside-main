"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function NewKursPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    director: "",
    level: "beginner",
    duration_weeks: 4,
    max_participants: 20,
    thumbnail_url: "",
    banner_url: "",
    synopsis_short: "",
    synopsis_long: "",
    price_nok: 0,
    is_published: false,
    featured: false,
  })

  const supabase = getSupabaseBrowserClient()

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-zæøå0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        toast.error("Kursnavn er påkrevd")
        setIsLoading(false)
        return
      }

      const { error } = await supabase.from("kurs").insert({
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        director: formData.director,
        level: formData.level,
        duration_weeks: formData.duration_weeks,
        max_participants: formData.max_participants,
        thumbnail_url: formData.thumbnail_url,
        banner_url: formData.banner_url,
        synopsis_short: formData.synopsis_short,
        synopsis_long: formData.synopsis_long,
        price_nok: formData.price_nok,
        is_published: formData.is_published,
        featured: formData.featured,
      })

      if (error) throw error

      toast.success("Kurs opprettet!")
      router.push("/admin/kurs")
    } catch (error) {
      console.error("Feil ved opprettelse av kurs:", error)
      toast.error("Kunne ikke opprette kurs")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/admin/kurs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Tilbake til kurs
      </Link>

      <h1 className="text-3xl font-bold mb-6">Opprett nytt kurs</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList>
            <TabsTrigger value="basic">Grunnleggende</TabsTrigger>
            <TabsTrigger value="details">Detaljer</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="publishing">Publisering</TabsTrigger>
          </TabsList>

          {/* BASIC TAB */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Grunnleggende informasjon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Kursnavn *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={handleTitleChange}
                    placeholder="f.eks. Introduksjon til teater"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL-navn (slug)</Label>
                  <Input id="slug" value={formData.slug} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Genereres automatisk fra kursnavn</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Beskrivelse</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Kort beskrivelse av kurset"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="director">Kursansvarlig/Instruktør</Label>
                  <Input
                    id="director"
                    value={formData.director}
                    onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                    placeholder="Navn på ansvarlig person"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="level">Nivå</Label>
                    <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Nybegynner</SelectItem>
                        <SelectItem value="intermediate">Mellomliggende</SelectItem>
                        <SelectItem value="advanced">Avansert</SelectItem>
                        <SelectItem value="mixed">Blandet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Varighet (uker)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration_weeks}
                      onChange={(e) => setFormData({ ...formData, duration_weeks: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_participants">Maks deltakere</Label>
                  <Input
                    id="max_participants"
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) =>
                      setFormData({ ...formData, max_participants: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DETAILS TAB */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detaljert informasjon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="synopsis_short">Kort synopsis</Label>
                  <Textarea
                    id="synopsis_short"
                    value={formData.synopsis_short}
                    onChange={(e) => setFormData({ ...formData, synopsis_short: e.target.value })}
                    placeholder="En linje eller to om kurset"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="synopsis_long">Fullstendig beskrivelse</Label>
                  <Textarea
                    id="synopsis_long"
                    value={formData.synopsis_long}
                    onChange={(e) => setFormData({ ...formData, synopsis_long: e.target.value })}
                    placeholder="Detaljert beskrivelse av kurset"
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MEDIA TAB */}
          <TabsContent value="media" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bilder og media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                  <Input
                    id="thumbnail_url"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banner_url">Banner URL</Label>
                  <Input
                    id="banner_url"
                    value={formData.banner_url}
                    onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                    placeholder="https://example.com/banner.jpg"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PUBLISHING TAB */}
          <TabsContent value="publishing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Publisering og priser</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Pris (NOK)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="10"
                    value={formData.price_nok}
                    onChange={(e) =>
                      setFormData({ ...formData, price_nok: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="font-medium">Publisert</Label>
                    <p className="text-sm text-muted-foreground">Kurset vil være synlig for brukere</p>
                  </div>
                  <Switch
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="font-medium">Fremhevet</Label>
                    <p className="text-sm text-muted-foreground">Vis prominently på nettsiden</p>
                  </div>
                  <Switch
                    checked={formData.featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-6">
          <Button asChild variant="outline">
            <Link href="/admin/kurs">Avbryt</Link>
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Oppretter..." : "Opprett kurs"}
          </Button>
        </div>
      </form>
    </div>
  )
}
