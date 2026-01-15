"use client"

import { useEffect, useState } from 'react'

export default function TrustedDevicesClient() {
  const [devices, setDevices] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/devices')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Kunne ikke hente enheter')
      } else {
        setDevices(data.devices || [])
      }
    } catch (err) {
      setError('Feil ved nettverk')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function revoke(id: string) {
    if (!confirm('Revoker denne enheten?')) return
    try {
      const res = await fetch('/api/admin/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Kunne ikke revokere')
      } else {
        // reload
        load()
      }
    } catch (err) {
      alert('Nettverksfeil')
    }
  }

  if (loading) return <div>Laster enheter…</div>
  if (error) return <div className="text-destructive">{error}</div>
  if (!devices || devices.length === 0) return <div>Ingen betrodde enheter funnet.</div>

  return (
    <div className="space-y-3">
      {devices.map((d: any) => (
        <div key={d.id} className="flex items-center justify-between border rounded p-3">
          <div>
            <div className="font-medium">{d.device_name || 'Ukjent enhet'}</div>
            <div className="text-xs text-muted-foreground">{d.created_at ? new Date(d.created_at).toLocaleString('nb-NO') : ''}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" onClick={() => revoke(d.id)}>Revoker</button>
          </div>
        </div>
      ))}
    </div>
  )
}
