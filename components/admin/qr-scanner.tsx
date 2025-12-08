"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Camera, Keyboard, CheckCircle, XCircle, AlertTriangle, Loader2, Users, Scan, AlertCircle, Volume2, VolumeX } from "lucide-react"
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
  const [mode, setMode] = useState<"camera" | "manual">("camera")
  const [manualCode, setManualCode] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [autoCheckIn, setAutoCheckIn] = useState(true)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const processingRef = useRef(false)
  const cameraStartedRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Play success sound
  const playSound = useCallback(() => {
    if (!soundEnabled) return

    try {
      const audioContext = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      const now = audioContext.currentTime
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(800, now)
      oscillator.frequency.setValueAtTime(600, now + 0.1)
      
      gainNode.gain.setValueAtTime(0.3, now)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2)

      oscillator.start(now)
      oscillator.stop(now + 0.2)
    } catch (err) {
      console.debug("Audio playback not available:", err)
    }
  }, [soundEnabled])

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !cameraStartedRef.current) return

    try {
      const stream = await (scannerRef.current as any).getVideoStream?.()
      if (stream?.getVideoTracks?.()[0]) {
        const track = stream.getVideoTracks()[0]
        const settings = track.getSettings?.()
        
        if (settings?.torch !== undefined) {
          await track.applyConstraints({ advanced: [{ torch: !torchEnabled }] })
          setTorchEnabled(!torchEnabled)
        }
      }
    } catch (err) {
      console.debug("Torch not available:", err)
    }
  }, [torchEnabled])

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
        // Play success sound
        playSound()

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
        console.error("[QR Scanner] Scan error:", err)
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
    [autoCheckIn, lastScannedCode, playSound],
  )

  const startScanner = async () => {
    if (!containerRef.current || cameraStartedRef.current) return

    try {
      setCameraError(null)
      
      // Ensure container has an ID
      const scannerId = "qr-reader-scanner"
      if (!containerRef.current.id) {
        containerRef.current.id = scannerId
      }
      
      // Clear any previous content
      containerRef.current.innerHTML = ""
      
      // Create a new scanner instance
      scannerRef.current = new Html5Qrcode(scannerId)

      // Get available cameras
      let cameras: any[] | null = null
      
      try {
        cameras = await Html5Qrcode.getCameras()
      } catch (cameraErr) {
        const cameraErrMsg = cameraErr instanceof Error ? cameraErr.message : String(cameraErr)
        console.error("[QR Scanner] Camera enumeration error:", cameraErrMsg)
        
        let userMessage = "Kamera ikke tilgjengelig"
        
        if (cameraErrMsg.toLowerCase().includes("permission") || 
            cameraErrMsg.toLowerCase().includes("denied") ||
            cameraErrMsg.toLowerCase().includes("notallowed")) {
          userMessage = "📱 Kameratillatelse avvist.\n\nLøsning:\n1. Klikk på kameraikon i adresselinjen\n2. Velg \"Tillat\"\n3. Prøv igjen"
        } else if (cameraErrMsg.toLowerCase().includes("no camera") || 
                   cameraErrMsg.toLowerCase().includes("notfound")) {
          userMessage = "❌ Ingen kamera funnet på enheten.\n\nBruk manuell inngang i stedet."
        } else if (cameraErrMsg.toLowerCase().includes("secure") || 
                   cameraErrMsg.toLowerCase().includes("https")) {
          userMessage = "🔒 Krever HTTPS eller localhost.\n\nBruk manuell inngang i stedet."
        }
        
        throw new Error(userMessage)
      }

      if (!cameras || cameras.length === 0) {
        throw new Error("Ingen kameraer tilgjengelig på enheten.\n\nBruk manuell inngang i stedet.")
      }

      // Prefer back/rear camera
      let selectedCamera = cameras[0]
      for (const camera of cameras) {
        const label = camera.label.toLowerCase()
        if (label.includes("back") || label.includes("rear") || label.includes("environment") || label.includes("bakvend")) {
          selectedCamera = camera
          break
        }
      }

      console.log("[QR Scanner] Using camera:", selectedCamera.label)

      // Start scanner with optimized settings for faster detection
      await scannerRef.current.start(
        selectedCamera.id,
        {
          fps: 30,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
          disableFlip: false,
        } as any,
        async (decodedText) => {
          console.log("[QR Scanner] QR decoded:", decodedText.substring(0, 50) + "...")
          await handleScan(decodedText)
        },
        (errorMessage) => {
          // Silently ignore scan frame errors
        },
      )

      cameraStartedRef.current = true
      setIsScanning(true)
      
      // Try to enable torch capability
      try {
        const constraints = { video: { facingMode: "environment" } }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        const track = stream.getVideoTracks()[0]
        const capabilities = track.getCapabilities?.() as any
        if (capabilities?.torch) {
          setTorchEnabled(false)
        }
      } catch {}
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error("[QR Scanner] Startup error:", errorMessage)

      const userMessage = errorMessage.includes("\n") 
        ? errorMessage 
        : `❌ Kamerafeil:\n${errorMessage}`

      setCameraError(userMessage)
      setResult({
        status: "error",
        message: userMessage,
      })
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
      <div className={`bg-white dark:bg-slate-900 border-b-4 transition-colors ${getBorderColor()} p-3 sticky top-0 z-10`}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">🎫 Billett Scanner</h1>
          <div className="flex gap-2">
            {isScanning && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleTorch}
                  className="gap-2"
                  title="Slå på/av lommelykt"
                >
                  {torchEnabled ? <AlertCircle className="h-4 w-4 text-yellow-500" /> : <Camera className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="gap-2"
                  title="Slå på/av lyd"
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>
        <p className="text-sm text-center text-muted-foreground">
          {mode === "camera" ? "📸 Hold QR-kode foran kamera" : "⌨️ Skriv inn bestillingsreferanse"}
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {mode === "camera" ? (
          <div className="flex-1 flex flex-col relative bg-black overflow-hidden">
            {/* Camera Feed Container */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <div
                id="qr-reader-scanner"
                ref={containerRef}
                className="absolute inset-0 w-full h-full"
              />

              {/* Viewfinder Overlay */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Darkened areas */}
                  <div className="absolute inset-0 bg-black/40" />

                  {/* Scan area frame */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72">
                    {/* Animated corners */}
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-green-400 rounded-br-lg" />

                    {/* Center circle guide */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-dashed border-green-300 rounded-full opacity-50" />
                  </div>

                  {/* Scan instruction text */}
                  <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-white text-center text-sm font-semibold bg-black/50 px-4 py-2 rounded">
                    🎯 Zentrér QR-koden
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 backdrop-blur-sm">
                  <div className="text-center">
                    <Loader2 className="h-16 w-16 text-white animate-spin mx-auto mb-4" />
                    <p className="text-white font-bold text-lg">Verifiserer billett...</p>
                    <p className="text-gray-300 text-sm mt-2">Vennligst vent</p>
                  </div>
                </div>
              )}

              {!isScanning && !isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                  <div className="text-center">
                    <Camera className="h-16 w-16 text-white mx-auto mb-4 opacity-50" />
                    <p className="text-white text-lg font-semibold">Kamera er stoppet</p>
                    <p className="text-gray-400 text-sm mt-2">Trykk på \"Start kamera\" for å begynne</p>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent p-4 space-y-3 border-t border-slate-700">
              {cameraError && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Kamerafeil</AlertTitle>
                  <AlertDescription className="text-xs whitespace-pre-line">{cameraError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                {!isScanning ? (
                  <Button onClick={startScanner} size="lg" className="flex-1 bg-green-600 hover:bg-green-700 font-bold">
                    <Camera className="mr-2 h-5 w-5" />
                    Start kamera
                  </Button>
                ) : (
                  <Button onClick={stopScanner} variant="destructive" size="lg" className="flex-1 font-bold">
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
                  className="flex-1"
                >
                  <Keyboard className="mr-2 h-5 w-5" />
                  Manuell
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
            <form onSubmit={handleManualSubmit} className="w-full max-w-md space-y-6">
              <div className="text-center mb-6">
                <Keyboard className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <h2 className="text-2xl font-bold mb-2">Manuell inngang</h2>
                <p className="text-muted-foreground">Skriv inn bestillingsreferansen fra billetten</p>
              </div>

              <div className="space-y-3">
                <label htmlFor="code" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Bestillingsreferanse
                </label>
                <Input
                  id="code"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="F.eks: THTR-20240315-A3F9"
                  className="h-14 text-xl font-mono text-center uppercase tracking-widest border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">
                  Gjerne bare bokstaver og tall
                </p>
              </div>

              <Button
                type="submit"
                disabled={isProcessing || !manualCode.trim()}
                size="lg"
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 font-bold"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verifiserer...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Verifiser billett
                  </>
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
                className="w-full h-12 font-semibold"
              >
                <Camera className="mr-2 h-5 w-5" />
                Bruk kamera i stedet
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Result Overlay */}
      {result && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in`}>
          <Card className={`w-full max-w-lg border-2 shadow-2xl ${getBorderColor()} animate-in zoom-in`}>
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
              <CardTitle className="flex items-center gap-3 text-2xl">
                {result.status === "success" && <CheckCircle className="h-8 w-8 text-green-500 animate-bounce" />}
                {result.status === "warning" && <AlertTriangle className="h-8 w-8 text-yellow-500 animate-pulse" />}
                {result.status === "error" && <XCircle className="h-8 w-8 text-red-500 animate-pulse" />}
                <span>
                  {result.status === "success" ? "✓ Gyldig billett" : result.status === "warning" ? "⚠ Advarsel" : "✗ Ugyldig"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <p className="text-center font-bold text-xl text-gray-800 dark:text-gray-200">{result.message}</p>

              {result.booking && (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">👤 KUNDE</p>
                    <p className="font-bold text-lg text-gray-900 dark:text-white">{result.booking.customerName}</p>
                  </div>

                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">📋 REFERANSE</p>
                    <p className="font-mono font-bold text-lg text-gray-900 dark:text-white tracking-wider">{result.booking.reference}</p>
                  </div>

                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1">🎭 FORESTILLING</p>
                    <p className="font-semibold text-lg text-gray-900 dark:text-white">{result.booking.showTitle}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">📅 {formatDateTime(result.booking.showDatetime)}</p>
                  </div>

                  <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                    <p className="text-xs font-semibold text-pink-700 dark:text-pink-300 mb-3">🎫 SETER</p>
                    <div className="flex flex-wrap gap-2">
                      {result.booking.seats.map((seat, i) => (
                        <Badge key={i} variant="secondary" className="text-sm px-3 py-1">
                          {seat.section} · Rad {seat.row} · Sete {seat.number}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {result.booking.specialRequests && (
                    <Alert className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                      <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      <AlertTitle className="text-orange-900 dark:text-orange-200">Spesielle behov</AlertTitle>
                      <AlertDescription className="text-orange-800 dark:text-orange-300 mt-1">{result.booking.specialRequests}</AlertDescription>
                    </Alert>
                  )}

                  {!result.booking.alreadyCheckedIn &&
                    (result.status === "success" || result.status === "warning") &&
                    !autoCheckIn && (
                      <Button
                        onClick={handleCheckIn}
                        disabled={isProcessing}
                        size="lg"
                        className="w-full h-12 bg-green-600 hover:bg-green-700 font-bold"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Sjekker inn...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-5 w-5" />
                            Marker som sjekket inn
                          </>
                        )}
                      </Button>
                    )}

                  {result.booking.alreadyCheckedIn && (
                    <div className="p-4 bg-green-100 dark:bg-green-900/30 border-2 border-green-500 rounded-lg text-center">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                      <p className="text-green-900 dark:text-green-200 font-bold text-lg">✓ Allerede innsjekket</p>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={clearResult} size="lg" className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold text-base">
                Skann neste billett →
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
