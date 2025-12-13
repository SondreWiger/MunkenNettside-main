import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChildEnrollmentPermissions } from "@/components/family/child-enrollment-permissions"

export const metadata: Metadata = {
  title: "Barns påmeldingstillatelser | Munken Teatret",
  description: "Administrer dine barns tillatelser for påmelding til ensemble",
}

export default async function EnrollmentPermissionsPage() {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/logg-inn?redirect=/dashboard/pamelding-tillatelser")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Påmeldingstillatelser for barn</CardTitle>
              <CardDescription>
                Kontroller om barna dine kan melde seg på ensemble direkte, må spørre deg først, eller ikke kan melde seg på.
              </CardDescription>
            </CardHeader>
          </Card>

          <ChildEnrollmentPermissions />
        </div>
      </main>

      <Footer />
    </div>
  )
}
