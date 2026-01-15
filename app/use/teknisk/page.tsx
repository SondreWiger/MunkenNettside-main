import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function TekniskPage() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>Teknisk dokumentasjon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Denne siden gir praktisk teknisk dokumentasjon for utviklere og driftsansvarlige som skal jobbe videre med plattformen.</p>

            <h3 id="arkitektur" className="mt-4 font-semibold">Arkitekturoversikt</h3>
            <p className="text-muted-foreground">Frontend: Next.js App Router (server + client components). Styling: Tailwind CSS. Backend: Supabase (Postgres + RLS). Jobber og korte scripts i /scripts.</p>

            <h3 id="files" className="mt-4 font-semibold">Viktige filer og steder</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><code>app/</code> - sider og komponenter (App Router)</li>
              <li><code>components/</code> - gjenbrukbare UI-komponenter</li>
              <li><code>lib/supabase/</code> - helper-klienter for server/admin</li>
              <li><code>scripts/000-complete-setup.sql</code> - DB schema, triggers, policies, seeds</li>
              <li><code>app/api/admin/*</code> - admin API-ruter</li>
            </ul>

            <h3 id="db" className="mt-4 font-semibold">DB og RLS</h3>
            <p className="text-muted-foreground">Vi bruker RLS aktivt for å begrense CRUD-operasjoner basert på auth.uid() og roller. Se funksjonen <code>is_admin()</code> og policy-eksempler i 000-complete-setup.sql.</p>

            <h3 id="workflow" className="mt-4 font-semibold">Utviklerarbeidsflyt</h3>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Kjør <code>pnpm install</code> og <code>pnpm dev</code> for lokal utvikling.</li>
              <li>Typecheck: <code>pnpm -s tsc --noEmit</code>.</li>
              <li>Følg migrasjonsregler: endringer i DB gjøres i <code>scripts/000-complete-setup.sql</code>.</li>
              <li>Bruk <code>getSupabaseAdminClient()</code> for server-side admin operasjoner som trenger service role.</li>
            </ol>

            <h3 id="security" className="mt-4 font-semibold">Sikkerhets- og driftsnotater</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Ikke eksponer <code>SUPABASE_SERVICE_ROLE_KEY</code> i klientkode.</li>
              <li>All input bør valideres server-side (API-ruter sjekker roller før sensitive endringer).</li>
              <li>Ta DB-tak og test migrations i staging først.</li>
            </ul>

            <h3 id="troubleshooting" className="mt-4 font-semibold">Feilsøkingstips</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Typefeil i API-ruter: kjør <code>pnpm -s tsc --noEmit</code> for å få alle validatorfeil.</li>
              <li>RLS-issues: kjør queries som service-role i psql for å reprodusere tillatelsesfeil.</li>
              <li>Next dev logs viser hvilke ruter som feiler (se terminal for stack traces).</li>
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
