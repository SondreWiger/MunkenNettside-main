"use client"
import QRScanner from '@/components/box-office/qr-scanner'
import { useState } from 'react'

export default function BoxOfficeScannerPage() {
  const [result, setResult] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [bookingRef, setBookingRef] = useState('')

  async function handleScan(qr: string) {
    setStatus('Sjekker billett...')
    setResult(null)
    // For demo: require manual input of booking reference
    if (!bookingRef) {
      setStatus('Skriv inn bookingreferanse')
      return
    }
    const res = await fetch('/api/booking/verify-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_reference: bookingRef, qr_code_data: qr })
    })
    const data = await res.json()
    if (data.success) {
      setStatus('Gyldig billett!')
      setResult(JSON.stringify(data.booking, null, 2))
    } else {
      setStatus(data.error || 'Ugyldig billett')
      setResult(null)
    }
  }

  return (
    <div className="max-w-lg mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Billettskanner</h1>
      <label className="block mb-2">Bookingreferanse:</label>
      <input
        className="border rounded px-2 py-1 mb-4 w-full"
        value={bookingRef}
        onChange={e => setBookingRef(e.target.value)}
        placeholder="F.eks. ABC123"
      />
      <QRScanner onResult={handleScan} />
      {status && <div className="mt-4 font-semibold">{status}</div>}
      {result && <pre className="bg-gray-100 p-2 mt-2 rounded text-xs overflow-x-auto">{result}</pre>}
    </div>
  )
}
