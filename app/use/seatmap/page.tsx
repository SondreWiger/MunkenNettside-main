import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function SeatmapDocs() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>Seatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Detaljer om seatmap-format, typer og hvordan seat locks og reservasjoner fungerer. Se <code>lib/seat-map-types.ts</code> for type-definisjoner.</p>

            <h3 id="format" className="mt-4 font-semibold">Format</h3>
            <p className="text-muted-foreground">Seatmaps er strukturert JSON som beskriver rader, seter, priser og tilgjengelighet. For endringer, oppdater scripts og backfill om nødvendig.</p>

            <h3 id="types" className="mt-4 font-semibold">Typer og hjelpefunksjoner</h3>
            <p className="text-muted-foreground">Se <code>lib/seat-map-types.ts</code> for TypeScript-typer og hjelpefunksjoner som <code>createSeat</code>, <code>createSeatRow</code> og <code>createSeatGrid</code>. Editor state-typer forklarer verktøy og pan/zoom-tilstand for seatmap-editoren.</p>

            <h3 id="locking" className="mt-4 font-semibold">Locking og race conditions</h3>
            <p className="text-muted-foreground">Implementer kort reservasjonstid og kontroller ved commit; se eksisterende seat reservation logic i server API-rutene.</p>
          </CardContent>
        </Card>
      </article>

      <aside className="hidden md:block">
        <div className="sticky top-20">
          <InPageTOC />
        </div>
      </aside>
    </div>
  )
}
