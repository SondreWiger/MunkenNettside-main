"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BackButton() {
  return (
    <Button 
      variant="ghost" 
      className="text-white hover:bg-white/10" 
      onClick={() => window.history.back()}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Tilbake
    </Button>
  )
}