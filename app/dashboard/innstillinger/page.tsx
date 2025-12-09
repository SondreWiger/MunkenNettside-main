"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, LogOut, Copy, Check, Upload, Camera, User, Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Profile {
  id: string
  full_name: string
  email: string
  phone?: string
  profile_slug?: string
  bio_short?: string
  bio_long?: string
  avatar_url?: string
  is_public?: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio_short: "",
    bio_long: "",
    avatar_url: "",
    is_public: true,
    profile_slug: "",
  })
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [copiedSlug, setCopiedSlug] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/logg-inn")
        return
      }

      const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single()

      if (error) {
        console.error("Error loading profile:", error)
        toast.error("Kunne ikke laste profil")
        return
      }

      setProfile(profile)
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        bio_short: profile.bio_short || "",
        bio_long: profile.bio_long || "",
        avatar_url: profile.avatar_url || "",
        is_public: profile.is_public ?? true,
        profile_slug: profile.profile_slug || "",
      })
    } catch (error) {
      console.error("Error:", error)
      toast.error("Noe gikk galt")
    } finally {
      setIsLoading(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[æøå]/g, (char) => {
        const map: { [key: string]: string } = { æ: "ae", ø: "o", å: "a" }
        return map[char] || char
      })
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
  }

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      full_name: name,
      profile_slug: prev.profile_slug || generateSlug(name),
    }))
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Vennligst velg en bildefil")
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bildet er for stort. Maksimal størrelse er 5MB")
      return
    }

    setImageUploading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Ikke innlogget")
      }

      // Create a unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`

      // Upload to Supabase storage (if available)
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) {
          throw new Error("Opplasting til storage feilet. Bruker midlertidig URL.")
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(fileName)

        // Update form data
        setFormData((prev) => ({
          ...prev,
          avatar_url: publicUrl,
        }))
      } catch (storageError) {
        console.warn("Storage not available, using data URL:", storageError)
        
        // Fallback: Convert to data URL for local development
        const reader = new FileReader()
        reader.onload = (event) => {
          const result = event.target?.result as string
          setFormData((prev) => ({
            ...prev,
            avatar_url: result,
          }))
        }
        reader.readAsDataURL(file)
      }

      toast.success("Bilde lastet opp!")
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(error.message || "Kunne ikke laste opp bilde")
    } finally {
      setImageUploading(false)
    }
  }

  const saveProfile = async () => {
    if (!profile) return

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          bio_short: formData.bio_short,
          bio_long: formData.bio_long,
          avatar_url: formData.avatar_url,
          is_public: formData.is_public,
          profile_slug: formData.profile_slug,
        })
        .eq("id", profile.id)

      if (error) throw error

      toast.success("Profil oppdatert!")
      setProfile((prev) => (prev ? { ...prev, ...formData } : null))
    } catch (error: any) {
      console.error("Save error:", error)
      toast.error(error.message || "Kunne ikke lagre profil")
    } finally {
      setIsSaving(false)
    }
  }

  const updatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passordene stemmer ikke overens")
      return
    }

    if (newPassword.length < 6) {
      toast.error("Passordet må være minst 6 tegn")
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      toast.success("Passord oppdatert!")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      console.error("Password update error:", error)
      toast.error(error.message || "Kunne ikke oppdatere passord")
    }
  }

  const copyProfileLink = async () => {
    if (!formData.profile_slug) return

    const profileUrl = `${window.location.origin}/profile/${formData.profile_slug}`
    await navigator.clipboard.writeText(profileUrl)
    setCopiedSlug(true)
    toast.success("Profillenkke kopiert!")
    setTimeout(() => setCopiedSlug(false), 2000)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="text-center">Laster...</div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="hovedinnhold" className="flex-1 container py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbake til dashboard
          </Link>
          <h1 className="text-3xl font-bold">Innstillinger</h1>
          <p className="text-muted-foreground mt-2">
            Administrer din profil og kontoinnstillinger
          </p>
        </div>

        <div className="max-w-2xl">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profil
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Personvern
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Sikkerhet
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profilinformasjon</CardTitle>
                  <CardDescription>
                    Oppdater din offentlige profilinformasjon
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
                      <AvatarFallback className="text-lg">
                        {formData.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Label htmlFor="avatar-upload" className="text-sm font-medium">
                        Profilbilde
                      </Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Last opp et bilde som representerer deg
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById("avatar-upload")?.click()}
                          disabled={imageUploading}
                          className="flex items-center gap-2"
                        >
                          {imageUploading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
                              Laster opp...
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4" />
                              Bytt bilde
                            </>
                          )}
                        </Button>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="full_name">Fullt navn</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Skriv ditt fulle navn"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="+47 123 45 678"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bio_short">Kort beskrivelse</Label>
                      <Input
                        id="bio_short"
                        value={formData.bio_short}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, bio_short: e.target.value }))
                        }
                        placeholder="En kort beskrivelse av deg selv"
                        maxLength={100}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.bio_short.length}/100 tegn
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="bio_long">Utvidet beskrivelse</Label>
                      <Textarea
                        id="bio_long"
                        value={formData.bio_long}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, bio_long: e.target.value }))
                        }
                        placeholder="Fortell mer om deg selv, dine interesser og bakgrunn..."
                        rows={4}
                        maxLength={1000}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.bio_long.length}/1000 tegn
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="profile_slug">Profil-URL</Label>
                      <Input
                        id="profile_slug"
                        value={formData.profile_slug}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, profile_slug: e.target.value }))
                        }
                        placeholder="din-profil-url"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Din profil vil være tilgjengelig på: /profile/{formData.profile_slug}
                      </p>
                    </div>
                  </div>

                  <Button onClick={saveProfile} disabled={isSaving} className="w-full">
                    {isSaving ? "Lagrer..." : "Lagre endringer"}
                    <Save className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>Personverninnstillinger</CardTitle>
                  <CardDescription>
                    Kontroller hvem som kan se profilen din
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_public"
                      checked={formData.is_public}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, is_public: checked as boolean }))
                      }
                    />
                    <Label htmlFor="is_public" className="text-sm font-medium">
                      Gjør profilen min offentlig tilgjengelig
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Hvis aktivert, kan andre brukere finne og se profilen din via profil-URL.
                  </p>

                  {formData.is_public && formData.profile_slug && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <Label className="text-sm font-medium">Din offentlige profil</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="px-2 py-1 bg-background rounded text-sm flex-1">
                          {window.location.origin}/profile/{formData.profile_slug}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyProfileLink}
                          className="flex items-center gap-2"
                        >
                          {copiedSlug ? (
                            <>
                              <Check className="h-4 w-4" />
                              Kopiert
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Kopier
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button onClick={saveProfile} disabled={isSaving} className="w-full">
                    {isSaving ? "Lagrer..." : "Lagre personverninnstillinger"}
                    <Save className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Bytt passord</CardTitle>
                    <CardDescription>
                      Oppdater passordet ditt for å holde kontoen din sikker
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="new_password">Nytt passord</Label>
                      <Input
                        id="new_password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Skriv ditt nye passord"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm_password">Bekreft nytt passord</Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Skriv passordet på nytt"
                      />
                    </div>
                    <Button
                      onClick={updatePassword}
                      disabled={!newPassword || newPassword !== confirmPassword}
                    >
                      Oppdater passord
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Farlig sone</CardTitle>
                    <CardDescription>
                      Handlinger som ikke kan angres
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Logg ut
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}