"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Camera, Keyboard, Loader2, CheckCircle, AlertCircle, XCircle } from "lucide-react"
import { formatDateTime } from "@/lib/utils/booking"

interface BookingResult {
  id: string
  reference: string
  customerName: string
  showTitle: string
  showDatetime: string
  seats: Array<{ section: string; row: string; number: number }>
  alreadyCheckedIn: boolean
}

export function QRScanner() {
  const [mode, setMode] = useState<"camera" | "manual">("camera")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ status: "success" | "error" | "warning"; message: string; booking?: BookingResult } | null>(null)
  const [manualCode, setManualCode] = useState("")
  const [cameraError, setCameraError] = useState("")
  const [isCameraActive, setIsCameraActive] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  const lastDetectionRef = useRef<string>("")
  const detectionLockRef = useRef(false)

  const detectQRInFrame = async (canvas: HTMLCanvasElement): Promise<string | null> => {
    try {
      const ctx = canvas.getContext("2d")
      if (!ctx) return null

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      try {
        const jsQR = await import("jsqr").then(m => m.default)
        const code = jsQR(imageData.data, canvas.width, canvas.height)
        if (code?.data) return code.data
      } catch {
        // jsQR not available
      }

      return null
    } catch {
      return null
    }
  }

  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const qrData = await detectQRInFrame(canvas)
      if (qrData && !detectionLockRef.current && qrData !== lastDetectionRef.current) {
        lastDetectionRef.current = qrData
        detectionLockRef.current = true
        await verifyQR(qrData)
        setTimeout(() => {
          detectionLockRef.current = false
        }, 1000)
        return
      }
    }

    animationRef.current = requestAnimationFrame(scanFrame)
  }

  const startCamera = async () => {
    try {
      setCameraError("")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsCameraActive(true)
        animationRef.current = requestAnimationFrame(scanFrame)
      }
    } catch (err: any) {
      const msg = err?.message || "Cannot access camera"
      if (msg.includes("NotAllowedError") || msg.includes("permission")) {
        setCameraError("📱 Camera permission denied. Please enable it in settings.")
      } else if (msg.includes("NotFoundError")) {
        setCameraError("📷 No camera found on this device.")
      } else {
        setCameraError(`Camera error: ${msg}`)
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
    lastDetectionRef.current = ""
    detectionLockRef.current = false
  }

  const verifyQR = async (qrCode: string) => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/verify-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrData: qrCode }),
      })

      const data = await res.json()
      // If verification succeeded and booking present
      if (data.status === "success" && data.booking) {
        // If booking is not already checked in, the verify endpoint should have marked it used.
        // We still attempt a check-in call for compatibility, but skip if alreadyCheckedIn is true.
        if (!data.booking.alreadyCheckedIn) {
          try {
            const checkInRes = await fetch("/api/admin/check-in", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookingId: data.booking.id }),
            })

            if (checkInRes.ok) {
              setResult({
                status: "success",
                message: "✅ Ticket checked in!",
                booking: { ...data.booking, alreadyCheckedIn: true },
              })
              stopCamera()
            } else {
              // If check-in failed, still show verification result
              setResult(data)
              stopCamera()
            }
          } catch (err) {
            setResult({ status: "error", message: "❌ Check-in failed" })
            stopCamera()
          }
        } else {
          // Already checked in (verify endpoint or prior check-in)
          setResult({ status: "success", message: "✅ Ticket already checked in", booking: data.booking })
          stopCamera()
        }
      } else {
        setResult(data)
      }
    } catch (err) {
      setResult({ status: "error", message: "❌ Verification failed" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return

    await verifyQR(manualCode.trim())
    setManualCode("")
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const getCardColor = () => {
    if (!result) return "border-slate-300"
    if (result.status === "success") return "border-green-500 bg-green-50 dark:bg-green-950"
    if (result.status === "warning") return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
    return "border-red-500 bg-red-50 dark:bg-red-950"
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 flex flex-col">
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold mb-2">🎫 Ticket Scanner</h1>
        <p className="text-muted-foreground text-lg">Check in guests with QR codes or manual entry</p>
      </div>

      <div className="flex gap-3 mb-6 max-w-md mx-auto w-full">
        <Button
          onClick={() => {
            setMode("camera")
            if (!isCameraActive) startCamera()
          }}
          variant={mode === "camera" ? "default" : "outline"}
          size="lg"
          className="flex-1 gap-2"
        >
          <Camera className="h-5 w-5" />
          Camera
        </Button>
        <Button
          onClick={() => {
            setMode("manual")
            stopCamera()
          }}
          variant={mode === "manual" ? "default" : "outline"}
          size="lg"
          className="flex-1 gap-2"
        >
          <Keyboard className="h-5 w-5" />
          Manual
        </Button>
      </div>

      {mode === "camera" && (
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
          <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl flex-1 mb-4 flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              style={{ display: isCameraActive ? "block" : "none" }}
            />
            <canvas ref={canvasRef} className="hidden" />

            {!isCameraActive && !cameraError && (
              <div className="text-center text-white">
                <Camera className="h-16 w-16 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-semibold">Click "Start Camera" below</p>
              </div>
            )}

            {!isCameraActive && cameraError && (
              <div className="text-center text-white p-6">
                <AlertCircle className="h-16 w-16 mx-auto mb-3 text-red-400" />
                <p className="text-lg font-semibold">{cameraError}</p>
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-3" />
                  <p className="text-white font-semibold">Verifying...</p>
                </div>
              </div>
            )}

            {isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-4 border-green-400 rounded-lg shadow-lg"></div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {!isCameraActive ? (
              <Button onClick={startCamera} size="lg" className="flex-1 bg-green-600 hover:bg-green-700 gap-2">
                <Camera className="h-5 w-5" />
                Start Camera
              </Button>
            ) : (
              <Button onClick={stopCamera} size="lg" variant="destructive" className="flex-1 gap-2">
                <Camera className="h-5 w-5" />
                Stop Camera
              </Button>
            )}
          </div>
        </div>
      )}

      {mode === "manual" && (
        <div className="flex-1 flex items-center justify-center">
          <form onSubmit={handleManualSubmit} className="w-full max-w-md space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Booking Reference</label>
              <Input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="e.g., THTR-20240315-A3F9"
                className="text-center text-lg font-mono tracking-widest uppercase"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">Format: THTR-YYYYMMDD-XXXX</p>
            </div>
            <Button type="submit" disabled={isLoading || !manualCode.trim()} size="lg" className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Verify Ticket
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      {result && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4 z-50">
          <Card className={`w-full max-w-md border-2 shadow-2xl ${getCardColor()} animate-in slide-in-from-bottom-5`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.status === "success" && <CheckCircle className="h-6 w-6 text-green-600" />}
                {result.status === "warning" && <AlertCircle className="h-6 w-6 text-yellow-600" />}
                {result.status === "error" && <XCircle className="h-6 w-6 text-red-600" />}
                <span>{result.status === "success" ? "Verified" : result.status === "warning" ? "Warning" : "Invalid"}</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="font-semibold text-lg">{result.message}</p>

              {result.booking && (
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">GUEST NAME</p>
                    <p className="text-lg font-bold">{result.booking.customerName}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">BOOKING REF</p>
                    <p className="text-sm font-mono font-bold">{result.booking.reference}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">SHOW</p>
                    <p className="font-semibold">{result.booking.showTitle}</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(result.booking.showDatetime)}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">SEATS</p>
                    <div className="flex flex-wrap gap-2">
                      {result.booking.seats.map((seat, i) => (
                        <Badge key={i} variant="secondary">
                          {seat.section} • Row {seat.row} • Seat {seat.number}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {result.booking.alreadyCheckedIn && (
                    <Alert className="bg-green-100 dark:bg-green-900 border-green-300">
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>Already Checked In</AlertTitle>
                      <AlertDescription>This ticket has already been checked in.</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {mode === "camera" && (
                  <Button
                    onClick={async () => {
                      // Reset all state
                      setResult(null)
                      lastDetectionRef.current = ""
                      detectionLockRef.current = false
                      setIsLoading(false)
                      
                      // Stop any existing streams
                      if (streamRef.current) {
                        streamRef.current.getTracks().forEach(track => track.stop())
                        streamRef.current = null
                      }
                      
                      // Cancel animation frame
                      if (animationRef.current) {
                        cancelAnimationFrame(animationRef.current)
                        animationRef.current = null
                      }
                      
                      // Small delay to ensure cleanup
                      await new Promise(resolve => setTimeout(resolve, 100))
                      
                      // Restart fresh
                      setIsCameraActive(false)
                      startCamera()
                    }}
                    size="lg"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Scan Next
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
