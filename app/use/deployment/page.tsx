import { InPageTOC } from '@/components/layout/in-page-toc'

export default function UseDeploymentPage() {
  return (
    <div className="relative">
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        <article>
          <h1 className="text-2xl font-bold mb-3">Deploy & Drift</h1>
          <p className="text-muted-foreground mb-4">Notater om deploy-prosess, miljøvariabler, og gode driftvaner.</p>

          <section id="env" className="mb-4">
            <h2 className="text-lg font-semibold">Miljøvariabler</h2>
            <p className="text-muted-foreground">Viktige variabler: <code>DATABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>, og sosiale lenker.</p>
          </section>

          <section id="build" className="mb-4">
            <h2 className="text-lg font-semibold">Bygg og release</h2>
            <p className="text-muted-foreground">Bruk <code>pnpm build</code> og sørg for at CI kjører lint og tsc --noEmit før deploy.</p>
          </section>

          <section id="monitoring" className="mb-4">
            <h2 className="text-lg font-semibold">Monitoring</h2>
            <p className="text-muted-foreground">Legg til feilmeldingstjeneste (Sentry) og overvåk booking flows nøye etter deploy.</p>
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
