"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { VenueImageManager } from "@/components/admin/venue-image-manager"
import { SimpleSeatMapEditor, type SimpleSeatMap } from "@/components/admin/simple-seat-map-editor"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface VenueImage {
  url: string
  alt?: string
  caption?: string
}

export default function NewVenuePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    postal_code: "",
    accessibility_info: "",
    parking_info: "",
    public_transport: "",
  })
  const [images, setImages] = useState<VenueImage[]>([])
  const [seatMapConfig, setSeatMapConfig] = useState<SimpleSeatMap | null>(null)
  const [tempVenueId] = useState(() => `temp-${Date.now()}`)

  const supabase = getSupabaseBrowserClient()

  const calculateCapacity = (config: SimpleSeatMap | null) => {
    if (!config || !config.seats) return 0
    
    // Count all active seats (not inactive)
    return config.seats.filter(seat => seat.type !== 'inactive').length
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error("Navn er påkrevd")
      return
    }
    
    setIsLoading(true)

    try {
      const capacity = calculateCapacity(seatMapConfig)

      const { data, error } = await supabase.from("venues").insert({
        name: formData.name,
        address: formData.address || null,
        city: formData.city || null,
        postal_code: formData.postal_code || null,
        accessibility_info: formData.accessibility_info || null,
        parking_info: formData.parking_info || null,
        public_transport: formData.public_transport || null,
        capacity,
        images,
        seat_map_config: seatMapConfig,
      }).select().single()

      if (error) throw error

      toast.success("Nytt lokale opprettet")
      router.push("/admin/venues")
    } catch (error) {
      console.error("Error creating venue:", error)
      toast.error("Kunne ikke opprette lokale")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="container px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/venues">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nytt lokale</h1>
          <p className="text-muted-foreground">Opprett et nytt lokale med seteplan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic venue information */}
        <Card>
          <CardHeader>
            <CardTitle>Grunnleggende informasjon</CardTitle>
            <CardDescription>
              Fyll inn navn, adresse og kontaktinformasjon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Navn *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="f.eks. Hovedscenen"
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">By</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="f.eks. Oslo"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="f.eks. Teaterveien 1"
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Postnummer</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="f.eks. 0123"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="accessibility_info">Tilgjengelighet</Label>
              <Input
                id="accessibility_info"
                value={formData.accessibility_info}
                onChange={(e) => setFormData({ ...formData, accessibility_info: e.target.value })}
                placeholder="Rullestoltilgang, HC-toalett, etc."
              />
            </div>

            <div>
              <Label htmlFor="parking_info">Parkering</Label>
              <Input
                id="parking_info"
                value={formData.parking_info}
                onChange={(e) => setFormData({ ...formData, parking_info: e.target.value })}
                placeholder="Parkeringsmuligheter"
              />
            </div>

            <div>
              <Label htmlFor="public_transport">Kollektivtransport</Label>
              <Input
                id="public_transport"
                value={formData.public_transport}
                onChange={(e) => setFormData({ ...formData, public_transport: e.target.value })}
                placeholder="Nærmeste holdeplass/stasjon"
              />
            </div>
          </CardContent>
        </Card>

        {/* Venue images */}
        <VenueImageManager
          venueId={tempVenueId}
          images={images}
          onChange={setImages}
        />

        {/* Seat map editor */}
        <Card>
          <CardHeader>
            <CardTitle>Setekart</CardTitle>
            <CardDescription>
              Tegn og konfigurer seteplasseringen for dette lokalet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleSeatMapEditor
              initialMap={seatMapConfig || undefined}
              onSave={setSeatMapConfig}
              venueId={tempVenueId}
            />
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/venues">Avbryt</Link>
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Oppretter...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Opprett lokale
              </>
            )}
          </Button>
        </div>
      </form>
    </main>
  )
}