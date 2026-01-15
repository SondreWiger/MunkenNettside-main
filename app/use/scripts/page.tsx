import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function ScriptsDocs() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>Scripts & Migrasjoner</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Alle SQL-migrasjoner og seeds finnes i <code>scripts/</code>. Den primære filen er <code>scripts/000-complete-setup.sql</code>. Følg retningslinjene i repo-instruksjonene for å lage bakoverkompatible migrasjoner.</p>

            <h3 id="where" className="mt-4 font-semibold">Hvor</h3>
            <p className="text-muted-foreground">Se <code>scripts/000-complete-setup.sql</code>, <code>scripts/00*-*.sql</code> for historikk og seed-data.</p>

            <h3 id="rules" className="mt-4 font-semibold">Regler</h3>
            <ul className="list-disc pl-6">
              <li>Legg til kolonner først, backfill deretter, og bytt kode i separate deploys.</li>
              <li>Bruk DO $$ blocks for conditional alters når det kan kjøre i miljøer med ulik DB-tilstand.</li>
            </ul>
                <h4 className="mt-4 font-semibold">Eksempel: konservativ backfill</h4>
                <p className="text-muted-foreground">Denne blokken forsøker å backfille kun når det er trygt:</p>
                <pre className="rounded bg-muted p-3 text-sm"><code>{`DO $$
BEGIN
  -- Update kurs where director matches an actor's name (case-insensitive exact match)
  UPDATE public.kurs k
  SET instructor_actor_id = a.id
  FROM public.actors a
  WHERE k.instructor_actor_id IS NULL
    AND a.name IS NOT NULL
    AND k.director IS NOT NULL
    AND lower(trim(a.name)) = lower(trim(k.director));
END$$;`}</code></pre>
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
