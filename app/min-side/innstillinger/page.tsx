"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, LogOut, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Profile {
  id: string
  full_name: string
  email: string
  phone?: string
  slug?: string
  bio_short?: string
  bio_long?: string
  avatar_url?: string
  cover_image_url?: string
  profile_tint?: string
  website_url?: string
  instagram_url?: string
  facebook_url?: string
  linkedin_url?: string
  twitter_url?: string
  location?: string
  occupation?: string
  favorite_quote?: string
  is_public?: boolean
  show_email?: boolean
  show_phone?: boolean
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
    cover_image_url: "",
    profile_tint: "#6366f1",
    website_url: "",
    instagram_url: "",
    facebook_url: "",
    linkedin_url: "",
    twitter_url: "",
    location: "",
    occupation: "",
    favorite_quote: "",
    is_public: true,
    show_email: false,
    show_phone: false,
  })
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [copiedSlug, setCopiedSlug] = useState(false)

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

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single()

      if (userData) {
        setProfile(userData)
        setFormData({
          full_name: userData.full_name || "",
          phone: userData.phone || "",
          bio_short: userData.bio_short || "",
          bio_long: userData.bio_long || "",
          avatar_url: userData.avatar_url || "",
          cover_image_url: userData.cover_image_url || "",
          profile_tint: userData.profile_tint || "#6366f1",
          website_url: userData.website_url || "",
          instagram_url: userData.instagram_url || "",
          facebook_url: userData.facebook_url || "",
          linkedin_url: userData.linkedin_url || "",
          twitter_url: userData.twitter_url || "",
          location: userData.location || "",
          occupation: userData.occupation || "",
          favorite_quote: userData.favorite_quote || "",
          is_public: userData.is_public ?? true,
          show_email: userData.show_email ?? false,
          show_phone: userData.show_phone ?? false,
        })
      }
    } catch (error) {
      console.error("Error loading profile:", error)
      toast.error("Kunne ikke laste profil")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
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
          cover_image_url: formData.cover_image_url,
          profile_tint: formData.profile_tint,
          website_url: formData.website_url,
          instagram_url: formData.instagram_url,
          facebook_url: formData.facebook_url,
          linkedin_url: formData.linkedin_url,
          twitter_url: formData.twitter_url,
          location: formData.location,
          occupation: formData.occupation,
          favorite_quote: formData.favorite_quote,
          is_public: formData.is_public,
          show_email: formData.show_email,
          show_phone: formData.show_phone,
        })
        .eq("id", profile.id)

      if (error) throw error

      toast.success("Profil oppdatert!")
      setProfile({ ...profile, ...formData })
    } catch (error) {
      console.error("Error saving profile:", error)
      toast.error("Kunne ikke oppdatere profil")
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("Passordene samsvarer ikke")
      return
    }

    if (newPassword.length < 6) {
      toast.error("Passordet må være minst 6 tegn")
      return
    }

    setIsSaving(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      toast.success("Passordet ble oppdatert!")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      console.error("Error changing password:", error)
      toast.error("Kunne ikke oppdatere passordet")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Laster innstillinger...</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-muted/50 border-b">
          <div className="container px-4 py-3">
            <Link
              href="/min-side"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Tilbake til profil
            </Link>
          </div>
        </div>

        {/* Hero */}
        <section className="bg-primary text-primary-foreground py-12">
          <div className="container px-4">
            <h1 className="text-3xl md:text-4xl font-bold">Kontoinnstillinger</h1>
            <p className="mt-2 text-primary-foreground/90">Administrer din profil og sikkerhet</p>
          </div>
        </section>

        {/* Settings */}
        <section className="py-12">
          <div className="container px-4 max-w-2xl">
            <div className="space-y-6">
              {/* Profile Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Profilinformasjon</CardTitle>
                  <CardDescription>Oppdater dine personlige detaljer</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-post</Label>
                      <Input id="email" type="email" value={profile?.email || ""} disabled />
                      <p className="text-xs text-muted-foreground">E-postadressen kan ikke endres</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullName">Fullt navn</Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Ditt navn"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+47 12345678"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Sted</Label>
                      <Input
                        id="location"
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Oslo, Norge"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="occupation">Yrke/Tittel</Label>
                      <Input
                        id="occupation"
                        type="text"
                        value={formData.occupation}
                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        placeholder="Skuespiller, Student, etc."
                      />
                    </div>

                    {/* Public Profile Section */}
                    <div className="pt-4 border-t space-y-4">
                      <h3 className="font-semibold">Offentlig profil</h3>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="isPublic"
                          checked={formData.is_public}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, is_public: checked as boolean })
                          }
                        />
                        <Label htmlFor="isPublic" className="font-normal cursor-pointer">
                          Gjør profilen min offentlig
                        </Label>
                      </div>

                      {profile?.slug && (
                        <div className="space-y-2 p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Din profilURL:</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm bg-background rounded px-2 py-1 break-all">
                              teateret.no/profile/{profile.slug}
                            </code>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`https://teateret.no/profile/${profile.slug}`)
                                setCopiedSlug(true)
                                setTimeout(() => setCopiedSlug(false), 2000)
                              }}
                            >
                              {copiedSlug ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="bioShort">Kort beskrivelse</Label>
                        <Input
                          id="bioShort"
                          type="text"
                          value={formData.bio_short}
                          onChange={(e) => setFormData({ ...formData, bio_short: e.target.value })}
                          placeholder="F.eks. 'Theaterelsker fra Oslo'"
                          maxLength={160}
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.bio_short.length}/160 tegn
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bioLong">Fullstendig beskrivelse</Label>
                        <Textarea
                          id="bioLong"
                          value={formData.bio_long}
                          onChange={(e) => setFormData({ ...formData, bio_long: e.target.value })}
                          placeholder="Fortell litt om deg selv, dine interesser og erfaringer..."
                          rows={5}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="favoriteQuote">Favoritt sitat</Label>
                        <Input
                          id="favoriteQuote"
                          type="text"
                          value={formData.favorite_quote}
                          onChange={(e) => setFormData({ ...formData, favorite_quote: e.target.value })}
                          placeholder='"All the world&apos;s a stage..."'
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="avatarUrl">Avatar URL</Label>
                        <Input
                          id="avatarUrl"
                          type="url"
                          value={formData.avatar_url}
                          onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                          placeholder="https://eksempel.com/avatar.jpg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="coverImageUrl">Banner bilde URL</Label>
                        <Input
                          id="coverImageUrl"
                          type="url"
                          value={formData.cover_image_url}
                          onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                          placeholder="https://eksempel.com/banner.jpg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profileTint">Profilfarge (Hex)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="profileTint"
                            type="text"
                            value={formData.profile_tint}
                            onChange={(e) => setFormData({ ...formData, profile_tint: e.target.value })}
                            placeholder="#6366f1"
                            pattern="^#[0-9A-Fa-f]{6}$"
                          />
                          <input
                            type="color"
                            value={formData.profile_tint}
                            onChange={(e) => setFormData({ ...formData, profile_tint: e.target.value })}
                            className="w-14 h-10 rounded border cursor-pointer"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Denne fargen vil brukes som tema på din offentlige profil
                        </p>
                      </div>
                    </div>

                    {/* Social Links Section */}
                    <div className="pt-4 border-t space-y-4">
                      <h3 className="font-semibold">Sosiale medier</h3>

                      <div className="space-y-2">
                        <Label htmlFor="websiteUrl">Nettside</Label>
                        <Input
                          id="websiteUrl"
                          type="url"
                          value={formData.website_url}
                          onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                          placeholder="https://dinside.no"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="instagramUrl">Instagram</Label>
                        <Input
                          id="instagramUrl"
                          type="url"
                          value={formData.instagram_url}
                          onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                          placeholder="https://instagram.com/brukernavn"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="facebookUrl">Facebook</Label>
                        <Input
                          id="facebookUrl"
                          type="url"
                          value={formData.facebook_url}
                          onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                          placeholder="https://facebook.com/brukernavn"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="linkedinUrl">LinkedIn</Label>
                        <Input
                          id="linkedinUrl"
                          type="url"
                          value={formData.linkedin_url}
                          onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                          placeholder="https://linkedin.com/in/brukernavn"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="twitterUrl">Twitter/X</Label>
                        <Input
                          id="twitterUrl"
                          type="url"
                          value={formData.twitter_url}
                          onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                          placeholder="https://twitter.com/brukernavn"
                        />
                      </div>
                    </div>

                    {/* Privacy Section */}
                    <div className="pt-4 border-t space-y-4">
                      <h3 className="font-semibold">Personvern</h3>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="showEmail"
                          checked={formData.show_email}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, show_email: checked as boolean })
                          }
                        />
                        <Label htmlFor="showEmail" className="font-normal cursor-pointer">
                          Vis e-post på min offentlige profil
                        </Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="showPhone"
                          checked={formData.show_phone}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, show_phone: checked as boolean })
                          }
                        />
                        <Label htmlFor="showPhone" className="font-normal cursor-pointer">
                          Vis telefon på min offentlige profil
                        </Label>
                      </div>
                    </div>

                    <Button type="submit" disabled={isSaving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {isSaving ? "Lagrer..." : "Lagre endringer"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Sikkerhet</CardTitle>
                  <CardDescription>Endre passordet ditt</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nytt passord</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minst 6 tegn"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Bekreft passord</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Gjenta passordet"
                      />
                    </div>

                    <Button type="submit" disabled={isSaving || !newPassword} className="gap-2">
                      <Save className="h-4 w-4" />
                      {isSaving ? "Oppdaterer..." : "Endre passord"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Sign Out */}
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Logg ut</CardTitle>
                  <CardDescription>Logg ut av kontoen din på denne enheten</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleSignOut}
                    variant="destructive"
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logg ut
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
