"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Loader2, Save, Globe, Mail, Share2, Bug, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import SiteAppearanceAdmin from '@/components/admin/site-appearance'

interface SiteSettings {
  site_name: string
  site_description: string
  contact_email: string
  contact_phone: string
  address: string
  social_links: {
    facebook?: string
    instagram?: string
    twitter?: string
  }
}

interface DebugSettings {
  show_profile_ensemble_debug: boolean
  show_construction_warning: boolean
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<SiteSettings>({
    site_name: "Teateret",
    site_description: "Opplev magi på scenen",
    contact_email: "",
    contact_phone: "",
    address: "",
    social_links: {},
  })
  const [debugSettings, setDebugSettings] = useState<DebugSettings>({
    show_profile_ensemble_debug: false,
    show_construction_warning: false,
  })

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true)
      
      // Load general settings
      const { data: generalData } = await supabase.from("site_settings").select("value").eq("key", "general").maybeSingle()
      if (generalData?.value) {
        setSettings(generalData.value as SiteSettings)
      }

      // Load debug settings
      const { data: debugData } = await supabase.from("site_settings").select("value").eq("key", "debug").maybeSingle()
      if (debugData?.value) {
        setDebugSettings(debugData.value as DebugSettings)
      }
      
      setIsLoading(false)
    }
    loadSettings()
  }, [supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Save general settings
      const { error: generalError } = await supabase.from("site_settings").upsert({
        key: "general",
        value: settings,
        updated_at: new Date().toISOString(),
      })
      if (generalError) throw generalError

      // Save debug settings
      const { error: debugError } = await supabase.from("site_settings").upsert({
        key: "debug",
        value: debugSettings,
        updated_at: new Date().toISOString(),
      })
      if (debugError) throw debugError

      toast.success("Innstillinger lagret!")
    } catch (error) {
      console.error(error)
      toast.error("Kunne ikke lagre innstillinger")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <main className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">Laster innstillinger...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Innstillinger</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Konfigurer nettsted og systeminnstillinger</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="w-fit bg-blue-600 hover:bg-blue-700">
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Settings */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Generelt</CardTitle>
                <CardDescription>Grunnleggende nettstedinformasjon</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="site_name">Nettstedsnavn</Label>
                <Input
                  id="site_name"
                  value={settings.site_name}
                  onChange={(e) => setSettings((p) => ({ ...p, site_name: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="site_description">Beskrivelse</Label>
                <Textarea
                  id="site_description"
                  value={settings.site_description}
                  onChange={(e) => setSettings((p) => ({ ...p, site_description: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Site appearance */}
        <SiteAppearanceAdmin />

        {/* Contact Information */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Mail className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Kontaktinformasjon</CardTitle>
                <CardDescription>Kontaktdetaljer som vises på nettsiden</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_email">E-post</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => setSettings((p) => ({ ...p, contact_email: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Telefon</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={settings.contact_phone}
                  onChange={(e) => setSettings((p) => ({ ...p, contact_phone: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  value={settings.address}
                  onChange={(e) => setSettings((p) => ({ ...p, address: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Share2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Sosiale medier</CardTitle>
                <CardDescription>Lenker til sosiale medieprofiler</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook URL</Label>
                <Input
                  id="facebook"
                  type="url"
                  placeholder="https://facebook.com/..."
                  value={settings.social_links.facebook || ""}
                  onChange={(e) =>
                    setSettings((p) => ({
                      ...p,
                      social_links: { ...p.social_links, facebook: e.target.value },
                    }))
                  }
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram URL</Label>
                <Input
                  id="instagram"
                  type="url"
                  placeholder="https://instagram.com/..."
                  value={settings.social_links.instagram || ""}
                  onChange={(e) =>
                    setSettings((p) => ({
                      ...p,
                      social_links: { ...p.social_links, instagram: e.target.value },
                    }))
                  }
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Settings */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Bug className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Debug & Utviklerverktøy</CardTitle>
                <CardDescription>Innstillinger for debugging og testing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <div className="space-y-0.5">
                <Label htmlFor="show_construction_warning" className="font-medium">Vis "Under konstruksjon" advarsel</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Viser en popup-advarsel når brukere laster inn siden
                </p>
              </div>
              <Switch
                id="show_construction_warning"
                checked={debugSettings.show_construction_warning}
                onCheckedChange={(checked) =>
                  setDebugSettings((p) => ({ ...p, show_construction_warning: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
              <div className="space-y-0.5">
                <Label htmlFor="show_profile_ensemble_debug" className="font-medium">Vis ensemble debug på profiler</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Viser detaljert informasjon om ensemble-tilhørighet
                </p>
              </div>
              <Switch
                id="show_profile_ensemble_debug"
                checked={debugSettings.show_profile_ensemble_debug}
                onCheckedChange={(checked) =>
                  setDebugSettings((p) => ({ ...p, show_profile_ensemble_debug: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </main>
  )
}
