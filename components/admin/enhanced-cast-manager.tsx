"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { 
  Plus, 
  Trash2, 
  User, 
  Crown, 
  Search, 
  UserPlus, 
  Theater,
  Users,
  ChevronRight,
  Check,
  X,
  Mail,
  Phone
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Actor {
  id: string
  name: string
  bio?: string
  photo_url?: string
  birth_date?: string
  contact_email?: string
  contact_phone?: string
  user_id?: string
}

interface Role {
  id?: string
  character_name: string
  description?: string
  importance: 'lead' | 'supporting' | 'ensemble'
  yellow_actor?: Actor | null
  blue_actor?: Actor | null
}

interface Enrollment {
  id: string
  user_id: string
  ensemble_id: string
  status: string
  enrolled_at: string
  users: {
    id: string
    full_name: string
    email: string
    phone?: string
    avatar_url?: string
    profile_slug?: string
  }
}

interface EnhancedCastManagerProps {
  ensembleId: string
  roles: Role[]
  onChange: (roles: Role[]) => void
}

export function EnhancedCastManager({ ensembleId, roles, onChange }: EnhancedCastManagerProps) {
  const [isAddingRole, setIsAddingRole] = useState(false)
  const [isAddingActor, setIsAddingActor] = useState<{ roleIndex: number; team: 'yellow' | 'blue' } | null>(null)
  const [showCreateActorForm, setShowCreateActorForm] = useState(false)
  const [actorSearchQuery, setActorSearchQuery] = useState("")
  const [actorSuggestions, setActorSuggestions] = useState<Actor[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [showEnrollments, setShowEnrollments] = useState(false)
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const supabase = getSupabaseBrowserClient()

  const [newRole, setNewRole] = useState({
    character_name: "",
    description: "",
    importance: "supporting" as const
  })

  const [newActor, setNewActor] = useState({
    name: "",
    bio: "",
    photo_url: "",
    contact_email: "",
    contact_phone: ""
  })

  // Fetch enrollments
  useEffect(() => {
    if (ensembleId) {
      fetchEnrollments()
    }
  }, [ensembleId])

  const fetchEnrollments = async () => {
    setLoadingEnrollments(true)
    try {
      const { data, error } = await supabase
        .from("ensemble_enrollments")
        .select(`
          id,
          user_id,
          ensemble_id,
          status,
          enrolled_at,
          users!ensemble_enrollments_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            avatar_url,
            profile_slug
          )
        `)
        .eq("ensemble_id", ensembleId)
        .eq("status", "pending")
        .order("enrolled_at", { ascending: false })

      if (error) throw error
      setEnrollments(data || [])
    } catch (error) {
      console.error("Error fetching enrollments:", error)
      toast.error("Kunne ikke hente påmeldinger")
    } finally {
      setLoadingEnrollments(false)
    }
  }

  const acceptEnrollment = async (enrollment: Enrollment) => {
    try {
      console.log("Accepting enrollment:", enrollment)
      
      // First check if user already has an actor profile
      const { data: existingActor } = await supabase
        .from('actors')
        .select('id, name')
        .eq('user_id', enrollment.user_id)
        .single()

      let actorId: string

      if (existingActor) {
        console.log("User already has actor profile:", existingActor)
        actorId = existingActor.id
        toast.success(`${enrollment.users.full_name} har allerede en skuespillerprofil`)
      } else {
        // Create actor profile linked to user
        const actorData = {
          name: enrollment.users.full_name,
          contact_email: enrollment.users.email,
          contact_phone: enrollment.users.phone || "",
          photo_url: enrollment.users.avatar_url || "",
          user_id: enrollment.user_id,
          bio: `Ensemble member`
        }

        console.log("Creating actor with data:", actorData)

        const response = await fetch('/api/actors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(actorData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error("Actor creation error response:", errorData)
          throw new Error(errorData.error || "Failed to create actor profile")
        }

        const result = await response.json()
        console.log("Actor creation result:", result)
        actorId = result.actor.id
        
        toast.success(`Skuespillerprofil opprettet for ${enrollment.users.full_name}`)
      }

      // Update enrollment status to yellow (accepted to yellow team)
      const { error } = await supabase
        .from("ensemble_enrollments")
        .update({ 
          status: "yellow",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", enrollment.id)

      if (error) {
        console.error("Enrollment update error:", error)
        throw error
      }

      toast.success(`${enrollment.users.full_name} godkjent til gult lag`)
      fetchEnrollments() // Refresh list
    } catch (error) {
      console.error("Error accepting enrollment:", error)
      toast.error("Kunne ikke godkjenne påmelding: " + (error instanceof Error ? error.message : "Ukjent feil"))
    }
  }

  const rejectEnrollment = async (enrollmentId: string) => {
    try {
      const { error } = await supabase
        .from("ensemble_enrollments")
        .update({ 
          status: "rejected",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", enrollmentId)

      if (error) throw error

      toast.success("Påmelding avslått")
      fetchEnrollments() // Refresh list
    } catch (error) {
      console.error("Error rejecting enrollment:", error)
      toast.error("Kunne ikke avslå påmelding")
    }
  }

  // Search for actors with debouncing - only those enrolled in this ensemble
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (actorSearchQuery.length >= 1) {
        try {
          const response = await fetch(`/api/actors/search?q=${encodeURIComponent(actorSearchQuery)}&ensembleId=${ensembleId}`)
          if (response.ok) {
            const data = await response.json()
            setActorSuggestions(data.actors || [])
            setShowSuggestions(true)
          }
        } catch (error) {
          console.error('Error searching actors:', error)
        }
      } else {
        setActorSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [actorSearchQuery])

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addRole = () => {
    if (!newRole.character_name.trim()) {
      toast.error("Rolle navn er påkrevd")
      return
    }

    const role: Role = {
      character_name: newRole.character_name.trim(),
      description: newRole.description.trim() || undefined,
      importance: newRole.importance,
      yellow_actor: null,
      blue_actor: null
    }

    onChange([...roles, role])
    setNewRole({ character_name: "", description: "", importance: "supporting" })
    setIsAddingRole(false)
    toast.success(`Rolle "${role.character_name}" lagt til`)
  }

  const removeRole = (index: number) => {
    const role = roles[index]
    const updatedRoles = roles.filter((_, i) => i !== index)
    onChange(updatedRoles)
    toast.success(`Rolle "${role.character_name}" fjernet`)
  }

  const selectActor = (actor: Actor, roleIndex: number, team: 'yellow' | 'blue') => {
    const updatedRoles = roles.map((role, index) => {
      if (index === roleIndex) {
        return {
          ...role,
          [team === 'yellow' ? 'yellow_actor' : 'blue_actor']: actor
        }
      }
      return role
    })

    onChange(updatedRoles)
    setIsAddingActor(null)
    setActorSearchQuery("")
    setShowSuggestions(false)
    toast.success(`${actor.name} tildelt rolle`)
  }

  const removeActor = (roleIndex: number, team: 'yellow' | 'blue') => {
    const updatedRoles = roles.map((role, index) => {
      if (index === roleIndex) {
        return {
          ...role,
          [team === 'yellow' ? 'yellow_actor' : 'blue_actor']: null
        }
      }
      return role
    })

    onChange(updatedRoles)
    toast.success("Skuespiller fjernet fra rolle")
  }

  const createNewActor = async () => {
    if (!newActor.name.trim()) {
      toast.error("Skuespiller navn er påkrevd")
      return
    }

    try {
      const response = await fetch('/api/actors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newActor),
      })

      if (response.ok) {
        const data = await response.json()
        const actor = data.actor

        // Auto-assign to the role being edited
        if (isAddingActor) {
          selectActor(actor, isAddingActor.roleIndex, isAddingActor.team)
        }

        setNewActor({
          name: "",
          bio: "",
          photo_url: "",
          contact_email: "",
          contact_phone: ""
        })
        
        toast.success(`Skuespiller "${actor.name}" opprettet`)
      } else {
        const errorData = await response.json()
        
        if (errorData.code === 'TABLES_NOT_EXIST') {
          toast.error("Database tabeller er ikke initialisert. Kontakt administrator.")
        } else {
          toast.error(errorData.error || "Kunne ikke opprette skuespiller")
        }
      }
    } catch (error) {
      console.error('Error creating actor:', error)
      toast.error("Kunne ikke opprette skuespiller")
    }
  }

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'lead': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'supporting': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'ensemble': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case 'lead': return Crown
      case 'supporting': return User
      case 'ensemble': return Users
      default: return User
    }
  }

  const getTotalActors = () => {
    const actors = new Set()
    roles.forEach(role => {
      if (role.yellow_actor) actors.add(role.yellow_actor.id)
      if (role.blue_actor) actors.add(role.blue_actor.id)
    })
    return actors.size
  }

  return (
    <div className="relative">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Theater className="h-5 w-5" />
                Roller og skuespillere
              </CardTitle>
              <CardDescription>
                Administrer karakterer i forestillingen og tildel skuespillere til gul og blå lag.
                {roles.length > 0 && ` ${roles.length} roller, ${getTotalActors()} unike skuespillere.`}
              </CardDescription>
            </div>
            <Sheet open={showEnrollments} onOpenChange={setShowEnrollments}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <Users className="h-4 w-4 mr-2" />
                  Påmeldinger
                  {enrollments.length > 0 && (
                    <Badge className="ml-2 bg-green-600">{enrollments.length}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Ventende påmeldinger</SheetTitle>
                  <SheetDescription>
                    Godkjenn eller avslå påmeldinger. Ved godkjenning opprettes automatisk en skuespillerprofil.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {loadingEnrollments ? (
                    <p className="text-center text-muted-foreground">Laster...</p>
                  ) : enrollments.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Ingen ventende påmeldinger</p>
                    </div>
                  ) : (
                    enrollments.map((enrollment) => (
                      <Card key={enrollment.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={enrollment.users.avatar_url} />
                              <AvatarFallback>
                                {enrollment.users.full_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold">{enrollment.users.full_name}</h4>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{enrollment.users.email}</span>
                              </div>
                              {enrollment.users.phone && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{enrollment.users.phone}</span>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                Meldt på: {new Date(enrollment.enrolled_at).toLocaleDateString('no-NO')}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => acceptEnrollment(enrollment)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Godkjenn
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => rejectEnrollment(enrollment.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Avslå
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Add new role */}
        {isAddingRole ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ny rolle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="character_name">Karakternavn *</Label>
                <Input
                  id="character_name"
                  placeholder="f.eks. Hamlet, Regissør, Lysoperatør"
                  value={newRole.character_name}
                  onChange={(e) => setNewRole({ ...newRole, character_name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addRole()}
                />
              </div>
              <div>
                <Label htmlFor="description">Beskrivelse</Label>
                <Textarea
                  id="description"
                  placeholder="Beskriv rollen..."
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="importance">Viktighet</Label>
                <Select
                  value={newRole.importance}
                  onValueChange={(value) => setNewRole({ ...newRole, importance: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Hovedrolle</SelectItem>
                    <SelectItem value="supporting">Biroll</SelectItem>
                    <SelectItem value="ensemble">Ensemble</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={addRole}>
                  <Plus className="h-4 w-4 mr-2" />
                  Legg til rolle
                </Button>
                <Button variant="outline" onClick={() => setIsAddingRole(false)}>
                  Avbryt
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button onClick={() => setIsAddingRole(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ny rolle
          </Button>
        )}

        {/* Roles list */}
        <div className="space-y-4">
          {roles.map((role, roleIndex) => {
            const ImportanceIcon = getImportanceIcon(role.importance)
            
            return (
              <Card key={roleIndex}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImportanceIcon className="h-5 w-5" />
                      <CardTitle className="text-lg">{role.character_name}</CardTitle>
                      <Badge className={cn("text-xs", getImportanceColor(role.importance))}>
                        {role.importance === 'lead' ? 'Hovedrolle' : 
                         role.importance === 'supporting' ? 'Biroll' : 'Ensemble'}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeRole(roleIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {role.description && (
                    <CardDescription>{role.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Yellow team */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                        Gul lag
                      </h4>
                      {role.yellow_actor ? (
                        <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={role.yellow_actor.photo_url} />
                            <AvatarFallback>
                              {role.yellow_actor.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{role.yellow_actor.name}</p>
                            {role.yellow_actor.bio && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {role.yellow_actor.bio}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeActor(roleIndex, 'yellow')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setIsAddingActor({ roleIndex, team: 'yellow' })
                            setActorSearchQuery("")
                            setShowCreateActorForm(false)
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Tildel skuespiller
                        </Button>
                      )}
                    </div>

                    {/* Blue team */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-400 rounded-full" />
                        Blå lag
                      </h4>
                      {role.blue_actor ? (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={role.blue_actor.photo_url} />
                            <AvatarFallback>
                              {role.blue_actor.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{role.blue_actor.name}</p>
                            {role.blue_actor.bio && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {role.blue_actor.bio}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeActor(roleIndex, 'blue')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setIsAddingActor({ roleIndex, team: 'blue' })
                            setActorSearchQuery("")
                            setShowCreateActorForm(false)
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Tildel skuespiller
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Actor assignment modal */}
        {isAddingActor && (
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-lg">
                Tildel skuespiller til {roles[isAddingActor.roleIndex]?.character_name} 
                ({isAddingActor.team === 'yellow' ? 'Gul lag' : 'Blå lag'})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search existing actors */}
              <div className="relative" ref={searchInputRef}>
                <Label htmlFor="actor_search">Søk påmeldte skuespillere</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Kun brukere som har meldt seg på dette ensemblet kan tildeles roller
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="actor_search"
                    placeholder="Søk etter navn..."
                    value={actorSearchQuery}
                    onChange={(e) => setActorSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Suggestions dropdown */}
                {showSuggestions && actorSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {actorSuggestions.map((actor) => (
                      <div
                        key={actor.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => selectActor(actor, isAddingActor.roleIndex, isAddingActor.team)}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={actor.photo_url} />
                          <AvatarFallback className="text-xs">
                            {actor.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{actor.name}</p>
                          {actor.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {actor.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* No results message */}
                {showSuggestions && actorSuggestions.length === 0 && actorSearchQuery.length > 0 && (
                  <div className="mt-2 p-4 bg-muted rounded-md text-center">
                    <p className="text-sm text-muted-foreground">
                      Ingen påmeldte skuespillere funnet. Brukere må meldes på ensemblet og godkjennes før de kan tildeles roller.
                    </p>
                  </div>
                )}
              </div>

              {/* Create actor form - shown when button is clicked */}
              {showCreateActorForm && (
                <div className="space-y-3 border-t pt-4">
                  <Label>Opprett ny skuespiller uten konto</Label>
                  <p className="text-sm text-muted-foreground">
                    For eksterne skuespillere som ikke har brukerkonto
                  </p>
                  <Input
                    placeholder="Navn *"
                    value={newActor.name}
                    onChange={(e) => setNewActor({ ...newActor, name: e.target.value })}
                  />
                  <Input
                    placeholder="Bilde URL"
                    value={newActor.photo_url}
                    onChange={(e) => setNewActor({ ...newActor, photo_url: e.target.value })}
                  />
                  <Textarea
                    placeholder="Biografi"
                    value={newActor.bio}
                    onChange={(e) => setNewActor({ ...newActor, bio: e.target.value })}
                  />
                  <div className="grid md:grid-cols-2 gap-2">
                    <Input
                      placeholder="E-post"
                      value={newActor.contact_email}
                      onChange={(e) => setNewActor({ ...newActor, contact_email: e.target.value })}
                    />
                    <Input
                      placeholder="Telefon"
                      value={newActor.contact_phone}
                      onChange={(e) => setNewActor({ ...newActor, contact_phone: e.target.value })}
                    />
                  </div>
                  <Button onClick={createNewActor} className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Opprett og tildel
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setIsAddingActor(null)
                  setShowCreateActorForm(false)
                }} className="flex-1">
                  Avbryt
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowCreateActorForm(!showCreateActorForm)}
                  className="flex-1"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {showCreateActorForm ? "Skjul skjema" : "Opprett ny skuespiller uten konto"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {roles.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Theater className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">Ingen roller ennå</p>
            <p className="text-sm text-muted-foreground">
              Legg til den første rollen for å starte
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}