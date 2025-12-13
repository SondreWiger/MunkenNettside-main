"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export function ConstructionWarning() {
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    // Check if user has already seen the warning in this session
    const warningShown = sessionStorage.getItem("construction_warning_shown")
    if (warningShown) {
      return
    }

    async function checkSettings() {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "debug")
        .single()

      if (data?.value?.show_construction_warning) {
        setShowWarning(true)
      }
    }

    checkSettings()
  }, [])

  const handleClose = () => {
    setShowWarning(false)
    sessionStorage.setItem("construction_warning_shown", "true")
  }

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            Under konstruksjon - Advarsel
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-muted-foreground text-base space-y-4 pt-4">
          <p className="font-semibold text-foreground">
            Dette er per dags dato IKKE den offisielle nettsiden til Munken.
          </p>
          
          <p>
            Denne siden er under utvikling, og alt innhold her er utelukkende for testing.
          </p>
          
          <p className="font-semibold text-destructive">
            Hvis du har fått tilgang til denne siden på en ikke-godkjent måte, vennligst lukk 
            siden umiddelbart.
          </p>
          
          <div className="border-t pt-4 mt-4">
            <p className="font-semibold text-foreground mb-2">
              Er du her for å teste siden for administratorene?
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Rapporter alle feil og bugs til: <span className="font-mono bg-muted px-1 py-0.5 rounded">sondre@northem.no</span></li>
              <li>Husk å sjekke konsollen som dukker opp når du trykker <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">F12</kbd></li>
              <li>Test alle funksjoner grundig og noter ned eventuelle problemer</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground italic mt-4">
            Denne meldingen vises kun én gang per økt.
          </p>
        </div>
        
        <DialogFooter>
          <Button onClick={handleClose} className="w-full sm:w-auto">
            Jeg forstår - Fortsett til siden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
