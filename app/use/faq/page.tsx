import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function FaqPage() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>Ofte stilte spørsmål (FAQ)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <details id="bestille" className="p-4 border rounded"><summary className="font-medium">Hvordan bestiller jeg billetter?</summary><div className="mt-2 text-muted-foreground">Gå til ønsket arrangement, velg plasser og følg betalingsprosessen.</div></details>
              <details id="admin" className="p-4 border rounded"><summary className="font-medium">Hvordan blir jeg admin?</summary><div className="mt-2 text-muted-foreground">Kontakt en eksisterende admin for tilgang.</div></details>
              <details id="tema" className="p-4 border rounded"><summary className="font-medium">Hvordan endrer jeg tema?</summary><div className="mt-2 text-muted-foreground">Gå til admin-innstillinger og velg ønsket tema.</div></details>
              <details id="support" className="p-4 border rounded"><summary className="font-medium">Hva gjør jeg hvis jeg har problemer?</summary><div className="mt-2 text-muted-foreground">Kontakt support via e-post eller kontaktskjema.</div></details>
            </div>
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
