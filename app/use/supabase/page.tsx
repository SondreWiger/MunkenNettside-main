import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function SupabaseDocs() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>Supabase</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Guide til hvordan vi bruker Supabase (auth, RLS, server & admin clients). Se <code>lib/supabase/</code> for helperklienter og sjekk at service-role koden kun brukes server-side.</p>

            <h3 id="clients" className="mt-4 font-semibold">Klienttyper</h3>
            <ul className="list-disc pl-6">
              <li><code>getSupabaseBrowserClient()</code> — for component/client-side interaksjon</li>
              <li><code>getSupabaseServerClient()</code> — for SSR/server components</li>
              <li><code>getSupabaseAdminClient()</code> — service-role admin client for migrations/admin tasks</li>
            </ul>

            <h4 className="mt-4 font-semibold">Eksempel</h4>
            <p className="text-muted-foreground">Vanlig pattern i API-ruter:</p>
            <pre className="rounded bg-muted p-3 text-sm"><code>{`const serverSupabase = await getSupabaseServerClient()
const { data: { user } } = await serverSupabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

const adminSupabase = await getSupabaseAdminClient()
// use adminSupabase for privileged DB updates`}</code></pre>

            <p className="text-muted-foreground mt-2">Security note: <code>lib/supabase/server.ts</code> contains an explicit safety check that warns if <code>SUPABASE_SERVICE_ROLE_KEY</code> equals <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — never expose the service role key in client code.</p>

            <h3 id="rls" className="mt-4 font-semibold">RLS og policies</h3>
            <p className="text-muted-foreground">De viktigste RLS-policyene og triggers finnes i <code>scripts/000-complete-setup.sql</code>. All sensitive write-operasjoner må også verifiseres i API-rutene.</p>

            <h3 id="best-practices" className="mt-4 font-semibold">Best practices</h3>
            <ol className="list-decimal pl-6">
              <li>Verifiser roller i API-ruter server-side.</li>
              <li>Ikke eksponer SUPABASE_SERVICE_ROLE_KEY i klienten.</li>
              <li>Bruk prepared queries eller supabase helpers, ikke konkatener SQL med user input.</li>
            </ol>
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
