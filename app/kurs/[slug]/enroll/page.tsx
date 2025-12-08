import { notFound } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { KursCheckout } from "@/components/booking/kurs-checkout"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getKurs(slug: string) {
  const supabase = await getSupabaseServerClient()

  const { data: kurs } = await supabase
    .from("kurs")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single()

  return kurs
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const kurs = await getKurs(slug)

  if (!kurs) {
    return { title: "Kurs ikke funnet | Teateret" }
  }

  return {
    title: `Meld deg på ${kurs.title} | Teateret`,
    description: `Meld deg på kurset: ${kurs.title}`,
  }
}

export default async function KursEnrollPage({ params }: PageProps) {
  const { slug } = await params
  const kurs = await getKurs(slug)

  if (!kurs) {
    notFound()
  }

  // Initialize enrollment in session storage on client side
  // The KursCheckout component will handle retrieving it

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        <KursCheckout />
      </main>

      <Footer />
    </div>
  )
}
