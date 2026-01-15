import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function HowToPage() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>How To</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Praktiske steg-for-steg guider for vanlige oppgaver. Velg et emne fra menyen til høyre eller bruk seksjonene nedenfor.</p>

            <h2 id="order-ticket" className="mt-4 font-semibold">Bestille billetter</h2>
            <ol className="list-decimal pl-6 mb-4">
              <li>Gå til «Forestillinger» og velg et show.</li>
              <li>Velg dato og tidspunkt.</li>
              <li>Velg seter i seatmap (hover for pris og info).</li>
              <li>Gå til kassen og fyll ut kontaktinfo.</li>
              <li>Velg betalingsmetode og gjennomfør betaling.</li>
              <li>Motta e-post med bookingreferanse og QR-kode.</li>
            </ol>

            <h2 id="create-show" className="mt-4 font-semibold">Opprette en ny forestilling (Admin)</h2>
            <ol className="list-decimal pl-6 mb-4">
              <li>Logg inn som admin og gå til Admin → Opprett forestilling.</li>
              <li>Fyll ut tittel, beskrivelse, venue og datoer.</li>
              <li>Konfigurer seatmap eller velg et eksisterende seatmap for venue.</li>
              <li>Sett priser og eventuelle rabattkoder.</li>
              <li>Publiser forestillingen når alt er kontrollert.</li>
            </ol>

            <h2 id="promote-onboard" className="mt-4 font-semibold">Promotere & Onboarde en admin (Superadmin)</h2>
            <ol className="list-decimal pl-6 mb-4">
              <li>Som superadmin, gå til Admin → Brukere og velg brukeren du vil promotere.</li>
              <li>Klikk «Promoter» og systemet vil generere en QR-kode som sendes kun til din e-post. Denne QR-koden vises ikke på nettstedet.</li>
              <li>Gi QR-koden fysisk eller via e-post til den nye admin (de må ha tilgang til sin e-post).</li>
              <li>Den nye admin logger inn med e-post/passord, velger «Skann QR» i admin-verifisering og skanner QR-koden.</li>
              <li>Etter skanning sender systemet en 9-tegns alfanumerisk kode til den nye adminens e-post; de skriver inn denne koden for å fullføre verifiseringen.</li>
            </ol>

            <h2 id="connect-paypal" className="mt-4 font-semibold">Koble PayPal (Admin)</h2>
            <p className="text-muted-foreground mb-3">For å motta betalinger via PayPal, følg disse trinnene:</p>
            <ol className="list-decimal pl-6 mb-4">
              <li>Gå til Admin → Innbetalinger og legg til PayPal-konto.</li>
              <li>Angi PayPal-e-post og verifiser kontoen via systemet.</li>
              <li>Test en transaksjon i staging for å verifisere webhooks og idempotency.</li>
            </ol>

            <h2 id="support" className="mt-4 font-semibold">Kontakt support</h2>
            <p className="text-muted-foreground">Hvis du trenger hjelp: send e-post til <a href="mailto:kontakt@teateret.no" className="underline">kontakt@teateret.no</a> og inkluder bookingreferanse eller skjermbilder.</p>
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
