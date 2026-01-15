import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import ProductionsOrderClient from '@/components/admin/productions-order-client'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export default async function ProductionsOrderSettings() {
  const supabase = await getSupabaseServerClient()
  const { data: ensembles } = await supabase.from('ensembles').select('id, title, slug').order('updated_at', { ascending: false })

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-12">
        <h1 className="text-2xl font-serif mb-4">Produksjoner — rekkefølge</h1>
        <p className="text-sm text-muted-foreground mb-6">Her kan du endre hvordan produksjoner listes på publikumsiden. Endringen lagres i nettleseren foreløpig.</p>

        <ProductionsOrderClient ensembles={ensembles || []} />
      </main>
      <Footer />
    </div>
  )
}
