import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function ComponentsPage() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>Komponenter</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Oversikt over UI-komponenter og mønstre. De fleste gjenbrukbare komponenter ligger i <code>components/</code>. Bruk eksisterende primitives i <code>components/ui/</code> for konsistente knappstiler, inputs, kort og dialoger.</p>

            <h3 id="primitives" className="mt-4 font-semibold">Primitives</h3>
            <p className="text-muted-foreground">Se <code>components/ui/</code> for Button, Input, Dialog, Card osv. Når du lager nye inputs, etterstrebe enkel props-overføring og aria-tilgjengelighet.</p>

            <h3 id="common" className="mt-4 font-semibold">Vanlige komponenter</h3>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li><code>components/ui/button.tsx</code> — knapp-primitive</li>
              <li><code>components/ui/input.tsx</code>, <code>textarea.tsx</code>, <code>select.tsx</code> — form-elementer</li>
              <li><code>components/ui/card.tsx</code> — kort-layout</li>
              <li><code>components/ui/dialog.tsx</code> — modal-dialoger</li>
              <li><code>components/ui/tooltip.tsx</code>, <code>dropdown-menu.tsx</code> — små interaksjoner</li>
              <li><code>components/ui/timeline-map.tsx</code> — timeline/visualisations (used on /admin/roadmap-timeline)</li>
            </ul>

            <h3 id="accessibility" className="mt-4 font-semibold">Tilgjengelighet</h3>
            <p className="text-muted-foreground">Følg semantisk HTML, aria-attributter for dynamiske elementer og sørg for at fokus-styring i modaler og menyer fungerer med tastatur-navigasjon.</p>

            <h3 id="layout-components" className="mt-4 font-semibold">Layout-komponenter</h3>
            <p className="text-muted-foreground">Header og Footer finnes i <code>components/layout/</code>. Bruk disse for alle sider for å sikre navigasjon og konsistent utseende.</p>

            <h3 id="how-to-add" className="mt-4 font-semibold">Hvordan legge til en komponent</h3>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Opprett fil i <code>components/</code> eller passende under-folder.</li>
              <li>Legg til Story eller en enkel side under <code>app/dev/</code> for testing (se eksisterende eksempler).</li>
              <li>Skriv små enhetstester for nytt logikk i <code>lib/</code> hvis aktuelt.</li>
            </ol>
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
