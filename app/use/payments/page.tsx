import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { InPageTOC } from '@/components/layout/in-page-toc'

export default function PaymentsDocs() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <article>
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Payment gateway setup and webhook handling. See <code>PAYPAL_SETUP.md</code> for PayPal-specific examples and <code>app/api/*</code> for webhook routes.</p>

            <h3 id="webhooks" className="mt-4 font-semibold">Webhooks & Idempotency</h3>
            <p className="text-muted-foreground">Handle webhooks in server API routes. Use idempotency keys for payments and make operations idempotent to handle retries.</p>

            <h4 className="mt-4 font-semibold">Eksempel: koble PayPal</h4>
            <p className="text-muted-foreground">Server route <code>/api/payment/connect-paypal</code> validates the user's bearer token and updates PayPal fields server-side using a service-role client:</p>
            <pre className="rounded bg-muted p-3 text-sm"><code>{`const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
// Verify user
const { data: { user } } = await supabase.auth.getUser(token)
// Update users table: paypal_email, paypal_payer_id, paypal_connected_at`}</code></pre>
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
