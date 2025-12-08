import { QRScanner } from "@/components/admin/qr-scanner"

export const metadata = {
  title: "Billettskanner | Admin | Teateret",
  description: "Skann QR-billetter ved inngangen",
}

export default function ScanPage() {
  return <QRScanner />
}
