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
          is_public: userData.is_public ?? true,
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
          is_public: formData.is_public,
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
                        <Label htmlFor="avatarUrl">Avatar URL</Label>
                        <Input
                          id="avatarUrl"
                          type="url"
                          value={formData.avatar_url}
                          onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                          placeholder="https://eksempel.com/avatar.jpg"
                        />
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
