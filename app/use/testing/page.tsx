import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function TestingDocs() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>Testing & CI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Hvordan kjøre lokale tester og hva CI gjør. Se .github/workflows for detaljer på pipelines.</p>

            <h3 id="commands" className="mt-4 font-semibold">Viktige kommandoer</h3>
            <ul className="list-disc pl-6">
              <li><code>pnpm install</code> — installer deps</li>
              <li><code>pnpm -s tsc --noEmit</code> — typecheck</li>
              <li><code>pnpm lint</code> — kjør eslint</li>
              <li><code>pnpm build</code> — test build</li>
            </ul>

            <h3 id="ci" className="mt-4 font-semibold">CI</h3>
            <p className="text-muted-foreground">CI kjører lint, typecheck, build og noen test-skripter. Se .github/workflows/ci.yml for detaljer.</p>
            <h4 className="mt-4 font-semibold">Tips for lokal utvikling</h4>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Kjør typecheck og lint før du åpner en PR for å unngå CI-feil.</li>
              <li>For DB-relaterte tester, sett opp et test-database-URL og følg test-skript i <code>scripts/</code>.</li>
              <li>CI kjører ekstra test-skripter når de finnes: <code>test:seat:concurrency</code>, <code>test:admin:db</code>.</li>
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
