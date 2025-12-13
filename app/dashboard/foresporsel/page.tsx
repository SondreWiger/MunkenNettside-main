import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { EnrollmentRequestsList } from "@/components/family/enrollment-requests-list"

export const metadata: Metadata = {
  title: "Påmeldingsforespørsler | Munken Teatret",
  description: "Se og godkjenn barnas påmeldingsforespørsler",
}

export default async function EnrollmentRequestsPage() {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/logg-inn?redirect=/dashboard/foresporsel")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Påmeldingsforespørsler fra barn</CardTitle>
              <CardDescription>
                Når et barn ber om tillatelse til å melde seg på et ensemble, vises forespørselen her.
              </CardDescription>
            </CardHeader>
          </Card>

          <EnrollmentRequestsList />
        </div>
      </main>

      <Footer />
    </div>
  )
}
