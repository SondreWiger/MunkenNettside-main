import { QRScanner } from "@/components/admin/qr-scanner"

export const metadata = {
  title: "Billettskanner | Admin | Teateret",
  description: "Skann QR-billetter ved inngangen",
}

export default function ScanPage() {
  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Billettskanner</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Skann QR-koder for å sjekke inn gjester</p>
      </div>
      <QRScanner />
    </main>
  )
}
