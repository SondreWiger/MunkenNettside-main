"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { usePathname, useRouter } from 'next/navigation'
import { Menu, User, Ticket, Film, Home, LogIn, LogOut, BookOpen, Settings, LayoutDashboard, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { UserNotifications } from "@/components/layout/user-notifications"

const navigation = [
  { name: "Hjem", href: "/", icon: Home },
  { name: "Forestillinger", href: "/forestillinger", icon: Ticket },
  { name: "Kurs", href: "/kurs", icon: BookOpen },
  { name: "Arkiv", href: "/archive", icon: Archive },
  { name: "Opptak", href: "/opptak", icon: Film },
]

export function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userSlug, setUserSlug] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = getSupabaseBrowserClient()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase.from("users").select("role, slug").eq("id", user.id).single()
        setIsAdmin(data?.role === "admin")
        setUserSlug(data?.slug || null)
      }
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-primary"
          aria-label="Teateret - Gå til forsiden"
        >
          <span className="text-xl" role="img" aria-hidden="true">
            🎭
          </span>
          <span className="text-base">Teateret</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-4">
          {navigation.map((item) => {
            const active = pathname?.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${active ? 'text-foreground' : 'text-muted-foreground'} hover:text-foreground focus:text-foreground`}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.name}
              </Link>
            )
          })}

          {/* Search box */}
          <form onSubmit={(e) => {
            e.preventDefault()
            const form = e.currentTarget as HTMLFormElement
            const input = form.querySelector('input') as HTMLInputElement
            const q = input?.value.trim()
            if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
          }} className="ml-4 flex items-center">
            <input aria-label="Søk" placeholder="Søk..." className="w-40 rounded-md border px-2 py-1 text-sm focus:outline-none focus:ring" />
          </form>
        </div>

        <div className="flex items-center gap-4">
          {user && <UserNotifications />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <User className="h-5 w-5" aria-hidden="true" />
                  <span className="hidden sm:inline">Min konto</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <div className="text-sm font-medium">{user?.email}</div>
                  <div className="text-xs text-muted-foreground">{isAdmin ? 'Administrator' : 'Bruker'}</div>
                </div>
                <DropdownMenuSeparator />
                {userSlug && (
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${userSlug}`} className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Min profil
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/innstillinger" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Innstillinger
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/billetter" className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    Mine billetter
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/ny-forestilling" className="flex items-center gap-2">
                        <Ticket className="h-4 w-4" />
                        Opprett forestilling
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  Logg ut
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="lg" className="gap-2">
              <Link href="/logg-inn">
                <LogIn className="h-5 w-5" aria-hidden="true" />
                <span>Logg inn</span>
              </Link>
            </Button>
          )}

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Åpne meny">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetTitle className="text-left">Meny</SheetTitle>
              <div className="mt-4 px-4">
                {user ? (
                  <div className="mb-4">
                    <div className="font-medium">{user.email}</div>
                    <div className="text-sm text-muted-foreground">{isAdmin ? 'Administrator' : 'Bruker'}</div>
                  </div>
                ) : null}
                <nav className="mt-2 flex flex-col gap-2">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-lg font-medium transition-colors hover:bg-muted"
                    >
                      <item.icon className="h-6 w-6" aria-hidden="true" />
                      {item.name}
                    </Link>
                  ))}

                  {user ? (
                    <>
                      <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-lg px-4 py-3 text-lg font-medium hover:bg-muted">
                        <LayoutDashboard className="h-6 w-6" /> Dashboard
                      </Link>
                      {isAdmin && (
                        <>
                          <Link href="/admin" onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-lg px-4 py-3 text-lg font-medium hover:bg-muted">
                            <Settings className="h-6 w-6" /> Admin
                          </Link>
                        </>
                      )}
                      <button onClick={() => { setIsOpen(false); handleSignOut() }} className="text-destructive text-left rounded-lg px-4 py-3">Logg ut</button>
                    </>
                  ) : (
                    <Link href="/logg-inn" onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-lg px-4 py-3 text-lg font-medium hover:bg-muted">
                      <LogIn className="h-6 w-6" /> Logg inn
                    </Link>
                  )}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}
