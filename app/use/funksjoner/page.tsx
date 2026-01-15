import { InPageTOC } from '@/components/layout/in-page-toc'

export default function UseFeaturesPage() {
  return (
    <div className="relative">
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        <article>
          <h1 className="text-2xl font-bold mb-3">Funksjoner</h1>
          <p className="text-muted-foreground mb-4">En oversikt over de viktigste funksjonene i plattformen og hvordan de henger sammen.</p>

          <section id="booking" className="mb-4">
            <h2 className="text-lg font-semibold">Booking & Billetter</h2>
            <p className="text-muted-foreground">Gå gjennom kjøpsflyt, reservasjoner og hvordan ordrehåndtering fungerer. Vær oppmerksom på race conditions ved plassvalg; seat locks og transaksjoner håndterer dette.</p>
          </section>

          <section id="seatmap" className="mb-4">
            <h2 className="text-lg font-semibold">Seatmap & Kart</h2>
            <p className="text-muted-foreground">Forklaring av seatmap-formatet og hvordan seat locks/reservasjoner håndteres. Se <code>lib/seat-map-types.ts</code> for typedefinisjoner og konverteringsverktøy.</p>
          </section>

          <section id="payments" className="mb-4">
            <h2 className="text-lg font-semibold">Betalinger</h2>
            <p className="text-muted-foreground">Betalingsintegrasjoner (PayPal) og idempotente betalingsflow. Se PAYPAL_SETUP.md for webhook og idempotency-eksempler.</p>
          </section>
        </article>

        <aside className="hidden md:block">
          <div className="sticky top-20">
            <InPageTOC />
          </div>
        </aside>
      </div>
    </div>
  )
}
