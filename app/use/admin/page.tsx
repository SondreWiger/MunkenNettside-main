import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function AdminPage() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>For administratorer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Administrasjonsområdet inneholder alle verktøy for å drive nettstedet: innhold, arrangementer, økonomi, brukere og sikkerhet. Nedenfor er viktige arbeidsflyter og tekniske detaljer admins bør kjenne.</p>

            <h3 id="raskstart" className="mt-4 font-semibold">Raskstart administrative oppgaver</h3>
            <ol className="list-decimal pl-6 space-y-1 mb-4">
              <li>Logg inn med admin-konto.</li>
              <li>Opprett / rediger ensembles & shows via Admin → Forestillinger.</li>
              <li>Konfigurer venues og seat maps (seatmap-editor aktuelt for venue-setup).</li>
              <li>Opprett rabattkoder under Admin → Rabattkoder.</li>
              <li>Overvåk betalingssituasjon og utsted refunds under Payments/Transactions.</li>
            </ol>

            <h3 id="sikkerhet" className="mt-4 font-semibold">Sikkerhet og tilgang</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Admin-verifisering</strong>: Bruk admin_verifications for å sende/validere admin-koder før sensitive operasjoner.</li>
              <li><strong>Admin-enheter</strong>: Registrer og revoker trusted devices (admin_devices) for økt sikkerhet.</li>
              <li><strong>RLS</strong>: De fleste tabeller har RLS; sjekk policies i <code>scripts/000-complete-setup.sql</code>.</li>
            </ul>

            <h3 id="workflows" className="mt-4 font-semibold">Workflows og beste praksis</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Migrasjoner</strong>: Endringer i DB må gjøres i <code>scripts/000-complete-setup.sql</code> som versjonert migrasjon.</li>
              <li><strong>Backups</strong>: Ta DB-snapshots før store dataendringer eller farlige backfills.</li>
              <li><strong>Testing</strong>: Kjør lokale testskripter (se /scripts) etter presisting av migrasjoner.</li>
              <li><strong>Roadmap & timeline</strong>: Oppdater roadmap (/admin/roadmap-todo) for prioriteringer og timeline (/admin/roadmap-timeline) for historikk.</li>
            </ul>
            <h3 id="onboarding" className="mt-4 font-semibold">Admin onboarding (QR + kode)</h3>
            <p className="text-muted-foreground">Ny onboarding krever at en eksisterende superadmin sender en QR-kode via e-post til seg selv når de promoterer en bruker. Den nye admin må skanne QR-koden ved første innlogging (i «Skann QR»), deretter får de en 9-tegns alfanumerisk kode per e-post som de skriver inn for å fullføre verifiseringen. Dette sikrer fysisk nærhet ved promotering og gir et ekstra lag av sikkerhet.</p>
            <h3 id="device-registrations" className="mt-4 font-semibold">Legg til en ny enhet (QR paring)</h3>
            <p className="text-muted-foreground">For å legge til en ny betrodd enhet: gå til <strong>Innstillinger → Sikkerhet</strong> i brukerprofilen og bruk «Legg til en enhet» for å generere en QR-kode. Skann QR med en allerede betrodd enhet for å bekrefte. Dette oppretter en betrodd enhet og setter en cookie for rask innlogging.</p>
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
