import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { ConstructionWarning } from "@/components/construction-warning"
import { CookieConsentBanner } from "@/components/layout/cookie-consent"
import "./globals.css"
import { getThemeTokensServer } from '@/lib/theme/getThemeTokensServer'
import ClientTheme from '@/components/theme/client-theme'

const inter = Inter({ subsets: ["latin"] })
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "700", "900"], variable: "--font-display" })

export const metadata: Metadata = {
  title: "Teateret - Forestillinger og Opptak",
  description: "Opplev teatermagien - kjøp billetter til forestillinger eller se opptak hjemmefra",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Fetch persisted theme tokens server-side and convert to CSS variables
  const themeTokens = await getThemeTokensServer()
  const cssVars = themeTokens
    ? Object.entries(themeTokens)
        .map(([k, v]) => `--${k.replace(/_/g, '-')}: ${v};`)
        .join('\n')
    : ''
  return (
    <html lang="nb">
  <body className={`${inter.className} ${playfair.variable} font-sans antialiased min-h-screen bg-background text-foreground`}>
      {cssVars && (
        <style dangerouslySetInnerHTML={{ __html: `:root { ${cssVars} }` }} />
      )}
      {/* Ensure client loads tokens and applies them too (covers cached pages or client-side navigations) */}
      <ClientTheme />
        <ConstructionWarning />
        {children}
        <CookieConsentBanner />
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
