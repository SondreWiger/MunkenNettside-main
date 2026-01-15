import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { RecordingCheckout } from "@/components/checkout/recording-checkout"

export const metadata = {
  title: "Kjøp opptak | Teateret",
  description: "Kjøp tilgang til digitale opptak",
}

export const dynamic = "force-dynamic"

export default function RecordingCheckoutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      <Header />
      <main id="hovedinnhold" className="flex-1">
        <section className="py-12">
          <div className="max-w-3xl mx-auto px-4">
            <Suspense
              fallback={
                <div className="animate-pulse h-72 bg-[var(--card)] rounded-lg" aria-hidden />
              }
            >
              <RecordingCheckout />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
