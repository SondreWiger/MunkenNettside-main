import { ReactNode } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { DocsSidebar } from '@/components/layout/docs-sidebar'

export default function UseLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="container mx-auto grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 py-12 px-4">
        <DocsSidebar />

        <div className="min-h-[60vh]">
          {children}
        </div>
      </main>
      <Footer />
    </>
  )
}
