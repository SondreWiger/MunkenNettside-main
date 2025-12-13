"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Phone, Image as ImageIcon } from "lucide-react"

interface Actor {
  id: string
  name: string
  bio?: string
  photo_url?: string
  contact_email?: string
  contact_phone?: string
  user_id?: string
}

interface ActorConflictDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingActor: Actor
  newUserName: string
  newUserEmail: string
  onUseExisting: (actorId: string) => void
  onCreateNew: () => void
}

export function ActorConflictDialog({
  open,
  onOpenChange,
  existingActor,
  newUserName,
  newUserEmail,
  onUseExisting,
  onCreateNew,
}: ActorConflictDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleUseExisting = async () => {
    setLoading(true)
    await onUseExisting(existingActor.id)
    setLoading(false)
    onOpenChange(false)
  }

  const handleCreateNew = async () => {
    setLoading(true)
    await onCreateNew()
    setLoading(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Skuespiller med samme navn finnes allerede</DialogTitle>
          <DialogDescription>
            En skuespiller med navnet &quot;{existingActor.name}&quot; eksisterer allerede. 
            Vil du bruke den eksisterende profilen eller opprette en ny?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Existing Actor Info */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Eksisterende skuespiller
              </h3>
              {existingActor.user_id && (
                <Badge variant="secondary">Koblet til brukerkonto</Badge>
              )}
            </div>
            
            <div className="space-y-2 text-sm">
              <p className="font-medium">{existingActor.name}</p>
              
              {existingActor.bio && (
                <p className="text-muted-foreground">{existingActor.bio}</p>
              )}
              
              {existingActor.contact_email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {existingActor.contact_email}
                </div>
              )}
              
              {existingActor.contact_phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {existingActor.contact_phone}
                </div>
              )}
              
              {existingActor.photo_url && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-3 w-3" />
                  Har profilbilde
                </div>
              )}
            </div>
          </div>

          {/* New User Info */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Ny bruker som skal godkjennes
            </h3>
            
            <div className="space-y-2 text-sm">
              <p className="font-medium">{newUserName}</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3 w-3" />
                {newUserEmail}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCreateNew}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Opprett ny skuespiller
          </Button>
          <Button
            onClick={handleUseExisting}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? "Kobler til..." : "Bruk eksisterende profil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
