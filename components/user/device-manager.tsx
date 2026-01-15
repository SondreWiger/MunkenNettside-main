"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import { AdminQRScanner } from '@/components/admin/admin-qr-scanner'

export function DeviceManager() {
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showScanner, setShowScanner] = useState(false)
  const [creating, setCreating] = useState(false)
  const [currentToken, setCurrentToken] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  useEffect(() => {
    loadDevices()
  }, [])

  useEffect(() => {
    let poll: any = null
    if (currentToken) {
      poll = setInterval(async () => {
        try {
          const res = await fetch(`/api/devices/registration-status?token=${encodeURIComponent(currentToken)}`)
          if (res.ok) {
            const data = await res.json()
            if (data.status === 'registered' && data.deviceToken) {
              // Complete registration on this device
              await fetch('/api/devices/complete-registration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceToken: data.deviceToken }) })
              toast.success('Enhet registrert!')
              setCurrentToken(null)
              setQrDataUrl(null)
              loadDevices()
            }
          } else {
            // expired or invalid
          }
        } catch (e) {
          // ignore
        }
      }, 2000)
    }
    return () => clearInterval(poll)
  }, [currentToken])

  const loadDevices = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/devices')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setDevices(data.devices || [])
    } catch (e) {
      toast.error('Kunne ikke laste enheter')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRegistration = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/devices/create-registration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceName: typeof navigator !== 'undefined' ? navigator.userAgent.split(') ')[0] : 'Unknown' }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setCurrentToken(data.token)
      setExpiresAt(data.expiresAt)
      const uri = await QRCode.toDataURL(data.token)
      setQrDataUrl(uri)
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Kunne ikke generere QR')
    } finally {
      setCreating(false)
    }
  }

  const handleScanDetect = async (token: string) => {
    try {
      const res = await fetch('/api/devices/confirm-registration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Feil ved bekreftelse')
      toast.success('Bekreftelse sendt — vent på at den nye enheten fullfører registrering')
      setShowScanner(false)
      loadDevices()
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Kunne ikke bekrefte registrering')
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch('/api/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      if (!res.ok) throw new Error('Failed')
      toast.success('Enhet opphevet')
      loadDevices()
    } catch (e) {
      toast.error('Kunne ikke oppheve enhet')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Betrodde enheter</CardTitle>
        <CardDescription>Administrer enheter som kan brukes til rask innlogging</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={handleCreateRegistration} disabled={creating} className="gap-2">
            {creating ? 'Genererer...' : 'Legg til en enhet (vis QR)'}
          </Button>
          <Dialog open={showScanner} onOpenChange={setShowScanner}>
            <DialogTrigger asChild>
              <Button variant="outline">Skann QR for å bekrefte</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Skann QR</DialogTitle>
              </DialogHeader>
              <AdminQRScanner onDetect={handleScanDetect} onCancel={() => setShowScanner(false)} />
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowScanner(false)}>Lukk</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {qrDataUrl && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Vis denne QR-koden på enheten du vil autorisere. Bruk en allerede betrodd enhet for å skanne.</p>
            <div className="p-4 border rounded inline-block">
              <img src={qrDataUrl} alt="Registration QR" className="w-64 h-64 object-contain" />
            </div>
            <p className="text-xs text-muted-foreground">Gyldig til: {expiresAt ? new Date(expiresAt).toLocaleString('nb-NO') : '—'}</p>
          </div>
        )}

        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Laster enheter...</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen betrodde enheter</p>
          ) : (
            devices.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{d.device_name || 'Ukjent enhet'}</div>
                  <div className="text-sm text-muted-foreground">Opprettet: {new Date(d.created_at).toLocaleString('nb-NO')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleRevoke(d.id)}>Opphev</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
