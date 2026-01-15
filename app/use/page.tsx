import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'


export default function UseIndexPage() {
  return (
    <main className="container max-w-5xl py-12">
      <section className="rounded-lg overflow-hidden bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] p-8 text-white shadow-lg mb-8">
        <h1 className="text-3xl font-bold">Brukerveiledning & Wiki</h1>
        <p className="mt-2 text-white/90">Dokumentasjon og veiledning for brukere, administratorer og utviklere. Bruk menyen til venstre for å navigere kapitler og sider.</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Plattform-oversikt</CardTitle>
          </CardHeader>
          <CardContent>
            Kort oversikt over hva plattformen tilbyr og de viktigste konseptene.
            <div className="mt-4"><Button asChild size="sm"><Link href="/use/oversikt">Les mer</Link></Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>For brukere</CardTitle>
          </CardHeader>
          <CardContent>
            Veiledning for publikumsflyt: kjøpe billetter, se kjøp og delta på kurs.
            <div className="mt-4"><Button asChild size="sm"><Link href="/use/bruker">Les mer</Link></Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>For administratorer</CardTitle>
          </CardHeader>
          <CardContent>
            Tips for administrasjon, sikkerhet, og hvordan du bruker admin-verktøyene.
            <div className="mt-4"><Button asChild size="sm"><Link href="/use/admin">Les mer</Link></Button></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>FAQ</CardTitle>
          </CardHeader>
          <CardContent>
            Vanskelige spørsmål og raske svar for både brukere og admins.
            <div className="mt-4"><Button asChild size="sm"><Link href="/use/faq">Gå til FAQ</Link></Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teknisk</CardTitle>
          </CardHeader>
          <CardContent>
            Arkitekturvalg, sikkerhetsrutiner og hvordan systemet er bygd.
            <div className="mt-4"><Button asChild size="sm"><Link href="/use/teknisk">Les mer</Link></Button></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Integrasjoner & API</CardTitle>
          </CardHeader>
          <CardContent>
            Dokumentasjon for API-endepunkter, webhooks og eksterne integrasjoner.
            <div className="mt-4"><Button asChild size="sm"><Link href="/use/api">Se API</Link></Button></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>How-to guider</CardTitle>
          </CardHeader>
          <CardContent>
            Enkle trinnvise guider: bestille billetter, opprette en forestilling, koble betalinger og mer.
            <div className="mt-4"><Button asChild size="sm"><Link href="/use/how-to">Se guider</Link></Button></div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Kommende kapitler</h2>
        <p className="text-muted-foreground">Vi utvider dokumentasjonen fortløpende. Finn migrasjonsveiledning, deployment-notater og detaljerte feature-dokumenter i menyen til venstre.</p>
      </div>
    </main>
  )
}
