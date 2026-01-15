"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"

interface VippsButtonProps {
  amount: number
  currency?: string
  description?: string
  disabled?: boolean
  purchaseId: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function VippsButton({
  amount,
  currency = "NOK",
  description = "Payment",
  disabled = false,
  purchaseId,
  onSuccess,
  onError,
}: VippsButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleVippsPayment = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/payment/vipps/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId,
          amount_nok: amount,
          description: description || 'Teateret kjøp',
          successUrl: `${window.location.origin}/bekreftelse?purchase_id=${purchaseId}`,
          cancelUrl: window.location.href,
        }),
      })

      const data = await response.json()

      if (data.success && data.url) {
        // Redirect to Vipps
        window.location.href = data.url
        onSuccess?.()
      } else {
        throw new Error(data.error || 'Failed to create Vipps payment')
      }
    } catch (error: any) {
      console.error('Vipps payment error:', error)
      onError?.(error.message)
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={handleVippsPayment}
      disabled={disabled || loading}
      className="w-full bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      {loading ? 'Laster...' : `Betal med Vipps (${amount} ${currency})`}
    </Button>
  )
}
