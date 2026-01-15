import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function SecurityDocs() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>Sikkerhet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Sikkerhetsnotater: hemmeligheter, RLS, admin checks, og beste praksis for å unngå lekkasjer.</p>

            <h3 id="secrets" className="mt-4 font-semibold">Hemmeligheter</h3>
            <p className="text-muted-foreground">Ikke eksponer <code>SUPABASE_SERVICE_ROLE_KEY</code> i klienten. Bruk environment variables og CI secrets for deploy.</p>

            <h3 id="rls" className="mt-4 font-semibold">RLS</h3>
            <p className="text-muted-foreground">Sjekk policies i <code>scripts/000-complete-setup.sql</code>. For sensitive operations, dobbeltsjekk både API-ruter og DB-policies.</p>
            <p className="text-muted-foreground mt-2">Eksempel: audit-tabeller (admin_action_logs) og policies som kun tillater admins å SELECT eller lar brukere sette sine egne logg-innføringer finnes i 000-complete-setup.sql. Når du endrer policies, test med både en vanlig bruker og en admin i staging.</p>
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
