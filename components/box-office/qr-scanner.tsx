"use client"
import { useState } from 'react'

export default function QRScanner({ onResult }: { onResult: (result: string) => void }) {
  // Placeholder for real QR scanner integration
  const [input, setInput] = useState('')
  return (
    <div className="flex flex-col gap-2 items-center">
      <label className="font-semibold">Simulert QR-kode (lim inn eller skriv inn):</label>
      <input
        className="border rounded px-2 py-1"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Skann eller lim inn QR-data"
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
        onClick={() => input && onResult(input)}
      >
        Sjekk billett
      </button>
    </div>
  )
}
