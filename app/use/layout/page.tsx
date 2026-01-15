import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function LayoutDocsPage() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>Layout</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Forklaring av app/layout.tsx, hvordan Header, Footer og ClientTheme brukes, og hvor tema-tokens hentes fra (<code>lib/theme/getThemeTokensServer.ts</code>).</p>

            <h3 id="app-layout" className="mt-4 font-semibold">App layout</h3>
            <p className="text-muted-foreground">Se <code>app/layout.tsx</code> for rot-layout. Viktig: maintain server-side theme tokens by calling <code>getThemeTokensServer()</code> og sette CSS-variabler på :root.</p>

            <h3 id="header-footer" className="mt-4 font-semibold">Header & Footer</h3>
            <p className="text-muted-foreground">Header er en klientkomponent (<code>components/layout/header.tsx</code>) — bruk browser supabase-client her for auth state. Footer håndterer nyhetsbrev og kontaktdetaljer.</p>
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
