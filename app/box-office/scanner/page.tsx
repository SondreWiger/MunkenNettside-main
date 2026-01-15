"use client"

import { useState } from "react"

export default function ScannerPage() {
  const [qr, setQr] = useState("")
  const [reference, setReference] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const verify = async () => {
    setLoading(true)
    setResult(null)

    try {
      const body: any = {}
      if (qr) body.qrData = qr
      if (reference) body.bookingReference = reference

      const res = await fetch('/api/admin/verify-ticket', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
      const json = await res.json()
      setResult(json)
    } catch (err) {
      setResult({ status: 'error', message: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Box Office — Scanner</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Paste QR data (full JSON or reference)</label>
        <textarea
          value={qr}
          onChange={e => setQr(e.target.value)}
          className="w-full p-3 rounded-md bg-[var(--color-surface)] text-[var(--color-on-surface)] border border-[var(--color-border)]"
          rows={6}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Or enter booking reference</label>
        <input
          value={reference}
          onChange={e => setReference(e.target.value)}
          className="w-full p-3 rounded-md bg-[var(--color-surface)] text-[var(--color-on-surface)] border border-[var(--color-border)]"
        />
      </div>

      <div className="flex gap-2 mb-6">
        <button
          className="px-4 py-2 rounded-md bg-[var(--color-primary)] text-[var(--color-cta-text)]"
          onClick={verify}
          disabled={loading}
        >
          {loading ? 'Verifying…' : 'Verify'}
        </button>
        <button
          className="px-4 py-2 rounded-md border border-[var(--color-border)] text-[var(--color-on-surface)] bg-transparent"
          onClick={() => { setQr(''); setReference(''); setResult(null) }}
        >
          Reset
        </button>
      </div>

      {result && (
        <div className="p-4 border border-[var(--color-border)] rounded-md bg-[var(--color-card)] text-[var(--color-on-card)]">
          <h2 className="font-medium mb-2">Result: {result.status}</h2>
          <p className="mb-2 text-sm text-[var(--color-muted-foreground)]">{result.message}</p>
          {result.booking && (
            <div className="text-sm">
              <div><strong>Reference:</strong> {result.booking.reference}</div>
              <div><strong>Name:</strong> {result.booking.customerName}</div>
              <div><strong>Show:</strong> {result.booking.showTitle} — {result.booking.showDatetime}</div>
              <div><strong>Seats:</strong> {result.booking.seats?.map((s:any)=>`${s.section}${s.row}${s.number}`).join(', ')}</div>
              <div><strong>Already checked in:</strong> {result.booking.alreadyCheckedIn ? 'Yes' : 'No'}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
