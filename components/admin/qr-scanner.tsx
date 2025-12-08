"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Html5QrcodeScanner } from "html5-qrcode"
import { Camera, Keyboard, CheckCircle, XCircle, AlertTriangle, Loader2, Users, AlertCircle, Volume2, VolumeX, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
  // State management
  const [mode, setMode] = useState<"camera" | "manual">("camera")
  const [manualCode, setManualCode] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [autoCheckIn, setAutoCheckIn] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  
  // Refs for scanner management
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const scannerRenderedRef = useRef(false)
  const processingRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch (err) {
          console.debug("[QR Scanner] Cleanup error:", err)
        }
      }
    }
  }, [])

  // Play beep sound on successful scan
  const playBeep = useCallback(() => {
    if (!soundEnabled) return

    try {
      const audioContext = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      if (audioContext.state === "suspended") {
        audioContext.resume()
      }

      const now = audioContext.currentTime
      const osc = audioContext.createOscillator()
      const gain = audioContext.createGain()

      osc.connect(gain)
      gain.connect(audioContext.destination)

      // Two beeps: higher pitch, then lower
      osc.frequency.setValueAtTime(800, now)
      osc.frequency.setValueAtTime(600, now + 0.1)
      
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)

      osc.start(now)
      osc.stop(now + 0.2)
    } catch (err) {
      console.debug("[QR Scanner] Audio not available")
    }
  }, [soundEnabled])

  // Handle QR code scan result
  const handleScan = useCallback(
    async (code: string) => {
      // Prevent duplicate processing
      if (processingRef.current || code === lastScannedCode) return

      processingRef.current = true
      setIsProcessing(true)
      setLastScannedCode(code)

      try {
        playBeep()

        const response = await fetch("/api/admin/verify-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrData: code }),
        })

        const verifyResult = await response.json()

        // Auto check-in if enabled and valid
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
              message: "✓ Billett innsjekket!",
              booking: { ...verifyResult.booking, alreadyCheckedIn: true },
            })
          } else {
            setResult(verifyResult)
          }
        } else {
          setResult(verifyResult)
        }
      } catch (err) {
        console.error("[QR Scanner] Scan error:", err)
        setResult({
          status: "error",
          message: "Feil ved scanning. Prøv igjen.",
        })
      } finally {
        processingRef.current = false
        setIsProcessing(false)

        // Allow re-scanning same code after delay
        setTimeout(() => setLastScannedCode(null), 2000)
      }
    },
    [autoCheckIn, lastScannedCode, playBeep]
  )

  // Start the QR scanner
  const startScanner = useCallback(async () => {
    if (scannerRenderedRef.current || isScanning) return

    try {
      setCameraError(null)

      // Create scanner instance
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 20,
          qrbox: { width: 300, height: 300 },
          aspectRatio: 1.0,
          disableFlip: false,
        } as any,
        false // verbose off
      )

      // Render scanner to DOM
      await scannerRef.current.render(
        async (decodedText: string) => {
          await handleScan(decodedText)
        },
        (errorMessage: string) => {
          // Ignore frame parsing errors
        }
      )

      scannerRenderedRef.current = true
      setIsScanning(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[QR Scanner] Start error:", message)

      let userMessage = message
      if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("denied")) {
        userMessage = "Kameratillatelse avvist. Sjekk nettleserinstellinger."
      } else if (message.toLowerCase().includes("no camera") || message.toLowerCase().includes("notfound")) {
        userMessage = "Ingen kamera funnet på enheten."
      } else if (message.toLowerCase().includes("secure") || message.toLowerCase().includes("https")) {
        userMessage = "Krever sikker forbindelse (HTTPS)."
      }

      setCameraError(userMessage)
      setIsScanning(false)
    }
  }, [isScanning, handleScan])

  // Stop the QR scanner
  const stopScanner = useCallback(async () => {
    if (!scannerRef.current || !scannerRenderedRef.current) return

    try {
      await scannerRef.current.clear()
      scannerRenderedRef.current = false
      setIsScanning(false)
      setCameraError(null)
    } catch (err) {
      console.error("[QR Scanner] Stop error:", err)
    }
  }, [])

  // Handle manual code submission
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

      // Auto check-in if enabled
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
            message: "✓ Billett innsjekket!",
            booking: { ...verifyResult.booking, alreadyCheckedIn: true },
          })
        } else {
          setResult(verifyResult)
        }
      } else {
        setResult(verifyResult)
      }
    } catch (err) {
      console.error("[QR Scanner] Manual submission error:", err)
      setResult({
        status: "error",
        message: "Feil ved verifikasjon. Prøv igjen.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle manual check-in button
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
          message: "✓ Billett innsjekket!",
          booking: { ...result.booking, alreadyCheckedIn: true },
        })
      } else {
        setResult({
          status: "error",
          message: checkInResult.error || "Innsjekking feilet",
        })
      }
    } catch (err) {
      console.error("[QR Scanner] Check-in error:", err)
      setResult({
        status: "error",
        message: "Innsjekking feilet",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Clear result and reset for next scan
  const clearResult = () => {
    setResult(null)
    setManualCode("")
  }

  // Get color based on result status
  const getStatusColor = () => {
    if (!result) return "border-slate-300"
    return result.status === "success"
      ? "border-green-500"
      : result.status === "warning"
        ? "border-yellow-500"
        : "border-red-500"
  }

  const getStatusBgColor = () => {
    if (!result) return ""
    return result.status === "success"
      ? "bg-green-50 dark:bg-green-950"
      : result.status === "warning"
        ? "bg-yellow-50 dark:bg-yellow-950"
        : "bg-red-50 dark:bg-red-950"
  }

  return (
    <div className={`w-screen h-screen flex flex-col ${getStatusBgColor()} transition-colors duration-300`}>
      {/* Header */}
      <div className={`bg-white dark:bg-slate-900 border-b-4 ${getStatusColor()} p-4 sticky top-0 z-10`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">🎫 Billettscanner</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "camera" ? "📸 Hold QR-kode foran kamera" : "⌨️ Skriv inn bestillingsreferanse"}
            </p>
          </div>
          <div className="flex gap-2">
            {isScanning && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? "Slå av lyd" : "Slå på lyd"}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    stopScanner()
                    setMode("manual")
                  }}
                  title="Bytt til manuell inngang"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {mode === "camera" ? (
          // Camera Mode
          <div className="flex-1 flex flex-col relative bg-black">
            {/* Scanner Container */}
            <div className="flex-1 relative" id="qr-reader" />

            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-3" />
                  <p className="text-white font-bold">Verifiserer billett...</p>
                </div>
              </div>
            )}

            {/* Camera Controls */}
            <div className="bg-gradient-to-t from-slate-900 to-slate-900/80 p-4 space-y-3 border-t border-slate-700">
              {cameraError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Kamerafeil</AlertTitle>
                  <AlertDescription className="text-xs">{cameraError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                {!isScanning ? (
                  <Button
                    onClick={startScanner}
                    size="lg"
                    className="flex-1 bg-green-600 hover:bg-green-700 font-bold gap-2"
                  >
                    <Camera className="h-5 w-5" />
                    Start kamera
                  </Button>
                ) : (
                  <Button
                    onClick={stopScanner}
                    size="lg"
                    variant="destructive"
                    className="flex-1 font-bold gap-2"
                  >
                    <Camera className="h-5 w-5" />
                    Stopp kamera
                  </Button>
                )}

                <Button
                  onClick={() => setMode("manual")}
                  size="lg"
                  variant="outline"
                  className="flex-1 font-bold"
                >
                  Manuell
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Manual Mode
          <div className="flex-1 flex items-center justify-center p-6">
            <form onSubmit={handleManualSubmit} className="w-full max-w-sm space-y-6">
              <div className="text-center">
                <Keyboard className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <h2 className="text-2xl font-bold mb-2">Manuell inngang</h2>
                <p className="text-sm text-muted-foreground">Skriv inn bestillingsreferansen</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Bestillingsreferanse</label>
                <Input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="F.eks: THTR-20240315-A3F9"
                  className="h-12 text-lg font-mono text-center uppercase tracking-widest border-2"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={isProcessing || !manualCode.trim()}
                size="lg"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifiserer...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Verifiser
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={() => {
                  setMode("camera")
                  startScanner()
                }}
                size="lg"
                variant="outline"
                className="w-full font-bold"
              >
                <Camera className="mr-2 h-4 w-4" />
                Bruk kamera
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Result Modal */}
      {result && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <Card className={`w-full max-w-lg border-2 ${getStatusColor()} shadow-2xl`}>
            <CardHeader className={getStatusBgColor()}>
              <CardTitle className="flex items-center gap-2 text-xl">
                {result.status === "success" && <CheckCircle className="h-6 w-6 text-green-600" />}
                {result.status === "warning" && <AlertTriangle className="h-6 w-6 text-yellow-600" />}
                {result.status === "error" && <XCircle className="h-6 w-6 text-red-600" />}
                {result.status === "success" ? "✓ Gyldig" : result.status === "warning" ? "⚠ Advarsel" : "✗ Ugyldig"}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-6">
              <p className="text-center font-bold text-lg">{result.message}</p>

              {result.booking && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {/* Customer */}
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded border border-blue-300 dark:border-blue-700">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">👤 KUNDE</p>
                    <p className="font-bold">{result.booking.customerName}</p>
                  </div>

                  {/* Reference */}
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded border border-purple-300 dark:border-purple-700">
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">📋 REFERANSE</p>
                    <p className="font-mono font-bold tracking-widest">{result.booking.reference}</p>
                  </div>

                  {/* Show */}
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded border border-indigo-300 dark:border-indigo-700">
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1">🎭 FORESTILLING</p>
                    <p className="font-bold">{result.booking.showTitle}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">📅 {formatDateTime(result.booking.showDatetime)}</p>
                  </div>

                  {/* Seats */}
                  <div className="p-3 bg-pink-100 dark:bg-pink-900 rounded border border-pink-300 dark:border-pink-700">
                    <p className="text-xs font-semibold text-pink-700 dark:text-pink-300 mb-2">🎫 SETER</p>
                    <div className="flex flex-wrap gap-2">
                      {result.booking.seats.map((seat, i) => (
                        <Badge key={i} variant="secondary">
                          {seat.section} R{seat.row} S{seat.number}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Special Requests */}
                  {result.booking.specialRequests && (
                    <Alert>
                      <Users className="h-4 w-4" />
                      <AlertTitle>Spesielle behov</AlertTitle>
                      <AlertDescription>{result.booking.specialRequests}</AlertDescription>
                    </Alert>
                  )}

                  {/* Check-in Button */}
                  {!result.booking.alreadyCheckedIn &&
                    (result.status === "success" || result.status === "warning") &&
                    !autoCheckIn && (
                      <Button
                        onClick={handleCheckIn}
                        disabled={isProcessing}
                        size="lg"
                        className="w-full bg-green-600 hover:bg-green-700 font-bold"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sjekker inn...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Sjekk inn billett
                          </>
                        )}
                      </Button>
                    )}

                  {/* Already Checked In Message */}
                  {result.booking.alreadyCheckedIn && (
                    <div className="p-3 bg-green-100 dark:bg-green-900 border-2 border-green-500 rounded text-center">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-1" />
                      <p className="font-bold text-green-900 dark:text-green-200">✓ Allerede innsjekket</p>
                    </div>
                  )}
                </div>
              )}

              {/* Next Scan Button */}
              <Button onClick={clearResult} size="lg" className="w-full bg-blue-600 hover:bg-blue-700 font-bold">
                Skann neste billett
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
