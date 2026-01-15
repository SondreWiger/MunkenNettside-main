import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function OversiktPage() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>Plattform-oversikt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Denne plattformen gir deg mulighet til å bestille billetter, delta på kurs og forestillinger, administrere brukere og mer. Alt er bygget for å være brukervennlig, sikkert og fleksibelt for både publikum og administrasjon.</p>

            <h3 id="kjernedeler" className="mt-4 text-lg font-semibold">Kjernedeler av plattformen</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Forestillinger & Shows</strong> — arrangementer med dato/tid, venue og seter.</li>
              <li><strong>Kurs</strong> — kortere undervisningsløp med påmelding.</li>
              <li><strong>Ensembles</strong> — produksjonsgrupper og hukommelsessteder for forestillinger.</li>
              <li><strong>Brukere & Roller</strong> — account-roller (customer, staff, admin) og profiler.</li>
              <li><strong>Billettflyt</strong> — søk → velg show → velg sete → betaling → bekreftelse → QR.</li>
              <li><strong>Opptak & Video</strong> — kjøpe digitale opptak, video-access tokens og avspilling.</li>
              <li><strong>Admin-verktøy</strong> — dashboard, roadmap, timeline, seatmap-editor, og API-er.</li>
            </ul>

            <h3 id="begreper" className="mt-6 text-lg font-semibold">Begreper du bør kunne</h3>
            <dl className="mt-2">
              <dt className="font-medium">Seat map</dt>
              <dd className="text-muted-foreground mb-2">Kart over seter per venue med status (available/reserved/sold/blocked).</dd>

              <dt className="font-medium">Booking</dt>
              <dd className="text-muted-foreground mb-2">En kjøretur som reserverer seter og oppretter en booking-referanse. Betalinger tilknyttes purchases/transactions.</dd>

              <dt className="font-medium">RLS (Row Level Security)</dt>
              <dd className="text-muted-foreground mb-2">Sikkerhetsmekanisme i databasen (Supabase/Postgres) som sikrer at brukere kun kan se eller endre rader de har tilgang til.</dd>
            </dl>

            <h3 id="hvor" className="mt-6 text-lg font-semibold">Hvor finner du ting</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Admin pages</strong>: /admin (med subpages for dashboard og verktøy).</li>
              <li><strong>Roadmap</strong>: /admin/roadmap-todo — privat admin-side for todo/roadmap.</li>
              <li><strong>Timeline</strong>: /admin/roadmap-timeline — visuell historie over utgivelser/hendelser.</li>
              <li><strong>Wiki</strong>: /use — denne dokumentasjonen og detaljsider.</li>
            </ul>
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
