"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

interface PayPalButtonProps {
  amount: number
  currency?: string
  description?: string
  onSuccess: (details: any) => Promise<void>
  onError?: (error: any) => void
  onCancel?: () => void
}

declare global {
  interface Window {
    paypal?: any
  }
}

export function PayPalButton({
  amount,
  currency = "NOK",
  description = "Payment",
  onSuccess,
  onError,
  onCancel,
}: PayPalButtonProps) {
  const paypalRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  
  // Store callback refs to prevent re-renders
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const onCancelRef = useRef(onCancel)
  
  // Update refs when callbacks change
  useEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
    onCancelRef.current = onCancel
  }, [onSuccess, onError, onCancel])

  useEffect(() => {
    console.log("[PayPal Button] Initializing with amount:", amount, currency)
    console.log("[PayPal Button] Client ID available:", !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID)
    
    // Load PayPal SDK
    if (window.paypal) {
      console.log("[PayPal Button] SDK already loaded")
      setSdkReady(true)
      setLoading(false)
      return
    }

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    if (!clientId) {
      console.error("[PayPal Button] Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID")
      setError("PayPal configuration missing")
      setLoading(false)
      return
    }

    console.log("[PayPal Button] Loading SDK...")
    const script = document.createElement("script")
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`
    script.async = true
    script.onload = () => {
      console.log("[PayPal Button] SDK loaded successfully")
      setSdkReady(true)
      setLoading(false)
    }
    script.onerror = () => {
      console.error("[PayPal Button] Failed to load SDK")
      setError("Failed to load PayPal SDK")
      setLoading(false)
    }
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [currency])

  useEffect(() => {
    if (!sdkReady || !paypalRef.current || !window.paypal) return

    console.log("[PayPal Button] Rendering PayPal buttons...")
    
    // Clear existing buttons
    if (paypalRef.current) {
      paypalRef.current.innerHTML = ""
    }

    let buttonsInstance: any = null

    try {
      buttonsInstance = window.paypal.Buttons({
        createOrder: (data: any, actions: any) => {
          console.log("[PayPal Button] Creating order for amount:", amount)
          return actions.order.create({
            purchase_units: [
              {
                description,
                amount: {
                  currency_code: currency,
                  value: amount.toFixed(2),
                },
              },
            ],
          })
        },
        onApprove: async (data: any, actions: any) => {
          console.log("[PayPal Button] Payment approved, capturing order...")
          const details = await actions.order.capture()
          console.log("[PayPal Button] Order captured:", details)
          await onSuccessRef.current(details)
        },
        onError: (err: any) => {
          console.error("[PayPal Button] Payment error:", err)
          setError("Payment failed. Please try again.")
          if (onErrorRef.current) onErrorRef.current(err)
        },
        onCancel: () => {
          console.log("[PayPal Button] Payment cancelled")
          if (onCancelRef.current) onCancelRef.current()
        },
      })

      if (paypalRef.current) {
        buttonsInstance.render(paypalRef.current).catch((err: any) => {
          console.error("[PayPal Button] Render error:", err)
          if (err.message !== "Detected container element removed from DOM") {
            setError("Failed to render PayPal button")
          }
        })
      }
    } catch (err) {
      console.error("[PayPal Button] Button creation error:", err)
    }

    // Cleanup function
    return () => {
      console.log("[PayPal Button] Cleaning up...")
      if (buttonsInstance && buttonsInstance.close) {
        try {
          buttonsInstance.close()
        } catch (e) {
          // Ignore cleanup errors
          console.log("[PayPal Button] Cleanup error (ignored):", e)
        }
      }
    }
  }, [sdkReady, amount, currency, description])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return <div ref={paypalRef} className="w-full" />
}
