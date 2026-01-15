"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, User, Ticket, ShoppingCart, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { formatPrice } from "@/lib/utils/booking"
import { QRCodeDisplay } from '@/components/booking/qr-code-display'

interface DashboardData {
  user: any
  profile: any
  purchases: any[]
  bookings: any[]
  enrollments: any[]
  ensembleEnrollments: any[]
  actor: any
}

interface UnifiedDashboardProps {
  initialData: DashboardData
}

export function UnifiedDashboard({ initialData }: UnifiedDashboardProps) {
  const [data, setData] = useState<DashboardData>(initialData)
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const { user, profile, purchases, bookings, enrollments, ensembleEnrollments, actor } = data

  // Filter bookings by status
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed")
  const usedBookings = bookings.filter((b) => b.status === "used")
  const completedPurchases = purchases.filter((p) => p.status === "completed")

  // Get upcoming and past bookings
  const now = new Date()
  const upcomingBookings = confirmedBookings.filter((b) => new Date(b.show?.show_datetime) >= now)
  const pastBookings = [...usedBookings, ...confirmedBookings.filter((b) => new Date(b.show?.show_datetime) < now)]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    toast.success("Du er nå logget ut")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500">Bekreftet</Badge>
      case "used":
        return <Badge variant="secondary">Brukt</Badge>
      case "cancelled":
        return <Badge variant="destructive">Avlyst</Badge>
      case "refunded":
        return <Badge variant="outline">Refundert</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main id="hovedinnhold" className="flex-1">
        {/* Hero Section */}
        <section className="py-12 bg-primary text-primary-foreground">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">
                    Hei, {profile?.full_name || user.email}!
                  </h1>
                  <p className="text-primary-foreground/80 mt-2">
                    Administrer dine billetter, påmeldinger og profil
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="secondary" asChild>
                    <Link href="/dashboard/innstillinger">
                      <Settings className="h-4 w-4 mr-2" />
                      Innstillinger
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logg ut
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="py-8 bg-muted/30">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{upcomingBookings.length}</div>
                  <div className="text-sm text-muted-foreground">Kommende forestillinger</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{completedPurchases.length}</div>
                  <div className="text-sm text-muted-foreground">Kjøpte opptak</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{enrollments.length}</div>
                  <div className="text-sm text-muted-foreground">Kurspåmeldinger</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{ensembleEnrollments.length}</div>
                  <div className="text-sm text-muted-foreground">Ensemble påmeldinger</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-8">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid grid-cols-4 w-full max-w-md">
                  <TabsTrigger value="overview">Oversikt</TabsTrigger>
                  <TabsTrigger value="tickets">Billetter</TabsTrigger>
                  <TabsTrigger value="purchases">Opptak</TabsTrigger>
                  <TabsTrigger value="profile">Profil</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  {/* Upcoming Events */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Ticket className="h-5 w-5" />
                        Kommende forestillinger
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {upcomingBookings.length > 0 ? (
                        <div className="space-y-4">
                          {upcomingBookings.slice(0, 3).map((booking: any) => (
                            <Link key={booking.id} href={`/bekreftelse/${booking.id}`} className="block hover:bg-muted/50 transition-colors rounded-lg">
                              <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                  <p className="font-medium">
                                    {booking.show?.title || booking.show?.ensemble?.title}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(booking.show.show_datetime).toLocaleDateString('nb-NO', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {booking.show.venue?.name}
                                  </p>
                                  <p className="text-xs text-primary mt-1">Klikk for detaljer →</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(booking.status)}
                                  {booking.status === 'confirmed' && (
                                    <div className="w-16 h-16 p-1">
                                      <QRCodeDisplay
                                        data={JSON.stringify({
                                          type: 'booking',
                                          bookingId: booking.id,
                                          reference: booking.reference
                                        })}
                                        size={56}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Link>
                          ))}
                          {upcomingBookings.length > 3 && (
                            <Button variant="outline" onClick={() => setActiveTab("tickets")}>
                              Se alle billetter ({upcomingBookings.length - 3} til)
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Ingen kommende forestillinger</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Purchases */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Siste kjøp
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {completedPurchases.length > 0 ? (
                        <div className="space-y-4">
                          {completedPurchases.slice(0, 3).map((purchase: any) => (
                            <div key={purchase.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div>
                                <p className="font-medium">{purchase.ensemble?.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  Kjøpt {new Date(purchase.created_at).toLocaleDateString('nb-NO')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatPrice(purchase.amount)}</p>
                                <Link
                                  href={`/se/${purchase.id}`}
                                  className="text-sm text-primary hover:underline"
                                >
                                  Se opptak →
                                </Link>
                              </div>
                            </div>
                          ))}
                          {completedPurchases.length > 3 && (
                            <Button variant="outline" onClick={() => setActiveTab("purchases")}>
                              Se alle kjøp ({completedPurchases.length - 3} til)
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Ingen kjøp ennå</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tickets Tab */}
                <TabsContent value="tickets" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Mine billetter</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {bookings.length > 0 ? (
                        <div className="space-y-4">
                          {bookings.map((booking: any) => (
                            <Link key={booking.id} href={`/bekreftelse/${booking.id}`} className="block hover:bg-muted/50 transition-colors rounded-lg">
                              <div className="p-4 border rounded-lg">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-lg">
                                      {booking.show?.title || booking.show?.ensemble?.title}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {new Date(booking.show.show_datetime).toLocaleDateString('nb-NO', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {booking.show.venue?.name} • Referanse: {booking.reference}
                                    </p>
                                    <p className="text-xs text-primary mt-2">Klikk for fullstendig billett og detaljer →</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {getStatusBadge(booking.status)}
                                    {booking.status === 'confirmed' && (
                                      <div className="w-20 h-20 p-1">
                                        <QRCodeDisplay
                                          data={JSON.stringify({
                                            type: 'booking',
                                            bookingId: booking.id,
                                            reference: booking.reference
                                          })}
                                          size={72}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Du har ingen billetter ennå</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Purchases Tab */}
                <TabsContent value="purchases" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Mine opptak</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {purchases.length > 0 ? (
                        <div className="space-y-4">
                          {purchases.map((purchase: any) => (
                            <div key={purchase.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{purchase.ensemble?.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Kjøpt {new Date(purchase.created_at).toLocaleDateString('nb-NO')}
                                  </p>
                                  <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                                    {purchase.status === 'completed' ? 'Tilgjengelig' : purchase.status}
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{formatPrice(purchase.amount)}</p>
                                  {purchase.status === 'completed' && (
                                    <Button asChild size="sm">
                                      <Link href={`/se/${purchase.id}`}>
                                        Se opptak
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Du har ikke kjøpt noen opptak ennå</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Min profil
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Fullt navn</label>
                          <p className="text-muted-foreground">{profile?.full_name || "Ikke oppgitt"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">E-post</label>
                          <p className="text-muted-foreground">{user.email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Telefon</label>
                          <p className="text-muted-foreground">{profile?.phone || "Ikke oppgitt"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Medlem siden</label>
                          <p className="text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString('nb-NO')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <Button asChild>
                          <Link href="/dashboard/innstillinger">
                            Rediger profil og innstillinger
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}