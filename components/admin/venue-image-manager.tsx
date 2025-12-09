"use client"

import { useState, useRef } from "react"
import { Upload, X, Eye, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface VenueImage {
  url: string
  alt?: string
  caption?: string
}

interface VenueImageManagerProps {
  venueId: string
  images: VenueImage[]
  onChange: (images: VenueImage[]) => void
}

export function VenueImageManager({ venueId, images = [], onChange }: VenueImageManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showUrlForm, setShowUrlForm] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState("")
  const [newImageAlt, setNewImageAlt] = useState("")
  const [newImageCaption, setNewImageCaption] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = getSupabaseBrowserClient()

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    const newImages: VenueImage[] = []

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`Fil ${file.name} er ikke et bilde`)
          continue
        }

        // Create unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${venueId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

        const { data, error } = await supabase.storage
          .from('venue-images')
          .upload(fileName, file)

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
          .from('venue-images')
          .getPublicUrl(data.path)

        newImages.push({
          url: publicUrl,
          alt: file.name.split('.')[0],
          caption: ""
        })
      }

      const updatedImages = [...images, ...newImages]
      onChange(updatedImages)
      toast.success(`${newImages.length} bilde(r) lastet opp`)
    } catch (error) {
      console.error('Error uploading images:', error)
      toast.error('Kunne ikke laste opp bilder')
    } finally {
      setIsUploading(false)
    }
  }

  const addImageByUrl = () => {
    if (!newImageUrl.trim()) {
      toast.error('URL er påkrevd')
      return
    }

    const newImage: VenueImage = {
      url: newImageUrl.trim(),
      alt: newImageAlt.trim() || "Venue bilde",
      caption: newImageCaption.trim()
    }

    const updatedImages = [...images, newImage]
    onChange(updatedImages)
    
    setNewImageUrl("")
    setNewImageAlt("")
    setNewImageCaption("")
    setShowUrlForm(false)
    toast.success("Bilde lagt til")
  }

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index)
    onChange(updatedImages)
    toast.success("Bilde fjernet")
  }

  const updateImageData = (index: number, updates: Partial<VenueImage>) => {
    const updatedImages = images.map((img, i) => 
      i === index ? { ...img, ...updates } : img
    )
    onChange(updatedImages)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Venue bilder</CardTitle>
        <CardDescription>
          Last opp og administrer bilder for dette lokalet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload controls */}
        <div className="flex gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            variant="outline"
          >
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Laster opp...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Last opp filer
              </>
            )}
          </Button>

          <Button 
            variant="outline"
            onClick={() => setShowUrlForm(!showUrlForm)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Legg til URL
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>

        {/* URL form */}
        {showUrlForm && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="imageUrl">Bilde URL *</Label>
                <Input
                  id="imageUrl"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <Label htmlFor="imageAlt">Alt tekst</Label>
                <Input
                  id="imageAlt"
                  value={newImageAlt}
                  onChange={(e) => setNewImageAlt(e.target.value)}
                  placeholder="Beskrivelse av bildet"
                />
              </div>
              <div>
                <Label htmlFor="imageCaption">Bildetekst</Label>
                <Input
                  id="imageCaption"
                  value={newImageCaption}
                  onChange={(e) => setNewImageCaption(e.target.value)}
                  placeholder="Valgfri bildetekst"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addImageByUrl}>Legg til</Button>
                <Button variant="outline" onClick={() => setShowUrlForm(false)}>
                  Avbryt
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Images grid */}
        {images.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">Ingen bilder ennå</p>
            <p className="text-sm text-muted-foreground">
              Last opp filer eller legg til via URL
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                  <img
                    src={image.url}
                    alt={image.alt || `Venue bilde ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/api/placeholder/300/300'
                    }}
                  />
                </div>

                {/* Image controls */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeImage(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Image info */}
                <div className="mt-2">
                  <Input
                    value={image.alt || ""}
                    onChange={(e) => updateImageData(index, { alt: e.target.value })}
                    placeholder="Alt tekst"
                    className="text-xs mb-1"
                  />
                  <Input
                    value={image.caption || ""}
                    onChange={(e) => updateImageData(index, { caption: e.target.value })}
                    placeholder="Bildetekst (valgfri)"
                    className="text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}