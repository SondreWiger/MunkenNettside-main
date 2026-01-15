import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function ServerDocs() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>Server patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Notes about App Router server components, API route handlers and parameters. Pay attention to Next's route handler types — e.g. dynamic params may be a Promise in the route signature.</p>

            <h3 id="routes" className="mt-4 font-semibold">API routes</h3>
            <p className="text-muted-foreground">Use server helpers for authentication checks and prefer server-side validation. For admin operations, use <code>getSupabaseAdminClient()</code>.</p>

            <h4 className="mt-4 font-semibold">Route handler tip</h4>
            <p className="text-muted-foreground">Next's App Router can validate route handler signatures strictly. When using dynamic route params in a route file (e.g. <code>/api/admin/roadmap/[id]/route.ts</code>), the handler signature may look like:</p>
            <pre className="rounded bg-muted p-3 text-sm"><code>{`export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // ...validate user, perform updates
}`}</code></pre>
            <p className="text-muted-foreground">Note the <code>params</code> is a Promise and must be awaited to retrieve the actual dynamic params. This was a common source of TypeScript validator errors in the project and was fixed in several admin routes.</p>

            <h3 id="errors" className="mt-4 font-semibold">Common errors</h3>
            <ul className="list-disc pl-6">
              <li>Route handler signature mismatch (context.params may be a Promise) — see fixes in roadmap/timeline route files.</li>
              <li>SSG/SSR caching pitfalls — ensure server code is deterministic or use revalidate appropriately.</li>
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
