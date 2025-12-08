"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Camera, Keyboard, CheckCircle, XCircle, AlertTriangle, Loader2, Users, Volume2, VolumeX, AlertCircle } from "lucide-react"
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
  const [mode, setMode] = useState<"camera" | "manual">("camera")
  const [manualCode, setManualCode] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [autoCheckIn, setAutoCheckIn] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanLoopRef = useRef<number | null>(null)
  const processingRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Load jsQR dynamically
  const jsQRRef = useRef<any>(null)

  useEffect(() => {
    const loadJsQR = async () => {
      const module = await import("jsqr")
      jsQRRef.current = module.default
    }
    loadJsQR()
  }, [])

  const playBeep = useCallback(() => {
    if (!soundEnabled) return
    try {
      const ctx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = ctx
      if (ctx.state === "suspended") ctx.resume()

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(800, now)
      osc.frequency.setValueAtTime(600, now + 0.1)
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
      osc.start(now)
      osc.stop(now + 0.2)
    } catch {
      // Audio not available
    }
  }, [soundEnabled])

  const verifyBooking = useCallback(
    async (code: string) => {
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

        if (verifyResult.status === "success" && autoCheckIn && verifyResult.booking && !verifyResult.booking.alreadyCheckedIn) {
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
        console.error("Verification error:", err)
        setResult({ status: "error", message: "Feil ved verifikasjon" })
      } finally {
        processingRef.current = false
        setIsProcessing(false)
        setTimeout(() => setLastScannedCode(null), 2000)
      }
    },
    [autoCheckIn, lastScannedCode, playBeep]
  )

  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !jsQRRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      scanLoopRef.current = requestAnimationFrame(scanQRCode)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQRRef.current(imageData.data, canvas.width, canvas.height)

      if (code) {
        verifyBooking(code.data)
        return
      }
    } catch {
      // Continue scanning
    }

    scanLoopRef.current = requestAnimationFrame(scanQRCode)
  }, [verifyBooking])

  const startScanning = useCallback(async () => {
    if (isScanning) return
    
    console.log("Starting camera...")
    setCameraError(null)

    try {
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }
      
      console.log("Requesting camera with constraints:", constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("Got stream:", stream)

      streamRef.current = stream
      if (videoRef.current) {
        console.log("Setting video srcObject...")
        videoRef.current.srcObject = stream
        
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded, playing...")
          videoRef.current?.play().catch((e) => {
            console.error("Play error:", e)
          })
          setIsScanning(true)
          console.log("Scan state set to true, starting scan loop")
          scanLoopRef.current = requestAnimationFrame(scanQRCode)
        }
        
        videoRef.current.onerror = (e) => {
          console.error("Video error:", e)
          setCameraError("Videofeil")
        }
      }
    } catch (err: any) {
      const message = err?.message || "Unable to access camera"
      console.error("Camera error:", err)

      let userMessage = "Kamerafeil"
      if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("denied")) {
        userMessage = "Kameratillatelse avvist"
      } else if (message.toLowerCase().includes("no camera") || message.toLowerCase().includes("notfound")) {
        userMessage = "Ingen kamera funnet"
      } else if (message.toLowerCase().includes("not supported")) {
        userMessage = "Kamera ikke støttet"
      }

      console.error("User message:", userMessage)
      setCameraError(userMessage)
    }
  }, [isScanning, scanQRCode])

  const stopScanning = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current)
      scanLoopRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
    setCameraError(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [stopScanning])

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

      if (verifyResult.status === "success" && autoCheckIn && verifyResult.booking && !verifyResult.booking.alreadyCheckedIn) {
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
      setResult({ status: "error", message: "Feil ved verifikasjon" })
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
          message: "✓ Billett innsjekket!",
          booking: { ...result.booking, alreadyCheckedIn: true },
        })
      } else {
        setResult({ status: "error", message: "Innsjekking feilet" })
      }
    } catch {
      setResult({ status: "error", message: "Innsjekking feilet" })
    } finally {
      setIsProcessing(false)
    }
  }

  const clearResult = () => {
    setResult(null)
    setManualCode("")
  }

  const getStatusColor = () => {
    if (!result) return "border-slate-300"
    return result.status === "success" ? "border-green-500" : result.status === "warning" ? "border-yellow-500" : "border-red-500"
  }

  const getStatusBg = () => {
    if (!result) return ""
    return result.status === "success" ? "bg-green-50 dark:bg-green-950" : result.status === "warning" ? "bg-yellow-50 dark:bg-yellow-950" : "bg-red-50 dark:bg-red-950"
  }

  return (
    <div className={`w-screen h-screen flex flex-col ${getStatusBg()} transition-colors`}>
      <div className={`bg-white dark:bg-slate-900 border-b-4 ${getStatusColor()} p-4 sticky top-0 z-10`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">🎫 Billettscanner</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "camera" ? "📸 Hold QR-kode foran kamera" : "⌨️ Skriv inn referanse"}
            </p>
          </div>
          <div className="flex gap-2">
            {isScanning && (
              <Button size="sm" variant="outline" onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {mode === "camera" ? (
          <div className="flex-1 flex flex-col relative bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              style={{ display: isScanning ? "block" : "none" }}
            />

            <canvas ref={canvasRef} style={{ display: "none" }} />

            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center">
                  <Camera className="h-12 w-12 text-white mx-auto mb-4 opacity-50" />
                  <p className="text-white text-lg font-semibold">Kamera ikke aktiv</p>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-3" />
                  <p className="text-white font-bold">Verifiserer...</p>
                </div>
              </div>
            )}

            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-80 h-80">
                  <div className="absolute inset-0 border-4 border-green-400 rounded-lg shadow-2xl" />
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-green-500" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-green-500" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-green-500" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-green-500" />
                </div>
              </div>
            )}

            <div className="bg-gradient-to-t from-slate-900 to-slate-900/80 p-4 space-y-3 border-t border-slate-700">
              {cameraError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{cameraError}</AlertTitle>
                </Alert>
              )}

              <div className="flex gap-2">
                {!isScanning ? (
                  <Button onClick={startScanning} size="lg" className="flex-1 bg-green-600 hover:bg-green-700 font-bold gap-2">
                    <Camera className="h-5 w-5" />
                    Start kamera
                  </Button>
                ) : (
                  <Button onClick={stopScanning} size="lg" variant="destructive" className="flex-1 font-bold gap-2">
                    <Camera className="h-5 w-5" />
                    Stopp kamera
                  </Button>
                )}

                <Button onClick={() => { setMode("manual"); stopScanning() }} size="lg" variant="outline" className="flex-1 font-bold">
                  Manuell
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <form onSubmit={handleManualSubmit} className="w-full max-w-sm space-y-6">
              <div className="text-center">
                <Keyboard className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <h2 className="text-2xl font-bold mb-2">Manuell inngang</h2>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Bestillingsreferanse</label>
                <Input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="F.eks: THTR-20240315-A3F9"
                  className="h-12 text-lg font-mono text-center uppercase tracking-widest"
                  autoFocus
                />
              </div>

              <Button type="submit" disabled={isProcessing || !manualCode.trim()} size="lg" className="w-full bg-blue-600 hover:bg-blue-700 font-bold">
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

              <Button type="button" onClick={() => { setMode("camera"); startScanning() }} size="lg" variant="outline" className="w-full font-bold">
                <Camera className="mr-2 h-4 w-4" />
                Bruk kamera
              </Button>
            </form>
          </div>
        )}
      </div>

      {result && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <Card className={`w-full max-w-lg border-2 ${getStatusColor()} shadow-2xl`}>
            <CardHeader className={getStatusBg()}>
              <CardTitle className="flex items-center gap-2">
                {result.status === "success" && <CheckCircle className="h-6 w-6 text-green-600" />}
                {result.status === "warning" && <AlertTriangle className="h-6 w-6 text-yellow-600" />}
                {result.status === "error" && <XCircle className="h-6 w-6 text-red-600" />}
                {result.status === "success" ? "✓ Gyldig" : result.status === "warning" ? "⚠ Advarsel" : "✗ Ugyldig"}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-6">
              <p className="text-center font-bold text-lg">{result.message}</p>

              {result.booking && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">👤 KUNDE</p>
                    <p className="font-bold">{result.booking.customerName}</p>
                  </div>

                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded">
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">📋 REFERANSE</p>
                    <p className="font-mono font-bold">{result.booking.reference}</p>
                  </div>

                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded">
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1">🎭 FORESTILLING</p>
                    <p className="font-bold">{result.booking.showTitle}</p>
                    <p className="text-sm">📅 {formatDateTime(result.booking.showDatetime)}</p>
                  </div>

                  <div className="p-3 bg-pink-100 dark:bg-pink-900 rounded">
                    <p className="text-xs font-semibold text-pink-700 dark:text-pink-300 mb-2">🎫 SETER</p>
                    <div className="flex flex-wrap gap-2">
                      {result.booking.seats.map((seat, i) => (
                        <Badge key={i}>{seat.section} R{seat.row} S{seat.number}</Badge>
                      ))}
                    </div>
                  </div>

                  {result.booking.specialRequests && (
                    <Alert>
                      <Users className="h-4 w-4" />
                      <AlertTitle>Spesielle behov</AlertTitle>
                      <AlertDescription>{result.booking.specialRequests}</AlertDescription>
                    </Alert>
                  )}

                  {!result.booking.alreadyCheckedIn && (result.status === "success" || result.status === "warning") && !autoCheckIn && (
                    <Button onClick={handleCheckIn} disabled={isProcessing} size="lg" className="w-full bg-green-600 hover:bg-green-700 font-bold">
                      {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      Sjekk inn billett
                    </Button>
                  )}

                  {result.booking.alreadyCheckedIn && (
                    <div className="p-3 bg-green-100 dark:bg-green-900 border-2 border-green-500 rounded text-center">
                      <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <p className="font-bold text-green-900">✓ Allerede innsjekket</p>
                    </div>
                  )}
                </div>
              )}

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
