import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function BrukerPage() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>For brukere</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Her finner du veiledning for hvordan du bestiller billetter, deltar på kurs og forestillinger, og bruker plattformen effektivt. Under er detaljerte steg og tips.</p>

            <h3 id="konto" className="mt-4 font-semibold">Opprett konto og profil</h3>
            <ol className="list-decimal pl-6 space-y-1 mb-4">
              <li>Trykk <em>Logg inn</em> øverst og velg «Opprett konto».</li>
              <li>Fyll ut navn, epost og (valgfritt) telefon og profilbilde.</li>
              <li>Bekreft epost hvis du mottar en verifikasjonslink.</li>
              <li>Gå til profilsiden for å fylle ut bio, kontaktinfo og preferanser.</li>
            </ol>

            <h3 id="bestille" className="mt-4 font-semibold">Bestille billetter (trinnvis)</h3>
            <ol className="list-decimal pl-6 space-y-1 mb-4">
              <li>Finn forestillingen i «Forestillinger» eller via søk.</li>
              <li>Velg dato og tidspunkt (hvis flere).</li>
              <li>Velg seter i seatmap (fargekoder: grønt = ledig, oransje = reservert, rødt = solgt).</li>
              <li>Gå til kassen og velg betaling (Vipps / PayPal / Kort, avhengig av oppsett).</li>
              <li>Etter betaling mottar du e-post med bookingreferanse og QR-kode for innsjekk.</li>
            </ol>

            <h3 id="refund" className="mt-4 font-semibold">Endringer, kansellering og refusjon</h3>
            <p className="text-muted-foreground">Endringer av billetter avhenger av arrangementets policy. Sjeldne unntak kan håndteres via support. Refunderinger administreres av admin-teamet; se «Kontakt» i footer for support-epost.</p>

            <h3 id="kurs" className="mt-4 font-semibold">Delta på kurs og øvinger</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Påmelding skjer via kurs-siden eller via «Påmeldinger» i profilen.</li>
              <li>Du får epostbekreftelse med detaljert informasjon og eventuelle forberedelser.</li>
              <li>For øvinger kan du slå av/på deltakelse fra øvingens side eller via profil.</li>
            </ul>

            <h3 id="opptak" className="mt-4 font-semibold">Digitale opptak</h3>
            <p className="text-muted-foreground">Kjøpte opptak vises under «Opptak» på kontoen din. Hver kjøp gir deg et tidsbegrenset tilgangs-token; deling av direkte lenker er ikke anbefalt pga lisens og tilgangskontroll.</p>

            <h3 id="support" className="mt-4 font-semibold">Problemer eller støtte</h3>
            <p className="text-muted-foreground">Hvis du får feil under betaling, se feilkoden fra betalingsleverandøren og kontakt support med booking-referanse. For innloggingsproblemer, prøv «Glemt passord» eller kontakt admin for kontoverifisering.</p>
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
