"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react"
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

export default function EditVenuePage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [venue, setVenue] = useState<any>(null)
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

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    loadVenue()
  }, [venueId])

  const loadVenue = async () => {
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", venueId)
        .single()

      if (error) throw error

      setVenue(data)
      
      setFormData({
        name: data.name || "",
        address: data.address || "",
        city: data.city || "",
        postal_code: data.postal_code || "",
        accessibility_info: data.accessibility_info || "",
        parking_info: data.parking_info || "",
        public_transport: data.public_transport || "",
      })

      // Parse images
      setImages(data.images || [])

      // Parse seat map config
      setSeatMapConfig(data.seat_map_config || null)
      
    } catch (error) {
      console.error("Error loading venue:", error)
      toast.error("Kunne ikke laste lokale")
      router.push("/admin/venues")
    } finally {
      setIsLoading(false)
    }
  }

  const calculateCapacity = (config: SimpleSeatMap | null) => {
    if (!config || !config.seats) return 0
    
    // Count all active seats (not inactive)
    return config.seats.filter(seat => seat.type !== 'inactive').length
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const capacity = calculateCapacity(seatMapConfig)

      const { error } = await supabase
        .from("venues")
        .update({
          ...formData,
          capacity,
          images,
          seat_map_config: seatMapConfig,
          updated_at: new Date().toISOString(),
        })
        .eq("id", venueId)

      if (error) throw error

      toast.success("Lokale oppdatert")
      router.push("/admin/venues")
    } catch (error) {
      console.error("Error updating venue:", error)
      toast.error("Kunne ikke oppdatere lokale")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSeatMapSave = async () => {
    setIsSaving(true)
    try {
      const capacity = calculateCapacity(seatMapConfig)

      const { error } = await supabase
        .from("venues")
        .update({
          capacity,
          seat_map_config: seatMapConfig,
          updated_at: new Date().toISOString(),
        })
        .eq("id", venueId)

      if (error) throw error

      toast.success("Setekart oppdatert")
    } catch (error) {
      console.error("Error updating seat map:", error)
      toast.error("Kunne ikke oppdatere setekart")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
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
          <h1 className="text-3xl font-bold">Rediger lokale</h1>
          <p className="text-muted-foreground">{venue?.name || "Laster..."}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic venue information */}
        <Card>
          <CardHeader>
            <CardTitle>Grunnleggende informasjon</CardTitle>
            <CardDescription>
              Oppdater navn, adresse og kontaktinformasjon
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
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">By</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Postnummer</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
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
          venueId={venueId}
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
              onSave={(config: SimpleSeatMap) => {
                setSeatMapConfig(config);
                // Don't auto-save, let user save manually with the form
              }}
              venueId={venueId}
            />
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/venues">Avbryt</Link>
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Lagrer...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Lagre endringer
              </>
            )}
          </Button>
        </div>
      </form>
    </main>
  )
}