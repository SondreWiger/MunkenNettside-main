"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, LogOut, Copy, Check, User, Palette, Share2, Lock, Eye, Star, Plus, Trash2, X, CreditCard, Users, RefreshCw, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
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
  banner_url?: string
  profile_tint?: string
  banner_style?: string
  theme_preference?: string
  profile_border_color?: string
  profile_text_color?: string
  custom_css?: string
  website_url?: string
  instagram_url?: string
  facebook_url?: string
  linkedin_url?: string
  twitter_url?: string
  github_url?: string
  youtube_url?: string
  tiktok_url?: string
  location?: string
  occupation?: string
  favorite_quote?: string
  interests?: string[]
  skills?: string[]
  languages_spoken?: string[]
  achievements?: any[]
  is_public?: boolean
  show_email?: boolean
  show_phone?: boolean
  show_social_links?: boolean
  show_achievements?: boolean
  show_featured_roles?: boolean
  paypal_email?: string
  paypal_payer_id?: string
  paypal_connected_at?: string
  role?: string
  account_type?: 'standalone' | 'parent' | 'kid'
  connection_code?: string
  code_expires_at?: string
}

interface FeaturedRole {
  id: string
  role_id: string
  display_order: number
  notes?: string
  featured_image_url?: string
  role?: {
    character_name: string
    ensemble: {
      title: string
      slug: string
    }
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [featuredRoles, setFeaturedRoles] = useState<FeaturedRole[]>([])
  const [availableRoles, setAvailableRoles] = useState<any[]>([])
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio_short: "",
    bio_long: "",
    avatar_url: "",
    cover_image_url: "",
    banner_url: "",
    profile_tint: "#6366f1",
    banner_style: "gradient" as "gradient" | "solid" | "image" | "pattern",
    theme_preference: "default" as "default" | "minimal" | "vibrant" | "dark" | "light",
    profile_border_color: "#e5e7eb",
    profile_text_color: "#000000",
    custom_css: "",
    website_url: "",
    instagram_url: "",
    facebook_url: "",
    linkedin_url: "",
    twitter_url: "",
    github_url: "",
    youtube_url: "",
    tiktok_url: "",
    location: "",
    occupation: "",
    favorite_quote: "",
    interests: [] as string[],
    skills: [] as string[],
    languages_spoken: [] as string[],
    is_public: true,
    show_email: false,
    show_phone: false,
    show_social_links: true,
    show_achievements: true,
    show_featured_roles: true,
  })
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [copiedSlug, setCopiedSlug] = useState(false)
  const [newInterest, setNewInterest] = useState("")
  const [newSkill, setNewSkill] = useState("")
  const [newLanguage, setNewLanguage] = useState("")
  const [paypalEmail, setPaypalEmail] = useState("")
  const [isConnectingPayPal, setIsConnectingPayPal] = useState(false)
  
  // Family accounts state
  const [familyConnections, setFamilyConnections] = useState<any[]>([])
  const [connectionCode, setConnectionCode] = useState("")
  const [codeExpiresAt, setCodeExpiresAt] = useState<Date | null>(null)
  const [parentConnectionCode, setParentConnectionCode] = useState("")
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [isConnectingParent, setIsConnectingParent] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

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
          bio_long: userData.bio || "",
          avatar_url: userData.avatar_url || "",
          cover_image_url: userData.cover_image_url || "",
          banner_url: userData.banner_url || "",
          profile_tint: userData.profile_tint || "#6366f1",
          banner_style: userData.banner_style || "gradient",
          theme_preference: userData.theme_preference || "default",
          profile_border_color: userData.profile_border_color || "#e5e7eb",
          profile_text_color: userData.profile_text_color || "#000000",
          custom_css: userData.custom_css || "",
          website_url: userData.website_url || "",
          instagram_url: userData.instagram_url || "",
          facebook_url: userData.facebook_url || "",
          linkedin_url: userData.linkedin_url || "",
          twitter_url: userData.twitter_url || "",
          github_url: userData.github_url || "",
          youtube_url: userData.youtube_url || "",
          tiktok_url: userData.tiktok_url || "",
          location: userData.location || "",
          occupation: userData.occupation || "",
          favorite_quote: userData.favorite_quote || "",
          interests: userData.interests || [],
          skills: userData.skills || [],
          languages_spoken: userData.languages_spoken || [],
          is_public: userData.is_public ?? true,
          show_email: userData.show_email ?? false,
          show_phone: userData.show_phone ?? false,
          show_social_links: userData.show_social_links ?? true,
          show_achievements: userData.show_achievements ?? true,
          show_featured_roles: userData.show_featured_roles ?? true,
        })
      }

      // Load actor profile and available roles
      const { data: actorData } = await supabase
        .from("actors")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (actorData) {
        // Load roles this actor has been assigned to
        const { data: rolesData } = await supabase
          .from("roles")
          .select(`
            id,
            character_name,
            importance,
            ensemble:ensembles(id, title, slug)
          `)
          .or(`yellow_actor_id.eq.${actorData.id},blue_actor_id.eq.${actorData.id}`)

        setAvailableRoles(rolesData || [])

        // Load featured roles
        const { data: featuredData } = await supabase
          .from("featured_roles")
          .select(`
            id,
            role_id,
            display_order,
            notes,
            featured_image_url,
            role:roles(
              character_name,
              ensemble:ensembles(title, slug)
            )
          `)
          .eq("user_id", user.id)
          .order("display_order")

        setFeaturedRoles(featuredData || [])
      }

      // Load family connections
      if (userData?.account_type === 'parent' || userData?.account_type === 'kid') {
        try {
          const res = await fetch('/api/family/connections')
          if (res.ok) {
            const data = await res.json()
            // Combine children and parents into a single array for display
            const allConnections = [
              ...(data.children || []).map((child: any) => ({
                id: child.connectionId,
                full_name: child.full_name,
                email: child.email,
                avatar_url: child.avatar_url,
                connected_at: child.connectedAt,
                type: 'child'
              })),
              ...(data.parents || []).map((parent: any) => ({
                id: parent.connectionId,
                full_name: parent.full_name,
                email: parent.email,
                avatar_url: parent.avatar_url,
                connected_at: parent.connectedAt,
                type: 'parent'
              }))
            ]
            setFamilyConnections(allConnections)
          }
        } catch (e) {
          console.error("Error loading family connections:", e)
        }
      }

      // Load connection code for parents
      if (userData?.connection_code && userData?.code_expires_at) {
        const expiresAt = new Date(userData.code_expires_at)
        if (expiresAt > new Date()) {
          setConnectionCode(userData.connection_code)
          setCodeExpiresAt(expiresAt)
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error)
      toast.error("Kunne ikke laste profil")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          bio_short: formData.bio_short,
          bio: formData.bio_long,
          avatar_url: formData.avatar_url,
          cover_image_url: formData.cover_image_url,
          banner_url: formData.banner_url,
          profile_tint: formData.profile_tint,
          banner_style: formData.banner_style,
          theme_preference: formData.theme_preference,
          profile_border_color: formData.profile_border_color,
          profile_text_color: formData.profile_text_color,
          custom_css: formData.custom_css,
          website_url: formData.website_url,
          instagram_url: formData.instagram_url,
          facebook_url: formData.facebook_url,
          linkedin_url: formData.linkedin_url,
          twitter_url: formData.twitter_url,
          github_url: formData.github_url,
          youtube_url: formData.youtube_url,
          tiktok_url: formData.tiktok_url,
          location: formData.location,
          occupation: formData.occupation,
          favorite_quote: formData.favorite_quote,
          interests: formData.interests,
          skills: formData.skills,
          languages_spoken: formData.languages_spoken,
          is_public: formData.is_public,
          show_email: formData.show_email,
          show_phone: formData.show_phone,
          show_social_links: formData.show_social_links,
          show_achievements: formData.show_achievements,
          show_featured_roles: formData.show_featured_roles,
        })
        .eq("id", profile.id)

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      toast.success("Profil oppdatert!")
      setProfile({ ...profile, ...formData })
    } catch (error) {
      console.error("Error saving profile:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      toast.error("Kunne ikke oppdatere profil")
    } finally {
      setIsSaving(false)
    }
  }

  const addInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData({ ...formData, interests: [...formData.interests, newInterest.trim()] })
      setNewInterest("")
    }
  }

  const removeInterest = (interest: string) => {
    setFormData({ ...formData, interests: formData.interests.filter((i) => i !== interest) })
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] })
      setNewSkill("")
    }
  }

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) })
  }

  const addLanguage = () => {
    if (newLanguage.trim() && !formData.languages_spoken.includes(newLanguage.trim())) {
      setFormData({ ...formData, languages_spoken: [...formData.languages_spoken, newLanguage.trim()] })
      setNewLanguage("")
    }
  }

  const removeLanguage = (language: string) => {
    setFormData({ ...formData, languages_spoken: formData.languages_spoken.filter((l) => l !== language) })
  }

  const addFeaturedRole = async (roleId: string) => {
    if (!profile) return
    try {
      const { error } = await supabase.from("featured_roles").insert({
        user_id: profile.id,
        role_id: roleId,
        display_order: featuredRoles.length,
      })
      if (error) throw error
      toast.success("Rolle lagt til i fremvisning!")
      loadProfile()
    } catch (error) {
      console.error("Error adding featured role:", error)
      toast.error("Kunne ikke legge til rolle")
    }
  }

  const removeFeaturedRole = async (featuredRoleId: string) => {
    try {
      const { error } = await supabase.from("featured_roles").delete().eq("id", featuredRoleId)
      if (error) throw error
      toast.success("Rolle fjernet fra fremvisning")
      setFeaturedRoles(featuredRoles.filter((fr) => fr.id !== featuredRoleId))
    } catch (error) {
      console.error("Error removing featured role:", error)
      toast.error("Kunne ikke fjerne rolle")
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

  const handleConnectPayPal = async () => {
    if (!paypalEmail || !paypalEmail.includes("@")) {
      toast.error("Vennligst oppgi en gyldig e-postadresse")
      return
    }

    setIsConnectingPayPal(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("Du må være logget inn")
        return
      }

      const response = await fetch("/api/payment/connect-paypal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ paypalEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect PayPal")
      }

      toast.success("PayPal-konto koblet til!")
      setPaypalEmail("")
      await loadProfile() // Reload profile to show connected account
    } catch (error) {
      console.error("Error connecting PayPal:", error)
      toast.error("Kunne ikke koble til PayPal-konto")
    } finally {
      setIsConnectingPayPal(false)
    }
  }

  const handleDisconnectPayPal = async () => {
    setIsConnectingPayPal(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("Du må være logget inn")
        return
      }

      const response = await fetch("/api/payment/connect-paypal", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to disconnect PayPal")
      }

      toast.success("PayPal-konto frakoblet")
      await loadProfile() // Reload profile
    } catch (error) {
      console.error("Error disconnecting PayPal:", error)
      toast.error("Kunne ikke frakoble PayPal-konto")
    } finally {
      setIsConnectingPayPal(false)
    }
  }

  // Family account functions
  const handleGenerateCode = async () => {
    setIsGeneratingCode(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("Du må være logget inn")
        return
      }

      const response = await fetch("/api/family/generate-code", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke generere kode")
      }

      setConnectionCode(data.code)
      setCodeExpiresAt(new Date(data.expiresAt))
      toast.success("Koblingskode generert!")
    } catch (error: any) {
      console.error("Error generating code:", error)
      toast.error(error.message || "Kunne ikke generere koblingskode")
    } finally {
      setIsGeneratingCode(false)
    }
  }

  const handleConnectToParent = async () => {
    if (!parentConnectionCode || parentConnectionCode.length !== 8) {
      toast.error("Vennligst oppgi en gyldig 8-tegns kode")
      return
    }

    setIsConnectingParent(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("Du må være logget inn")
        return
      }

      const response = await fetch("/api/family/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code: parentConnectionCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kunne ikke koble til foresatt")
      }

      toast.success(`Koblet til ${data.parentName}!`)
      setParentConnectionCode("")
      await loadProfile()
    } catch (error: any) {
      console.error("Error connecting to parent:", error)
      toast.error(error.message || "Kunne ikke koble til foresatt")
    } finally {
      setIsConnectingParent(false)
    }
  }

  const handleRemoveConnection = async (connectionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("Du må være logget inn")
        return
      }

      const response = await fetch(`/api/family/connections?id=${connectionId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Kunne ikke fjerne tilkobling")
      }

      toast.success("Tilkobling fjernet")
      await loadProfile()
    } catch (error: any) {
      console.error("Error removing connection:", error)
      toast.error(error.message || "Kunne ikke fjerne tilkobling")
    }
  }

  const copyConnectionCode = () => {
    navigator.clipboard.writeText(connectionCode)
    setCopiedCode(true)
    toast.success("Kode kopiert!")
    setTimeout(() => setCopiedCode(false), 2000)
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
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Tilbake til dashboard
            </Link>
          </div>
        </div>

        {/* Hero */}
        <section className="bg-primary text-primary-foreground py-12">
          <div className="container px-4">
            <h1 className="text-3xl md:text-4xl font-bold">Kontoinnstillinger</h1>
            <p className="mt-2 text-primary-foreground/90">Tilpass profilen din og administrer personvern</p>
          </div>
        </section>

        {/* Settings Tabs */}
        <section className="py-12">
          <div className="container px-4 max-w-5xl">
            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="w-full h-auto bg-muted/50 p-2 justify-start overflow-x-auto flex-nowrap">
                <TabsTrigger value="profile" className="gap-2 whitespace-nowrap">
                  <User className="h-4 w-4" />
                  <span>Profil</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="gap-2 whitespace-nowrap">
                  <Palette className="h-4 w-4" />
                  <span>Utseende</span>
                </TabsTrigger>
                <TabsTrigger value="social" className="gap-2 whitespace-nowrap">
                  <Share2 className="h-4 w-4" />
                  <span>Sosiale</span>
                </TabsTrigger>
                <TabsTrigger value="payment" className="gap-2 whitespace-nowrap">
                  <CreditCard className="h-4 w-4" />
                  <span>Betaling</span>
                </TabsTrigger>
                <TabsTrigger value="privacy" className="gap-2 whitespace-nowrap">
                  <Eye className="h-4 w-4" />
                  <span>Personvern</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2 whitespace-nowrap">
                  <Lock className="h-4 w-4" />
                  <span>Sikkerhet</span>
                </TabsTrigger>
                {(profile?.account_type === 'parent' || profile?.account_type === 'kid') && (
                  <TabsTrigger value="family" className="gap-2 whitespace-nowrap">
                    <Users className="h-4 w-4" />
                    <span>Familie</span>
                  </TabsTrigger>
                )}
                {availableRoles.length > 0 && (
                  <TabsTrigger value="showcase" className="gap-2 whitespace-nowrap">
                    <Star className="h-4 w-4" />
                    <span>Fremvisning</span>
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Grunnleggende informasjon</CardTitle>
                    <CardDescription>Din personlige informasjon og kontaktdetaljer</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email">E-post</Label>
                        <Input id="email" type="email" value={profile?.email || ""} disabled />
                        <p className="text-xs text-muted-foreground">E-postadressen kan ikke endres</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fullName">Fullt navn *</Label>
                        <Input
                          id="fullName"
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
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="Oslo, Norge"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="occupation">Yrke/Tittel</Label>
                        <Input
                          id="occupation"
                          value={formData.occupation}
                          onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                          placeholder="Skuespiller, Student, etc."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bioShort">Kort beskrivelse</Label>
                      <Input
                        id="bioShort"
                        value={formData.bio_short}
                        onChange={(e) => setFormData({ ...formData, bio_short: e.target.value })}
                        placeholder="F.eks. 'Theaterelsker fra Oslo'"
                        maxLength={160}
                      />
                      <p className="text-xs text-muted-foreground">{formData.bio_short.length}/160 tegn</p>
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
                        value={formData.favorite_quote}
                        onChange={(e) => setFormData({ ...formData, favorite_quote: e.target.value })}
                        placeholder="All the world's a stage..."
                      />
                    </div>

                    {/* Interests */}
                    <div className="space-y-2">
                      <Label>Interesser</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newInterest}
                          onChange={(e) => setNewInterest(e.target.value)}
                          placeholder="Legg til interesse"
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())}
                        />
                        <Button type="button" onClick={addInterest} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.interests.map((interest) => (
                          <Badge key={interest} variant="secondary" className="gap-1">
                            {interest}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => removeInterest(interest)} />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="space-y-2">
                      <Label>Ferdigheter</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          placeholder="Legg til ferdighet"
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                        />
                        <Button type="button" onClick={addSkill} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="gap-1">
                            {skill}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Languages */}
                    <div className="space-y-2">
                      <Label>Språk</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newLanguage}
                          onChange={(e) => setNewLanguage(e.target.value)}
                          placeholder="Legg til språk"
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLanguage())}
                        />
                        <Button type="button" onClick={addLanguage} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.languages_spoken.map((language) => (
                          <Badge key={language} variant="secondary" className="gap-1">
                            {language}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => removeLanguage(language)} />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {isSaving ? "Lagrer..." : "Lagre endringer"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Appearance Tab */}
              <TabsContent value="appearance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Profil utseende</CardTitle>
                    <CardDescription>Tilpass hvordan profilen din ser ut</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="avatarUrl">Avatar URL</Label>
                      <Input
                        id="avatarUrl"
                        type="url"
                        value={formData.avatar_url}
                        onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                        placeholder="https://eksempel.com/avatar.jpg"
                      />
                      {formData.avatar_url && (
                        <div className="mt-2">
                          <img src={formData.avatar_url} alt="Avatar preview" className="w-24 h-24 rounded-full object-cover" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="coverImageUrl">Cover bilde URL (deprecated)</Label>
                      <Input
                        id="coverImageUrl"
                        type="url"
                        value={formData.cover_image_url}
                        onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                        placeholder="https://eksempel.com/cover.jpg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bannerUrl">Banner bilde URL</Label>
                      <Input
                        id="bannerUrl"
                        type="url"
                        value={formData.banner_url}
                        onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                        placeholder="https://eksempel.com/banner.jpg"
                      />
                      {formData.banner_url && (
                        <div className="mt-2">
                          <img src={formData.banner_url} alt="Banner preview" className="w-full h-32 object-cover rounded" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bannerStyle">Banner stil</Label>
                      <Select value={formData.banner_style} onValueChange={(value: any) => setFormData({ ...formData, banner_style: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gradient">Gradient</SelectItem>
                          <SelectItem value="solid">Solid farge</SelectItem>
                          <SelectItem value="image">Bilde</SelectItem>
                          <SelectItem value="pattern">Mønster</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profileTint">Profilfarge (primær)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="profileTint"
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
                      <p className="text-xs text-muted-foreground">Brukes som hovedfarge på din profil</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profileBorderColor">Kantfarge</Label>
                      <div className="flex gap-2">
                        <Input
                          id="profileBorderColor"
                          value={formData.profile_border_color}
                          onChange={(e) => setFormData({ ...formData, profile_border_color: e.target.value })}
                          placeholder="#e5e7eb"
                        />
                        <input
                          type="color"
                          value={formData.profile_border_color}
                          onChange={(e) => setFormData({ ...formData, profile_border_color: e.target.value })}
                          className="w-14 h-10 rounded border cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profileTextColor">Tekstfarge</Label>
                      <div className="flex gap-2">
                        <Input
                          id="profileTextColor"
                          value={formData.profile_text_color}
                          onChange={(e) => setFormData({ ...formData, profile_text_color: e.target.value })}
                          placeholder="#000000"
                        />
                        <input
                          type="color"
                          value={formData.profile_text_color}
                          onChange={(e) => setFormData({ ...formData, profile_text_color: e.target.value })}
                          className="w-14 h-10 rounded border cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="themePreference">Tema</Label>
                      <Select value={formData.theme_preference} onValueChange={(value: any) => setFormData({ ...formData, theme_preference: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Standard</SelectItem>
                          <SelectItem value="minimal">Minimal</SelectItem>
                          <SelectItem value="vibrant">Livlig</SelectItem>
                          <SelectItem value="dark">Mørk</SelectItem>
                          <SelectItem value="light">Lys</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customCss">Tilpasset CSS (avansert)</Label>
                      <Textarea
                        id="customCss"
                        value={formData.custom_css}
                        onChange={(e) => setFormData({ ...formData, custom_css: e.target.value })}
                        placeholder=".profile-header { background: linear-gradient(...) }"
                        rows={5}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Kun for avanserte brukere. CSS injiseres direkte på profilen din.</p>
                    </div>

                    <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {isSaving ? "Lagrer..." : "Lagre utseende"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Social Tab */}
              <TabsContent value="social" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Sosiale medier</CardTitle>
                    <CardDescription>Legg til lenker til dine sosiale profiler</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
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
                        <Label htmlFor="twitterUrl">Twitter/X</Label>
                        <Input
                          id="twitterUrl"
                          type="url"
                          value={formData.twitter_url}
                          onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                          placeholder="https://twitter.com/brukernavn"
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
                        <Label htmlFor="githubUrl">GitHub</Label>
                        <Input
                          id="githubUrl"
                          type="url"
                          value={formData.github_url}
                          onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                          placeholder="https://github.com/brukernavn"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="youtubeUrl">YouTube</Label>
                        <Input
                          id="youtubeUrl"
                          type="url"
                          value={formData.youtube_url}
                          onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                          placeholder="https://youtube.com/@brukernavn"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tiktokUrl">TikTok</Label>
                        <Input
                          id="tiktokUrl"
                          type="url"
                          value={formData.tiktok_url}
                          onChange={(e) => setFormData({ ...formData, tiktok_url: e.target.value })}
                          placeholder="https://tiktok.com/@brukernavn"
                        />
                      </div>
                    </div>

                    <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {isSaving ? "Lagrer..." : "Lagre sosiale lenker"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payment Tab */}
              <TabsContent value="payment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Betalingsmetoder</CardTitle>
                    <CardDescription>Administrer dine betalingsalternativer</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* PayPal Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#003087">
                              <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.679l-.04.22-.63 3.993-.03.168a.804.804 0 01-.794.679H7.72a.483.483 0 01-.477-.558l.844-5.35.002-.014L9.76 8.974h.01l.448-2.84a.964.964 0 01.952-.814h2.262c2.95 0 4.936.615 5.903 1.832.313.394.555.822.732 1.326z"/>
                              <path d="M7.653 8.734a.79.79 0 01.78-.664h5.043c.548 0 1.06.027 1.53.09.18.023.358.05.532.082.174.031.344.068.51.11.083.021.164.043.245.066.238.069.469.148.693.237.29-.925.253-1.555-.155-2.097C15.833 5.36 13.666 4.9 10.964 4.9H4.972a.964.964 0 00-.952.814l-2.807 17.8a.576.576 0 00.57.67h4.093l1.026-6.506z" fill="#0070e0"/>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-semibold">PayPal</h4>
                            {profile?.paypal_email ? (
                              <p className="text-sm text-muted-foreground">
                                Koblet til: {profile.paypal_email}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">Koble til PayPal-kontoen din for raskere kjøp</p>
                            )}
                          </div>
                        </div>
                        {profile?.paypal_email ? (
                          <Button 
                            variant="outline" 
                            onClick={handleDisconnectPayPal}
                            disabled={isConnectingPayPal}
                          >
                            {isConnectingPayPal ? "Kobler fra..." : "Koble fra"}
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            onClick={handleConnectPayPal}
                            disabled={isConnectingPayPal}
                          >
                            {isConnectingPayPal ? "Kobler til..." : "Koble til"}
                          </Button>
                        )}
                      </div>
                      {!profile?.paypal_email && (
                        <div className="px-4">
                          <Input
                            type="email"
                            placeholder="PayPal e-postadresse"
                            value={paypalEmail}
                            onChange={(e) => setPaypalEmail(e.target.value)}
                            disabled={isConnectingPayPal}
                          />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground px-4">
                        {profile?.paypal_email 
                          ? "PayPal-konto tilkoblet. Du kan betale uten å logge inn hver gang"
                          : "Når du kobler til PayPal, kan du betale uten å logge inn hver gang"
                        }
                      </p>
                    </div>

                    {/* Vipps Section - Coming Soon */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30 opacity-60">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#FF5B24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              Vipps
                              <Badge variant="secondary" className="text-xs">Kommer snart</Badge>
                            </h4>
                            <p className="text-sm text-muted-foreground">Betal raskt og enkelt med Vipps</p>
                          </div>
                        </div>
                        <Button variant="outline" disabled className="cursor-not-allowed">
                          Kommer snart
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground px-4">
                        Vipps-integrering vil snart være tilgjengelig
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Privacy Tab */}
              <TabsContent value="privacy" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Personvern innstillinger</CardTitle>
                    <CardDescription>Kontroller hva andre kan se på profilen din</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <Checkbox
                        id="isPublic"
                        checked={formData.is_public}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked as boolean })}
                      />
                      <div className="flex-1">
                        <Label htmlFor="isPublic" className="font-semibold cursor-pointer">
                          Gjør profilen min offentlig
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Andre kan se profilen din og informasjonen du velger å dele
                        </p>
                      </div>
                    </div>

                    {profile?.slug && formData.is_public && (
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <p className="text-sm font-medium">Din profilURL:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm bg-background rounded px-3 py-2 break-all">
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
                            {copiedSlug ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <h3 className="font-semibold">Vis på offentlig profil</h3>
                      
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="showEmail"
                          checked={formData.show_email}
                          onCheckedChange={(checked) => setFormData({ ...formData, show_email: checked as boolean })}
                        />
                        <Label htmlFor="showEmail" className="font-normal cursor-pointer">
                          E-postadresse
                        </Label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="showPhone"
                          checked={formData.show_phone}
                          onCheckedChange={(checked) => setFormData({ ...formData, show_phone: checked as boolean })}
                        />
                        <Label htmlFor="showPhone" className="font-normal cursor-pointer">
                          Telefonnummer
                        </Label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="showSocialLinks"
                          checked={formData.show_social_links}
                          onCheckedChange={(checked) => setFormData({ ...formData, show_social_links: checked as boolean })}
                        />
                        <Label htmlFor="showSocialLinks" className="font-normal cursor-pointer">
                          Sosiale medier lenker
                        </Label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="showAchievements"
                          checked={formData.show_achievements}
                          onCheckedChange={(checked) => setFormData({ ...formData, show_achievements: checked as boolean })}
                        />
                        <Label htmlFor="showAchievements" className="font-normal cursor-pointer">
                          Prestasjoner
                        </Label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="showFeaturedRoles"
                          checked={formData.show_featured_roles}
                          onCheckedChange={(checked) => setFormData({ ...formData, show_featured_roles: checked as boolean })}
                        />
                        <Label htmlFor="showFeaturedRoles" className="font-normal cursor-pointer">
                          Fremhevede roller
                        </Label>
                      </div>
                    </div>

                    <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {isSaving ? "Lagrer..." : "Lagre personvernvalg"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Endre passord</CardTitle>
                    <CardDescription>Oppdater passordet ditt for å holde kontoen sikker</CardDescription>
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

                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-destructive">Logg ut</CardTitle>
                    <CardDescription>Logg ut av kontoen din på denne enheten</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleSignOut} variant="destructive" className="gap-2">
                      <LogOut className="h-4 w-4" />
                      Logg ut
                    </Button>
                  </CardContent>
                </Card>

                {/* Admin: Legal Docs Editor */}
                {profile?.role === "admin" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Juridiske dokumenter (Admin)</CardTitle>
                      <CardDescription>Rediger juridiske dokumenter på nettsiden</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        <li>
                          <Link href="/admin/legal/vilkar" className="text-primary hover:underline">
                            Rediger Vilkår for kjøp
                          </Link>
                        </li>
                        <li>
                          <Link href="/admin/legal/personvern" className="text-primary hover:underline">
                            Rediger Personvernerklæring
                          </Link>
                        </li>
                        <li>
                          <Link href="/admin/legal/eula" className="text-primary hover:underline">
                            Rediger EULA
                          </Link>
                        </li>
                        <li>
                          <Link href="/admin/legal/tos" className="text-primary hover:underline">
                            Rediger TOS
                          </Link>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Family Tab */}
              {(profile?.account_type === 'parent' || profile?.account_type === 'kid') && (
                <TabsContent value="family" className="space-y-4">
                  {/* Account type indicator */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Kontotype</CardTitle>
                      <CardDescription>
                        {profile?.account_type === 'parent' 
                          ? "Du har en foresattkonto og kan koble til barn" 
                          : "Du har en barnekonto og kan koble til foresatte"
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="secondary" className="text-sm">
                        {profile?.account_type === 'parent' ? '👨‍👩‍👧 Foresatt' : '👶 Barn'}
                      </Badge>
                    </CardContent>
                  </Card>

                  {/* Parent-specific: Generate connection code */}
                  {profile?.account_type === 'parent' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Koblingskode</CardTitle>
                        <CardDescription>
                          Generer en kode som barna dine kan bruke for å koble seg til deg
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {connectionCode && codeExpiresAt && codeExpiresAt > new Date() ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="bg-muted px-4 py-3 rounded-lg font-mono text-2xl tracking-widest">
                                {connectionCode}
                              </div>
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={copyConnectionCode}
                              >
                                {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Gyldig til: {codeExpiresAt.toLocaleDateString('nb-NO')} kl. {codeExpiresAt.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={handleGenerateCode}
                              disabled={isGeneratingCode}
                              className="gap-2"
                            >
                              <RefreshCw className={`h-4 w-4 ${isGeneratingCode ? 'animate-spin' : ''}`} />
                              Generer ny kode
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            onClick={handleGenerateCode}
                            disabled={isGeneratingCode}
                            className="gap-2"
                          >
                            {isGeneratingCode ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Genererer...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4" />
                                Generer koblingskode
                              </>
                            )}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Kid-specific: Enter parent code */}
                  {profile?.account_type === 'kid' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Koble til foresatt</CardTitle>
                        <CardDescription>
                          Skriv inn koblingskoden du har fått fra din foresatt
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="XXXXXXXX"
                            value={parentConnectionCode}
                            onChange={(e) => setParentConnectionCode(e.target.value.toUpperCase())}
                            maxLength={8}
                            className="font-mono text-lg tracking-widest max-w-[200px]"
                          />
                          <Button 
                            onClick={handleConnectToParent}
                            disabled={isConnectingParent || parentConnectionCode.length !== 8}
                          >
                            {isConnectingParent ? "Kobler til..." : "Koble til"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Connected family members */}
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {profile?.account_type === 'parent' ? 'Tilkoblede barn' : 'Tilkoblede foresatte'}
                      </CardTitle>
                      <CardDescription>
                        {profile?.account_type === 'parent' 
                          ? 'Barn som har koblet seg til kontoen din' 
                          : 'Foresatte som kan administrere påmeldinger for deg'
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {familyConnections.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          {profile?.account_type === 'parent' 
                            ? 'Ingen barn har koblet seg til ennå. Generer en kode og del den med barna dine.' 
                            : 'Du er ikke koblet til noen foresatte ennå.'
                          }
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {familyConnections.map((connection) => (
                            <div 
                              key={connection.id} 
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div>
                                <p className="font-medium">{connection.full_name || 'Ukjent'}</p>
                                <p className="text-sm text-muted-foreground">
                                  Koblet til {new Date(connection.connected_at).toLocaleDateString('nb-NO')}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveConnection(connection.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Parent-specific: Enrollment permissions management */}
                  {profile?.account_type === 'parent' && familyConnections.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Påmeldingstillatelser</CardTitle>
                        <CardDescription>
                          Administrer hvilke barn som kan melde seg på ensembler selv
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Link href="/dashboard/pamelding-tillatelser">
                          <Button className="w-full gap-2">
                            <Users className="h-4 w-4" />
                            Administrer påmeldingstillatelser
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )}

                  {/* Parent-specific: Enrollment requests */}
                  {profile?.account_type === 'parent' && familyConnections.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Påmeldingsforespørsler</CardTitle>
                        <CardDescription>
                          Se og godkjenn forespørsler fra barn som ønsker å melde seg på
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Link href="/dashboard/foresporsel">
                          <Button className="w-full gap-2" variant="secondary">
                            <Bell className="h-4 w-4" />
                            Se forespørsler
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}

              {/* Showcase Tab (Only for actors) */}
              {availableRoles.length > 0 && (
                <TabsContent value="showcase" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Fremhev roller</CardTitle>
                      <CardDescription>Velg rollene du er mest stolt av å vise på profilen din</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Featured Roles */}
                      {featuredRoles.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="font-semibold">Dine fremhevede roller</h3>
                          <div className="grid gap-3">
                            {featuredRoles.map((fr) => (
                              <div key={fr.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                  <p className="font-medium">{fr.role?.character_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {fr.role?.ensemble?.title}
                                  </p>
                                  {fr.notes && <p className="text-sm mt-1">{fr.notes}</p>}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFeaturedRole(fr.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Available Roles */}
                      <div className="space-y-4">
                        <h3 className="font-semibold">Tilgjengelige roller</h3>
                        <div className="grid gap-3">
                          {availableRoles
                            .filter((role) => !featuredRoles.some((fr) => fr.role_id === role.id))
                            .map((role) => (
                              <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                  <p className="font-medium">{role.character_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {role.ensemble?.title}
                                  </p>
                                  <Badge variant="outline" className="mt-1">
                                    {role.importance}
                                  </Badge>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addFeaturedRole(role.id)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Fremhev
                                </Button>
                              </div>
                            ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
