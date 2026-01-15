import { notFound } from "next/navigation"
import Image from "next/image"
import { Users, Mail, Phone, Theater } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { BackButton } from "@/components/ui/back-button"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getActorData(id: string) {
  const supabase = await getSupabaseServerClient()

  // Get actor details
  const { data: actor } = await supabase
    .from("actors")
    .select(`
      *,
      user:user_id(
        id,
        full_name,
        profile_slug
      )
    `)
    .eq("id", id)
    .single()

  if (!actor) {
    return null
  }

  // Get roles this actor has played
  const { data: roles } = await supabase
    .from('roles')
    .select(`
      id,
      character_name,
      description,
      importance,
      ensemble:ensemble_id!inner(
        id,
        title,
        slug,
        thumbnail_url,
        year
      )
    `)
    .or(`yellow_actor_id.eq.${id},blue_actor_id.eq.${id}`)
    .order('ensemble_id')

  return {
    actor,
    roles: roles || []
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const data = await getActorData(id)

  if (!data) {
    return { title: "Skuespiller ikke funnet | Teateret" }
  }

  return {
    title: `${data.actor.name} | Teateret`,
    description: data.actor.bio || `Profil for skuespiller ${data.actor.name}`,
  }
}

export default async function ActorPage({ params }: PageProps) {
  const { id } = await params
  const data = await getActorData(id)

  if (!data) {
    notFound()
  }

  const { actor, roles } = data

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative bg-[var(--color-stage-black)] text-[var(--color-on-hero)] film-grain">
          <div className="container px-4 py-20 md:py-24">
            {/* Back Button */}
            <div className="mb-8">
              <BackButton />
            </div>

            <div className="grid gap-10 lg:grid-cols-3 items-start">
              {/* Actor Photo */}
              <div className="lg:col-span-1">
                <div className="aspect-[3/4] relative rounded-xl overflow-hidden bg-[var(--color-stage-black)]">
                  {actor.photo_url ? (
                    <Image
                      src={actor.photo_url}
                      alt={actor.name}
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="h-24 w-24 text-slate-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Actor Info */}
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-2 tracking-tight">{actor.name}</h1>
                  <p className="text-sm text-[var(--muted)] mb-4">Skuespillerprofil</p>
                  
                  {/* Status Badge */}
                  {actor.user ? (
                    <Badge className="bg-green-600 text-white mb-4">
                      <Theater className="h-3 w-3 mr-1" />
                      Registrert bruker
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-slate-500 text-slate-300 mb-4">
                      <Users className="h-3 w-3 mr-1" />
                      Skuespillerprofil
                    </Badge>
                  )}

                  {/* Bio */}
                  {actor.bio && (
                    <div>
                      <h2 className="text-lg md:text-xl font-semibold mb-3">Om skuespilleren</h2>
                      <p className="text-[var(--muted)] leading-relaxed whitespace-pre-wrap text-lg">{actor.bio}</p>
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                {(actor.contact_email || actor.contact_phone) && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3">Kontaktinformasjon</h2>
                    <div className="space-y-3 text-[var(--muted)]">
                      {actor.contact_email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-[var(--muted)]" />
                          <a href={`mailto:${actor.contact_email}`} className="hover:underline">
                            {actor.contact_email}
                          </a>
                        </div>
                      )}
                      {actor.contact_phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-5 w-5 text-[var(--muted)]" />
                          <a href={`tel:${actor.contact_phone}`} className="hover:underline">
                            {actor.contact_phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Redirect to User Profile */}
                {actor.user && actor.user.profile_slug && (
                  <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
                    <p className="text-green-300 mb-3">
                      {actor.name} har en fullstendig brukerprofil tilgjengelig.
                    </p>
                    <Button asChild className="bg-green-600 hover:bg-green-700">
                      <Link href={`/profile/${actor.user.profile_slug}`}>
                        Se fullstendig profil
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Roles Section */}
        {roles.length > 0 && (
          <section className="py-16 bg-[var(--bg)]" aria-labelledby="roles-heading">
            <div className="container px-4">
              <h2 id="roles-heading" className="text-3xl md:text-4xl font-serif font-bold text-center mb-12">Roller</h2>

              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => {
                  const ensemble = Array.isArray(role.ensemble) ? role.ensemble[0] : role.ensemble
                  
                  return (
                    <Card key={role.id} className="overflow-hidden hover:shadow-pop transition-shadow">
                      <Link href={`/ensemble/${ensemble.slug}`} aria-label={`Gå til ${ensemble.title}`}>
                        <div className="aspect-[3/2] relative bg-[var(--card)]">
                          {ensemble.thumbnail_url ? (
                            <Image
                              src={ensemble.thumbnail_url}
                              alt={ensemble.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Theater className="h-12 w-12 text-[var(--muted)]" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-stage-black)/60] via-transparent to-transparent" />
                          <div className="absolute bottom-4 left-4 text-[var(--color-on-hero)]">
                            <h3 className="font-semibold text-lg">{ensemble.title}</h3>
                            {ensemble.year && (
                              <p className="text-sm opacity-90">{ensemble.year}</p>
                            )}
                          </div>
                        </div>
                      </Link>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{role.character_name}</h4>
                            {role.description && (
                              <p className="text-sm text-[var(--muted)] line-clamp-2">{role.description}</p>
                            )}
                          </div>
                          {role.importance === 'lead' && (
                            <Badge className="bg-[var(--accent)] text-[var(--fg)]">⭐ Hovedrolle</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* No Roles Message */}
        {roles.length === 0 && (
          <section className="py-16 bg-slate-50">
            <div className="container px-4 text-center">
              <Theater className="h-16 w-16 mx-auto text-slate-400 mb-4" />
              <h2 className="text-2xl font-semibold text-slate-700 mb-2">Ingen roller ennå</h2>
              <p className="text-slate-600">
                {actor.name} har ikke spilt noen roller i våre produksjoner ennå.
              </p>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}