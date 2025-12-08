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
import { SeatMapEditor } from "@/components/admin/seat-map-editor"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function EditVenuePage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [venue, setVenue] = useState<any>(null)
  const [seatMapConfig, setSeatMapConfig] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    postal_code: "",
    rows: 10,
    seatsPerRow: 10,
  })

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
      
      // Parse seat map config
      const config = data.seat_map_config || {}
      console.log("[v0] Loaded venue config:", {
        rows: config.rows,
        cols: config.cols,
        blockedSeats: config.blockedSeats,
        handicapSeats: config.handicapSeats,
        fullConfig: JSON.stringify(config)
      })
      setSeatMapConfig(config)
      
      setFormData({
        name: data.name || "",
        address: data.address || "",
        city: data.city || "",
        postal_code: data.postal_code || "",
        rows: config.rows || 10,
        seatsPerRow: config.cols || 10,
      })
    } catch (error) {
      console.error("[v0] Error loading venue:", error)
      toast.error("Kunne ikke laste lokale")
      router.push("/admin/venues")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSeatMapChange = (config: any) => {
    console.log("[v0] handleSeatMapChange called with:", config)
    setSeatMapConfig(config)
    // Don't show toast here - the editor shows its own message
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Calculate total capacity from config
      const totalSeats = (seatMapConfig?.rows || 0) * (seatMapConfig?.cols || 0)
      const blockedCount = (seatMapConfig?.blockedSeats || []).length
      const totalCapacity = totalSeats - blockedCount

      console.log("[v0] Saving venue with seat config:", {
        rows: seatMapConfig?.rows,
        cols: seatMapConfig?.cols,
        blockedSeats: seatMapConfig?.blockedSeats,
        handicapSeats: seatMapConfig?.handicapSeats,
      })

      const { error } = await supabase
        .from("venues")
        .update({
          name: formData.name,
          address: formData.address || null,
          city: formData.city || null,
          postal_code: formData.postal_code || null,
          capacity: totalCapacity,
          seat_map_config: seatMapConfig,
        })
        .eq("id", venueId)

      if (error) throw error

      toast.success("Lokale oppdatert!")
      router.push("/admin/venues")
    } catch (error) {
      console.error("[v0] Error:", error)
      toast.error(error instanceof Error ? error.message : "Kunne ikke oppdatere lokale")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Er du sikker på at du vil slette dette lokalet?")) return

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from("venues")
        .delete()
        .eq("id", venueId)

      if (error) throw error

      toast.success("Lokale slettet!")
      router.push("/admin/venues")
    } catch (error) {
      console.error("[v0] Error:", error)
      toast.error(error instanceof Error ? error.message : "Kunne ikke slette lokale")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <main className="container px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </main>
    )
  }

  if (!venue) {
    return (
      <main className="container px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Lokale ikke funnet</p>
          <Button asChild>
            <Link href="/admin/venues">Tilbake til lokaler</Link>
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="container px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/venues">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Rediger lokale</h1>
          <p className="text-muted-foreground">{venue.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Lokaleinformasjon</CardTitle>
            <CardDescription>Rediger informasjon om lokalet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Navn *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="F.eks. Hovedscenen"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                placeholder="Gateadresse"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postnummer</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData((p) => ({ ...p, postal_code: e.target.value }))}
                  placeholder="0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">By</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                  placeholder="Oslo"
                />
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Totalt antall seter: <strong>{((seatMapConfig?.rows || 0) * (seatMapConfig?.cols || 0)) - (seatMapConfig?.blockedSeats?.length || 0)}</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seat Map Editor */}
        {seatMapConfig && (
          <div className="mt-8">
            <SeatMapEditor
              initialConfig={seatMapConfig}
              onSave={handleSeatMapChange}
            />
          </div>
        )}

        <div className="flex justify-between gap-4 mt-6">
          <Button 
            type="button" 
            variant="destructive"
            onClick={handleDelete}
            disabled={isSaving}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Slett lokale
          </Button>
          <div className="flex gap-4">
            <Button asChild variant="outline">
              <Link href="/admin/venues">Avbryt</Link>
            </Button>
            <Button type="submit" disabled={isSaving || !formData.name}>
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
        </div>
      </form>
    </main>
  )
}
