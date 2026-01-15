import type React from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Film,
  Ticket,
  Users,
  MapPin,
  QrCode,
  Tag,
  Settings,
  Calendar,
  ChevronLeft,
  TrendingUp,
  GraduationCap,
  Menu,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

async function checkAdmin() {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { isAdmin: false, isLoggedIn: false }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()

  return { isAdmin: profile?.role === "admin", isLoggedIn: true }
}

// Grouped navigation for better organization
const navGroups = [
  {
    label: "Oversikt",
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Statistikk", href: "/admin/statistics", icon: TrendingUp },
    ]
  },
  {
    label: "Innhold",
    items: [
      { name: "Ensembler", href: "/admin/ensembler", icon: Film },
      { name: "Kurs", href: "/admin/kurs", icon: GraduationCap },
      { name: "Forestillinger", href: "/admin/forestillinger", icon: Calendar },
    ]
  },
  {
    label: "Salg",
    items: [
      { name: "Bestillinger", href: "/admin/bestillinger", icon: Ticket },
      { name: "Kjøp & Transaksjoner", href: "/admin/kjop", icon: CreditCard },
      { name: "Billettskanner", href: "/admin/scan", icon: QrCode },
      { name: "Rabattkoder", href: "/admin/rabattkoder", icon: Tag },
    ]
  },
  {
    label: "System",
    items: [
      { name: "Brukere", href: "/admin/brukere", icon: Users },
      { name: "Venues", href: "/admin/venues", icon: MapPin },
      { name: "Innstillinger", href: "/admin/innstillinger", icon: Settings },
    ]
  }
]

// Flat list for quick access
const quickNavItems = [
  { name: "Ensembler", href: "/admin/ensembler", icon: Film },
  { name: "Forestillinger", href: "/admin/forestillinger", icon: Calendar },
  { name: "Bestillinger", href: "/admin/bestillinger", icon: Ticket },
  { name: "Skanner", href: "/admin/scan", icon: QrCode },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoggedIn } = await checkAdmin()

  if (!isLoggedIn) {
    redirect("/logg-inn?redirect=/admin")
  }

  if (!isAdmin) {
    redirect("/?error=unauthorized")
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
        <div className="container px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo/Brand */}
            <Link href="/admin" className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <LayoutDashboard className="h-4 w-4 text-white" />
              </div>
              <span className="hidden sm:inline">Admin</span>
            </Link>
            
            {/* Desktop Quick Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {quickNavItems.map((item) => (
                <Button key={item.href} asChild variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                  <Link href={item.href} className="flex items-center gap-1.5">
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </Button>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {navGroups.map((group, idx) => (
                  <div key={group.label}>
                    {idx > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel className="text-xs text-slate-500">{group.label}</DropdownMenuLabel>
                    {group.items.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {item.name}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Back to site */}
            <Button asChild variant="outline" size="sm" className="border-slate-200 dark:border-slate-700">
              <Link href="/">
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Tilbake til nettsiden</span>
                <span className="sm:hidden">Tilbake</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>
      
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-57px)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4">
          <nav className="space-y-6">
            {navGroups.map((group) => (
              <div key={group.label}>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-3">
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-57px)]">
          {children}
        </main>
      </div>
    </div>
  )
}
