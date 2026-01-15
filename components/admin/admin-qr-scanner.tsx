"use client"

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function AdminQRScanner({ onDetect, onCancel }: { onDetect: (token: string) => void; onCancel: () => void }) {
  const [manual, setManual] = useState(false)
  const [manualVal, setManualVal] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!manual) startCamera()
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manual])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        rafRef.current = requestAnimationFrame(scanFrame)
      }
    } catch (e: any) {
      setErr(e?.message || 'Camera error')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      try {
        const jsQR = (await import('jsqr')).default
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imgData.data, canvas.width, canvas.height)
        if (code?.data) {
          stopCamera()
          onDetect(code.data)
          return
        }
      } catch {
        // ignore
      }
    }
    rafRef.current = requestAnimationFrame(scanFrame)
  }

  return (
    <div>
      {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
      {!manual ? (
        <div>
          <div className="w-full h-64 bg-black rounded overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="mt-2 flex gap-2">
            <Button variant="ghost" onClick={() => { stopCamera(); setManual(true) }}>Skriv inn kode manuelt</Button>
            <Button variant="ghost" onClick={onCancel}>Avbryt</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); onDetect(manualVal) }} className="space-y-2">
          <Input value={manualVal} onChange={(e) => setManualVal(e.target.value)} placeholder="Lim inn QR-innhold / token" />
          <div className="flex gap-2">
            <Button type="submit">Bekreft</Button>
            <Button variant="ghost" onClick={() => { setManual(false); setErr(null) }}>Bruk kamera</Button>
            <Button variant="ghost" onClick={onCancel}>Avbryt</Button>
          </div>
        </form>
      )}
    </div>
  )
}
