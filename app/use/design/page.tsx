import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function DesignDocs() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>Design & Styling</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Design tokens, Tailwind configuration and the project's design guidelines live in <code>DESIGN_STYLING_PLAN.md</code> and <code>tailwind.config.mjs</code>.</p>

            <h3 id="tokens" className="mt-4 font-semibold">Tokens & Theme</h3>
            <p className="text-muted-foreground">Theme tokens are stored and editable via admin theme tokens and applied at root in <code>app/layout.tsx</code>.</p>
            <p className="text-muted-foreground mt-2">See <code>tailwind.config.mjs</code> for token names and the admin theme API under <code>app/api/admin/site-settings/theme-tokens/route.ts</code> to persist theme changes.</p>

            <h3 id="components" className="mt-4 font-semibold">Component styling</h3>
            <p className="text-muted-foreground">Prefer existing UI components in <code>components/ui/</code> and follow token usage rather than tightly coupled CSS.</p>
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
