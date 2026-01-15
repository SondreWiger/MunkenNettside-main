import { InPageTOC } from '@/components/layout/in-page-toc'

export default function UseMigrationsPage() {
  return (
    <div className="relative">
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        <article>
          <h1 className="text-2xl font-bold mb-3">Migrasjoner & Database</h1>
          <p className="text-muted-foreground mb-4">Retningslinjer for å gjøre databaseendringer, legge til kolonner og sikre at migrasjoner er tilbakesporbare og trygge.</p>

          <section id="principles" className="mb-4">
            <h2 className="text-lg font-semibold">Principer</h2>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Legg til nye kolonner (backwards compatible) før du endrer kode.</li>
              <li>Backfill data i separate migrasjoner når nødvendig.</li>
              <li>Unngå destruktive endringer uten backup og rollback-plan.</li>
            </ul>
          </section>

          <section id="where" className="mb-4">
            <h2 className="text-lg font-semibold">Hvor å gjøre endringer</h2>
            <p className="text-muted-foreground">Alle SQL-endringer skal ligge i <code>scripts/000-complete-setup.sql</code> eller andre <code>scripts/000-*.sql</code>-filer etter avtale. Se også README for kjøreeksempler.</p>
          </section>

          <section id="tests" className="mb-4">
            <h2 className="text-lg font-semibold">Testing</h2>
            <p className="text-muted-foreground">Test migrasjoner i staging først og kjør backfills ellers i små batcher. Se scripts/test-* for testverktøy.</p>
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
