import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import TrustedDevicesClient from '@/components/admin/trusted-devices-client'

export default async function TrustedDevicesSettings() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-12">
        <h1 className="text-2xl font-serif mb-4">Betrodde enheter</h1>
        <p className="text-sm text-muted-foreground mb-6">Her kan du se og fjerne enheter som er godkjent for å få administrasjons-tilgang.</p>

        <TrustedDevicesClient />
      </main>
      <Footer />
    </div>
  )
}
