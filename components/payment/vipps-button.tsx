"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface VippsButtonProps {
  amount: number
  currency?: string
  description?: string
  disabled?: boolean
}

export function VippsButton({
  amount,
  currency = "NOK",
  description = "Payment",
  disabled = true,
}: VippsButtonProps) {
  return (
    <div className="space-y-3">
      <Button
        type="button"
        disabled={disabled}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed relative"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        Betal med Vipps ({amount} {currency})
        {disabled && (
          <Badge variant="secondary" className="ml-2 text-xs">
            Kommer snart
          </Badge>
        )}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        Vipps-integrering vil snart være tilgjengelig
      </p>
    </div>
  )
}
