"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Html5Qrcode, Html5QrcodeScanner } from "html5-qrcode"
import { Camera, Keyboard, CheckCircle, XCircle, AlertTriangle, Loader2, Users, Scan, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { formatDateTime } from "@/lib/utils/booking"

interface ScanResult {
  status: "success" | "error" | "warning"
  message: string
  booking?: {
    id: string
    reference: string
    customerName: string
    showTitle: string
    showDatetime: string
    seats: Array<{ section: string; row: string; number: number }>
    specialRequests?: string
    alreadyCheckedIn: boolean
  }
}

export function QRScanner() {
  const [mode, setMode] = useState<"camera" | "manual">("manual") // Default to manual to avoid camera permission issues on load
  const [manualCode, setManualCode] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [autoCheckIn, setAutoCheckIn] = useState(true)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const processingRef = useRef(false)
  const cameraStartedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (scannerRef.current && cameraStartedRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const handleScan = useCallback(
    async (data: string) => {
      // Prevent duplicate scans
      if (processingRef.current || data === lastScannedCode) return

      processingRef.current = true
      setIsProcessing(true)
      setLastScannedCode(data)

      try {
        // First verify the ticket
        const response = await fetch("/api/admin/verify-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrData: data }),
        })

        const verifyResult = await response.json()

        // If valid and auto-check-in enabled, and not already checked in
        if (
          verifyResult.status === "success" &&
          autoCheckIn &&
          verifyResult.booking &&
          !verifyResult.booking.alreadyCheckedIn
        ) {
          // Auto check-in
          const checkInResponse = await fetch("/api/admin/check-in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: verifyResult.booking.id }),
          })

          const checkInResult = await checkInResponse.json()

          if (checkInResult.success) {
            setResult({
              status: "success",
              message: "Billett automatisk sjekket inn!",
              booking: { ...verifyResult.booking, alreadyCheckedIn: true },
            })
          } else {
            setResult({
              status: "error",
              message: checkInResult.error || "Kunne ikke sjekke inn",
              booking: verifyResult.booking,
            })
          }
        } else {
          setResult(verifyResult)
        }
      } catch (err) {
        console.error("[v0] Scan error:", err)
        setResult({
          status: "error",
          message: "Kunne ikke verifisere billett. Prøv igjen.",
        })
      } finally {
        processingRef.current = false
        setIsProcessing(false)

        // Reset last scanned code after 3 seconds to allow re-scanning same code
        setTimeout(() => {
          setLastScannedCode(null)
        }, 3000)
      }
    },
    [autoCheckIn, lastScannedCode],
  )

  const startScanner = async () => {
    if (!containerRef.current || cameraStartedRef.current) return

    try {
      setCameraError(null)
      
      // Create a new scanner instance
      scannerRef.current = new Html5Qrcode("qr-reader")

      // Attempt to get available cameras
      // This will work on any domain - camera access is handled by browser permissions
      let cameras: any[] | null = null
      
      try {
        cameras = await Html5Qrcode.getCameras()
      } catch (cameraErr) {
        const cameraErrMsg = cameraErr instanceof Error ? cameraErr.message : String(cameraErr)
        console.error("[v0] Camera enumeration error:", cameraErrMsg)
        
        // Provide user-friendly error message
        let userMessage = "Kamera ikke tilgjengelig"
        
        if (cameraErrMsg.toLowerCase().includes("permission") || 
            cameraErrMsg.toLowerCase().includes("denied") ||
            cameraErrMsg.toLowerCase().includes("notallowed")) {
          userMessage = "📱 Kameratillatelse avvist.\n\nLøsning:\n1. Klikk på ikonene i adresselinjen\n2. Finn \"Kamera\" eller \"Tillatelser\"\n3. Velg \"Tillat\"\n4. Prøv igjen"
        } else if (cameraErrMsg.toLowerCase().includes("no camera") || 
                   cameraErrMsg.toLowerCase().includes("notfound")) {
          userMessage = "❌ Ingen kamera funnet på enheten.\n\nBruk manuell inngang i stedet."
        } else if (cameraErrMsg.toLowerCase().includes("secure") || 
                   cameraErrMsg.toLowerCase().includes("https")) {
          userMessage = "🔒 Sikkerhetskrav: Bruk HTTPS eller spør IT-støtte\n\nBruk manuell inngang i stedet."
        } else {
          userMessage = `Kamerafeil: ${cameraErrMsg}\n\nBruk manuell inngang i stedet.`
        }
        
        throw new Error(userMessage)
      }

      if (!cameras || cameras.length === 0) {
        throw new Error("Ingen kameraer tilgjengelig på enheten.\n\nBruk manuell inngang i stedet.")
      }

      console.log("[v0] Available cameras:", cameras)

      // Use the back camera if available, otherwise the first camera
      const backCamera = cameras.find((c) => 
        c.label.toLowerCase().includes("back") || 
        c.label.toLowerCase().includes("rear") ||
        c.label.toLowerCase().includes("environment")
      )
      const cameraId = backCamera?.id || cameras[0].id

      console.log("[v0] Starting camera with ID:", cameraId)

      await scannerRef.current.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        async (decodedText) => {
          console.log("[v0] QR code decoded:", decodedText)
          await handleScan(decodedText)
        },
        (errorMessage) => {
          // Silently ignore frame errors (continuous scanning errors)
          if (errorMessage && !errorMessage.includes("NotFoundException")) {
            // Only log if it's a real error, not a scan failure
            if (!errorMessage.includes("No QR code found")) {
              console.debug("[v0] Scanner frame info:", errorMessage)
            }
          }
        },
      )

      cameraStartedRef.current = true
      setIsScanning(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error("[v0] Scanner startup error:", errorMessage)

      // Format error message for user
      const userMessage = errorMessage.includes("\n") 
        ? errorMessage 
        : `❌ Kunne ikke starte kamera:\n${errorMessage}\n\nBruk manuell inngang i stedet.`

      setCameraError(userMessage)
      setResult({
        status: "error",
        message: userMessage,
      })
      
      // Optionally switch to manual mode automatically
      console.info("[v0] Suggest switching to manual mode")
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current && cameraStartedRef.current) {
      try {
        await scannerRef.current.stop()
        cameraStartedRef.current = false
        setIsScanning(false)
        setCameraError(null)
      } catch (err) {
        console.error("[v0] Error stopping scanner:", err)
      }
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return

    setIsProcessing(true)

    try {
      const response = await fetch("/api/admin/verify-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingReference: manualCode.trim().toUpperCase() }),
      })

      const verifyResult = await response.json()

      // If valid and auto-check-in enabled, and not already checked in
      if (
        verifyResult.status === "success" &&
        autoCheckIn &&
        verifyResult.booking &&
        !verifyResult.booking.alreadyCheckedIn
      ) {
        const checkInResponse = await fetch("/api/admin/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: verifyResult.booking.id }),
        })

        const checkInResult = await checkInResponse.json()

        if (checkInResult.success) {
          setResult({
            status: "success",
            message: "Billett sjekket inn!",
            booking: { ...verifyResult.booking, alreadyCheckedIn: true },
          })
        } else {
          setResult({
            status: "error",
            message: checkInResult.error || "Kunne ikke sjekke inn",
            booking: verifyResult.booking,
          })
        }
      } else {
        setResult(verifyResult)
      }
    } catch {
      setResult({
        status: "error",
        message: "Kunne ikke verifisere billett. Prøv igjen.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCheckIn = async () => {
    if (!result?.booking) return

    setIsProcessing(true)

    try {
      const response = await fetch("/api/admin/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: result.booking.id }),
      })

      const checkInResult = await response.json()

      if (checkInResult.success) {
        setResult({
          status: "success",
          message: "Billett sjekket inn!",
          booking: { ...result.booking, alreadyCheckedIn: true },
        })
      } else {
        setResult({
          status: "error",
          message: checkInResult.error || "Kunne ikke sjekke inn",
        })
      }
    } catch {
      setResult({
        status: "error",
        message: "Feil ved innsjekking",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const clearResult = () => {
    setResult(null)
    setManualCode("")
    setLastScannedCode(null)
  }

  // Determine border color based on result status
  const getBorderColor = () => {
    if (!result) return "border-gray-300"
    if (result.status === "success") return "border-green-500"
    if (result.status === "warning") return "border-yellow-500"
    return "border-red-500"
  }

  const getBgColor = () => {
    if (!result) return ""
    if (result.status === "success") return "bg-green-500/5"
    if (result.status === "warning") return "bg-yellow-500/5"
    return "bg-red-500/5"
  }

  return (
    <div className={`w-screen h-screen flex flex-col transition-colors duration-300 ${getBgColor()}`}>
      {/* Header */}
      <div className={`bg-white dark:bg-slate-900 border-b-4 transition-colors ${getBorderColor()} p-4 sticky top-0 z-10`}>
        <h1 className="text-2xl font-bold text-center">Billett Scanner</h1>
        <p className="text-sm text-center text-muted-foreground mt-1">
          {mode === "camera" ? "Hold QR-kode foran kamera" : "Skriv inn bestillingsreferanse"}
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {mode === "camera" ? (
          <div className="flex-1 flex flex-col relative bg-black">
            {/* Camera Feed Container */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <div
                id="qr-reader"
                ref={containerRef}
                className="absolute inset-0 w-full h-full"
              />

              {/* Viewfinder Cutout Overlay */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Darkened areas around cutout */}
                  <div className="absolute inset-0 bg-black/60" />

                  {/* Clear cutout area with border */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-white rounded-lg shadow-2xl" />

                  {/* Corner brackets for better visibility */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none">
                    {/* Top-left corner */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                    {/* Top-right corner */}
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                    {/* Bottom-left corner */}
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                    {/* Bottom-right corner */}
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                  </div>

                  {/* Animated scan line */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none">
                    <div className="absolute inset-0 overflow-hidden rounded-lg">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-red-500 to-transparent animate-pulse" 
                           style={{
                             animation: "scan 2s linear infinite",
                             top: "0%"
                           }} />
                    </div>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-2" />
                    <p className="text-white font-semibold">Verifiserer...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="bg-white dark:bg-slate-900 p-4 space-y-3 border-t">
              {cameraError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Kamerafeil</AlertTitle>
                  <AlertDescription className="text-xs">{cameraError}</AlertDescription>
                </Alert>
              )}

              {!isScanning ? (
                <Button onClick={startScanner} size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
                  <Camera className="mr-2 h-5 w-5" />
                  Start kamera
                </Button>
              ) : (
                <Button onClick={stopScanner} variant="outline" size="lg" className="w-full">
                  <Camera className="mr-2 h-5 w-5" />
                  Stopp kamera
                </Button>
              )}

              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setMode("manual")
                  stopScanner()
                  clearResult()
                }}
                className="w-full"
              >
                <Keyboard className="mr-2 h-5 w-5" />
                Manuell inngang
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <form onSubmit={handleManualSubmit} className="w-full max-w-sm space-y-4">
              <div>
                <label htmlFor="code" className="block text-lg font-bold mb-3 text-center">
                  📋 Bestillingsreferanse
                </label>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Eksempel: THTR-20240315-A3F9
                </p>
                <Input
                  id="code"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Skriv inn referanse..."
                  className="h-16 text-xl font-mono text-center uppercase"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={isProcessing || !manualCode.trim()}
                size="lg"
                className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verifiserer...
                  </>
                ) : (
                  "✓ Verifiser billett"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  setMode("camera")
                  clearResult()
                }}
                className="w-full"
              >
                <Camera className="mr-2 h-5 w-5" />
                Bruk kamera
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Result Overlay */}
      {result && (
        <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50`}>
          <Card className={`w-full max-w-sm border-2 ${getBorderColor()}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {result.status === "success" && <CheckCircle className="h-6 w-6 text-green-500" />}
                {result.status === "warning" && <AlertTriangle className="h-6 w-6 text-yellow-500" />}
                {result.status === "error" && <XCircle className="h-6 w-6 text-red-500" />}
                {result.status === "success" ? "✓ Gyldig" : result.status === "warning" ? "⚠ Advarsel" : "✗ Ugyldig"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center font-semibold text-lg">{result.message}</p>

              {result.booking && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <div className="p-3 bg-muted rounded text-sm">
                    <p className="text-muted-foreground text-xs mb-1">Kunde</p>
                    <p className="font-bold text-base">{result.booking.customerName}</p>
                  </div>

                  <div className="p-3 bg-muted rounded text-sm">
                    <p className="text-muted-foreground text-xs mb-1">Referanse</p>
                    <p className="font-mono font-semibold">{result.booking.reference}</p>
                  </div>

                  <div className="p-3 bg-muted rounded text-sm">
                    <p className="text-muted-foreground text-xs mb-1">Forestilling</p>
                    <p className="font-semibold">{result.booking.showTitle}</p>
                    <p className="text-muted-foreground text-xs">{formatDateTime(result.booking.showDatetime)}</p>
                  </div>

                  <div className="p-3 bg-muted rounded text-sm">
                    <p className="text-muted-foreground text-xs mb-2">Seter</p>
                    <div className="flex flex-wrap gap-2">
                      {result.booking.seats.map((seat, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {seat.section} R{seat.row} S{seat.number}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {result.booking.specialRequests && (
                    <Alert className="text-sm">
                      <Users className="h-4 w-4" />
                      <AlertTitle className="text-sm">Spesielle behov</AlertTitle>
                      <AlertDescription className="text-xs">{result.booking.specialRequests}</AlertDescription>
                    </Alert>
                  )}

                  {!result.booking.alreadyCheckedIn &&
                    (result.status === "success" || result.status === "warning") &&
                    !autoCheckIn && (
                      <Button
                        onClick={handleCheckIn}
                        disabled={isProcessing}
                        size="lg"
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Sjekker inn...
                          </>
                        ) : (
                          "✓ Marker som sjekket inn"
                        )}
                      </Button>
                    )}

                  {result.booking.alreadyCheckedIn && (
                    <div className="p-3 bg-green-500/10 border border-green-500 rounded text-center">
                      <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                      <p className="text-green-700 dark:text-green-400 font-semibold text-sm">Allerede innsjekket</p>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={clearResult} size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
                Skann neste
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0%;
          }
          100% {
            top: 100%;
          }
        }
      `}</style>
    </div>
  )
}
