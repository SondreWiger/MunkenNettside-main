import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function UseApiPage() {
  return (
    <div className="relative">
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        <article>
          <section className="mb-6">
            <h1 className="text-2xl font-bold">API & Integrasjoner</h1>
            <p className="text-muted-foreground mt-2">En oversikt over tilgjengelige API-endepunkter, autentisering, og eksempler for integrasjoner.</p>
          </section>

          <section id="overview" className="mb-6">
            <h2 className="text-lg font-semibold">Oversikt</h2>
            <p className="text-muted-foreground">Plattformen tilbyr et fåtall interne admin-APIer og flere SSR-endepunkter for innhold. Offentlige APIer er begrenset og krever ofte server-side/service-role tilgang for sensitive operasjoner.</p>
          </section>

          <section id="auth" className="mb-6">
            <h2 className="text-lg font-semibold">Autentisering</h2>
            <p className="text-muted-foreground">Bruk Supabase auth (JWT) for brukersesjoner. Administrative operasjoner krever service-role (bruk <code>getSupabaseAdminClient()</code> på serveren).</p>
          </section>

          <section id="endpoints" className="mb-6">
            <h2 className="text-lg font-semibold">Viktige endepunkter</h2>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li><code>/api/admin/roadmap</code> — CRUD for admin roadmap</li>
              <li><code>/api/admin/timeline</code> — CRUD for timeline events</li>
              <li><code>/api/newsletter/subscribe</code> — newsletter subscription</li>
            </ul>
          </section>

          <section id="webhooks" className="mb-6">
            <h2 className="text-lg font-semibold">Webhooks</h2>
            <p className="text-muted-foreground">Integrasjoner som betalinger og tredjepartsvarslinger er konfigurert via server-side webhooks. Se PAYPAL_SETUP.md for eksempler.</p>
          </section>

          <section id="examples" className="mb-6">
            <h2 className="text-lg font-semibold">Eksempler</h2>
            <p className="text-muted-foreground">En kort eksempelkall for roadmap (server-side):</p>
            <pre className="rounded bg-muted p-3 text-sm"><code>{`const res = await fetch(process.env.SITE_URL + '/api/admin/roadmap', { method: 'GET', headers: { Authorization: 'Bearer ' + process.env.SERVICE_KEY } })`}</code></pre>
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
