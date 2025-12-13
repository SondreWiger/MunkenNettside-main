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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ActorConflictDialog } from "@/components/admin/actor-conflict-dialog"
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
  Phone,
  Edit
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
  const [editingRoleIndex, setEditingRoleIndex] = useState<number | null>(null)
  const [isAddingActor, setIsAddingActor] = useState<{ roleIndex: number; team: 'yellow' | 'blue' } | null>(null)
  const [showCreateActorForm, setShowCreateActorForm] = useState(false)
  const [actorSearchQuery, setActorSearchQuery] = useState("")
  const [actorSuggestions, setActorSuggestions] = useState<Actor[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [showEnrollments, setShowEnrollments] = useState(false)
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)
  const [actorConflict, setActorConflict] = useState<{
    existingActor: Actor
    pendingEnrollment: Enrollment
  } | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const supabase = getSupabaseBrowserClient()

  const [newRole, setNewRole] = useState({
    character_name: "",
    description: "",
    importance: "supporting" as const
  })

  const [editRole, setEditRole] = useState<{
    description: string
    importance: 'lead' | 'supporting' | 'ensemble'
  }>({
    description: "",
    importance: "supporting"
  })

  const [newActor, setNewActor] = useState({
    name: "",
    bio: "",
    photo_url: "",
    contact_email: "",
    contact_phone: ""
  })

  const [showBulkRoleDialog, setShowBulkRoleDialog] = useState(false)
  const [bulkRoleText, setBulkRoleText] = useState('')
  const [bulkRoleResults, setBulkRoleResults] = useState<{
    roleIndex: number
    roleName: string
    actorInput: string
    matches: Actor[]
    selectedActorId?: string
    status: 'pending' | 'assigned' | 'created' | 'skipped'
    team: 'yellow' | 'blue'
    isRepeat: boolean
  }[]>([])
  const [processingBulk, setProcessingBulk] = useState(false)

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
          enrolled_at
        `)
        .eq("ensemble_id", ensembleId)
        .eq("status", "pending")
        .order("enrolled_at", { ascending: false })

      if (error) throw error
      
      // Fetch user data separately for each enrollment
      if (data) {
        const enrollmentsWithUsers = await Promise.all(
          data.map(async (enrollment: any) => {
            const { data: userData } = await supabase
              .from('users')
              .select('id, full_name, email, phone, avatar_url, slug')
              .eq('id', enrollment.user_id)
              .single()
            
            return {
              ...enrollment,
              users: userData || { id: enrollment.user_id, full_name: 'Unknown' }
            }
          })
        )
        setEnrollments(enrollmentsWithUsers || [])
      } else {
        setEnrollments([])
      }
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
      const { data: existingActorByUser } = await supabase
        .from('actors')
        .select('id, name, bio, photo_url, contact_email, contact_phone, user_id')
        .eq('user_id', enrollment.user_id)
        .maybeSingle()

      if (existingActorByUser) {
        // User already has an actor profile, use it
        console.log("User already has actor profile:", existingActorByUser)
        await finalizeAcceptance(enrollment, existingActorByUser.id)
        toast.success(`${enrollment.users.full_name} godkjent (bruker eksisterende skuespillerprofil)`)
        return
      }

      // Check if an actor with the same name exists (not linked to this user)
      const { data: existingActorByName } = await supabase
        .from('actors')
        .select('id, name, bio, photo_url, contact_email, contact_phone, user_id')
        .eq('name', enrollment.users.full_name)
        .maybeSingle()

      if (existingActorByName) {
        // If this actor is already linked to the SAME user, just use it
        if (existingActorByName.user_id === enrollment.user_id) {
          console.log("Found actor with same name linked to same user, using it")
          await finalizeAcceptance(enrollment, existingActorByName.id)
          toast.success(`${enrollment.users.full_name} godkjent (bruker eksisterende skuespillerprofil)`)
          return
        }
        
        // If actor is linked to a DIFFERENT user OR not linked at all, show conflict dialog
        console.log("Found existing actor with same name:", existingActorByName)
        setActorConflict({
          existingActor: existingActorByName,
          pendingEnrollment: enrollment
        })
        return
      }

      // No conflicts, create new actor profile
      await createNewActorAndAccept(enrollment)
    } catch (error) {
      console.error("Error accepting enrollment:", error)
      toast.error("Kunne ikke godkjenne påmelding: " + (error instanceof Error ? error.message : "Ukjent feil"))
    }
  }

  const createNewActorAndAccept = async (enrollment: Enrollment, forceNew: boolean = false) => {
    try {
      const actorData = {
        name: enrollment.users.full_name,
        contact_email: enrollment.users.email,
        contact_phone: enrollment.users.phone || "",
        photo_url: enrollment.users.avatar_url || "",
        user_id: enrollment.user_id,
        bio: `Ensemble member`,
        force_new: forceNew // Signal API to use a modified name if needed
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
      
      await finalizeAcceptance(enrollment, result.actor.id)
      toast.success(`Ny skuespillerprofil opprettet og ${enrollment.users.full_name} godkjent`)
    } catch (error) {
      console.error("Error creating actor:", error)
      throw error
    }
  }

  const useExistingActorAndAccept = async (enrollment: Enrollment, actorId: string) => {
    try {
      // Link the existing actor to this user
      const { error: linkError } = await supabase
        .from('actors')
        .update({ user_id: enrollment.user_id })
        .eq('id', actorId)

      if (linkError) {
        console.error("Error linking actor to user:", linkError)
        throw linkError
      }

      await finalizeAcceptance(enrollment, actorId)
      toast.success(`${enrollment.users.full_name} koblet til eksisterende skuespillerprofil og godkjent`)
    } catch (error) {
      console.error("Error using existing actor:", error)
      throw error
    }
  }

  const finalizeAcceptance = async (enrollment: Enrollment, actorId: string) => {
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

    fetchEnrollments() // Refresh list
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

    // Check for duplicate role names
    const duplicateRole = roles.find(
      role => role.character_name.toLowerCase().trim() === newRole.character_name.toLowerCase().trim()
    )
    
    if (duplicateRole) {
      toast.error(`En rolle med navnet "${newRole.character_name}" eksisterer allerede`)
      return
    }

    const role: Role = {
      character_name: newRole.character_name.trim(),
      description: newRole.description.trim() || undefined,
      importance: newRole.importance,
      yellow_actor: null,
      blue_actor: null
    }

    // Add new role at the top of the list
    onChange([role, ...roles])
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

  const startEditingRole = (index: number) => {
    const role = roles[index]
    setEditingRoleIndex(index)
    setEditRole({
      description: role.description || "",
      importance: role.importance
    })
  }

  const updateRole = (index: number) => {
    const updatedRoles = roles.map((role, i) => {
      if (i === index) {
        return {
          ...role,
          description: editRole.description.trim() || undefined,
          importance: editRole.importance
        }
      }
      return role
    })
    
    onChange(updatedRoles)
    setEditingRoleIndex(null)
    toast.success(`Rolle oppdatert`)
  }

  const cancelEditingRole = () => {
    setEditingRoleIndex(null)
    setEditRole({ description: "", importance: "supporting" })
  }

  const parseBulkRoles = async () => {
    if (!bulkRoleText.trim()) {
      toast.error("Skriv inn roller (Rollenavn -- Skuespillernavn)")
      return
    }

    const lines = bulkRoleText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    if (lines.length === 0) {
      toast.error("Ingen gyldige roller funnet")
      return
    }

    setProcessingBulk(true)
    const results: typeof bulkRoleResults = []
    let currentTeam: 'yellow' | 'blue' = 'yellow' // Default to yellow
    const processedRoles = new Set<string>() // Track roles we've already seen

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check for team headers
      if (line.toLowerCase() === '--yellow--') {
        currentTeam = 'yellow'
        continue
      }
      if (line.toLowerCase() === '--blue--') {
        currentTeam = 'blue'
        continue
      }

      const parts = line.split('--').map(p => p.trim())
      
      if (parts.length !== 2) {
        results.push({
          roleIndex: i,
          roleName: line,
          actorInput: '',
          matches: [],
          status: 'skipped',
          team: currentTeam,
          isRepeat: false
        })
        continue
      }

      const [roleName, actorInput] = parts

      // Check if role already exists in the database
      if (roles.some(r => r.character_name.toLowerCase() === roleName.toLowerCase())) {
        results.push({
          roleIndex: i,
          roleName,
          actorInput,
          matches: [],
          status: 'skipped',
          team: currentTeam,
          isRepeat: false
        })
        continue
      }

      const roleLower = roleName.toLowerCase()
      const isRepeat = processedRoles.has(roleLower)
      processedRoles.add(roleLower)

      // Search for matching actors
      try {
        const { data: actors, error } = await supabase
          .from('actors')
          .select('*')
          .ilike('name', `%${actorInput}%`)
          .limit(5)

        if (error) throw error

        results.push({
          roleIndex: i,
          roleName,
          actorInput,
          matches: actors || [],
          status: 'pending',
          team: currentTeam,
          isRepeat
        })
      } catch (error) {
        console.error('Error searching actors:', error)
        results.push({
          roleIndex: i,
          roleName,
          actorInput,
          matches: [],
          status: 'pending',
          team: currentTeam,
          isRepeat
        })
      }
    }

    setBulkRoleResults(results)
    setProcessingBulk(false)
  }

  const applyBulkRoleSelection = async (resultIndex: number, actorId: string | 'create') => {
    const result = bulkRoleResults[resultIndex]
    
    let actorToAssign: Actor | null = null

    if (actorId === 'create') {
      // Create new actor
      try {
        const response = await fetch('/api/actors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: result.actorInput,
            user_id: null
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }
        
        const responseData = await response.json()
        actorToAssign = responseData.actor // Extract actor from response object
        
      } catch (error) {
        console.error('Error creating actor:', error)
        const errorMessage = error instanceof Error ? error.message : 'Ukjent feil'
        toast.error(`Kunne ikke opprette ${result.actorInput}: ${errorMessage}`)
        return
      }
    } else {
      actorToAssign = result.matches.find(a => a.id === actorId) || null
    }

    if (!actorToAssign) return

    // Update result status and add to matches if newly created
    const updatedResults = [...bulkRoleResults]
    const updatedMatches = actorId === 'create' 
      ? [...result.matches, actorToAssign]
      : result.matches
    
    updatedResults[resultIndex] = {
      ...result,
      matches: updatedMatches,
      selectedActorId: actorToAssign.id,
      status: actorId === 'create' ? 'created' : 'assigned'
    }
    setBulkRoleResults(updatedResults)
  }

  const finalizeBulkRoles = () => {
    const roleMap = new Map<string, Role>()
    
    bulkRoleResults.forEach(result => {
      if (result.status === 'assigned' || result.status === 'created') {
        const actor = result.matches.find(a => a.id === result.selectedActorId)
        const roleLower = result.roleName.toLowerCase()
        
        if (roleMap.has(roleLower)) {
          // This is a repeat - add to the appropriate team
          const existingRole = roleMap.get(roleLower)!
          if (result.team === 'yellow') {
            existingRole.yellow_actor = actor || null
          } else {
            existingRole.blue_actor = actor || null
          }
        } else {
          // First occurrence - create new role
          roleMap.set(roleLower, {
            character_name: result.roleName,
            description: '',
            importance: 'supporting',
            yellow_actor: result.team === 'yellow' ? (actor || null) : null,
            blue_actor: result.team === 'blue' ? (actor || null) : null
          })
        }
      }
    })

    const newRoles = Array.from(roleMap.values())

    if (newRoles.length === 0) {
      toast.error("Ingen roller å legge til")
      return
    }

    // Add to top of roles list
    onChange([...newRoles, ...roles])
    
    // Reset dialog
    setShowBulkRoleDialog(false)
    setBulkRoleText('')
    setBulkRoleResults([])
    
    toast.success(`${newRoles.length} roller opprettet`)
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
          <div className="flex gap-2">
            <Button onClick={() => setIsAddingRole(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ny rolle
            </Button>
            <Button onClick={() => setShowBulkRoleDialog(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Opprett flere
            </Button>
          </div>
        )}

        {/* Roles list */}
        <div className="space-y-4">
          {roles.map((role, roleIndex) => {
            const ImportanceIcon = getImportanceIcon(role.importance)
            const isEditingThisRole = isAddingActor?.roleIndex === roleIndex
            const isEditingRoleDetails = editingRoleIndex === roleIndex
            
            return (
              <div key={roleIndex} className="space-y-3">
                <Card>
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
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditingRole(roleIndex)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeRole(roleIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {!isEditingRoleDetails && role.description && (
                      <CardDescription>{role.description}</CardDescription>
                    )}
                  </CardHeader>
                  
                  {/* Edit role form */}
                  {isEditingRoleDetails && (
                    <CardContent className="space-y-4 border-t pt-4">
                      <div>
                        <Label htmlFor={`edit_description_${roleIndex}`}>Beskrivelse</Label>
                        <Textarea
                          id={`edit_description_${roleIndex}`}
                          placeholder="Beskriv rollen..."
                          value={editRole.description}
                          onChange={(e) => setEditRole({ ...editRole, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit_importance_${roleIndex}`}>Viktighet</Label>
                        <Select
                          value={editRole.importance}
                          onValueChange={(value) => setEditRole({ ...editRole, importance: value as 'lead' | 'supporting' | 'ensemble' })}
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
                        <Button onClick={() => updateRole(roleIndex)} size="sm">
                          <Check className="h-4 w-4 mr-2" />
                          Lagre
                        </Button>
                        <Button variant="outline" onClick={cancelEditingRole} size="sm">
                          Avbryt
                        </Button>
                      </div>
                    </CardContent>
                  )}
                  
                  {!isEditingRoleDetails && (
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
                  )}
                </Card>
                
                {/* Actor assignment form - appears directly below the role */}
                {isEditingThisRole && (
                  <Card className="border-2 border-primary">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Tildel skuespiller til {role.character_name} 
                        ({isAddingActor.team === 'yellow' ? 'Gul lag' : 'Blå lag'})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Search existing actors */}
                      <div className="relative" ref={searchInputRef}>
                        <Label htmlFor="actor_search">Søk skuespillere</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Søk etter alle skuespillere i databasen
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
                              Ingen skuespillere funnet. Opprett en ny skuespiller nedenfor eller sjekk stavemåten.
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
                          {showCreateActorForm ? "Skjul skjema" : "Opprett ny"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )
          })}
        </div>

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

    {/* Actor Conflict Resolution Dialog */}
    {actorConflict && (
      <ActorConflictDialog
        open={!!actorConflict}
        onOpenChange={(open) => !open && setActorConflict(null)}
        existingActor={actorConflict.existingActor}
        newUserName={actorConflict.pendingEnrollment.users.full_name}
        newUserEmail={actorConflict.pendingEnrollment.users.email}
        onUseExisting={async (actorId) => {
          await useExistingActorAndAccept(actorConflict.pendingEnrollment, actorId)
          setActorConflict(null)
        }}
        onCreateNew={async () => {
          await createNewActorAndAccept(actorConflict.pendingEnrollment, true)
          setActorConflict(null)
        }}
      />
    )}

    {/* Bulk Role Creation Dialog */}
    <Dialog open={showBulkRoleDialog} onOpenChange={setShowBulkRoleDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Opprett flere roller med tildeling</DialogTitle>
          <DialogDescription>
            Bruk --Yellow-- og --Blue-- for å skille lag. Format: Rollenavn -- Skuespillernavn. Roller settes som birolle som standard.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {bulkRoleResults.length === 0 ? (
            <>
              <div>
                <textarea
                  className="w-full min-h-[300px] p-3 border rounded-md font-mono text-sm"
                  placeholder="--Yellow--&#10;Krystell -- Elise&#10;Bob -- Simen&#10;&#10;--Blue--&#10;Krystell -- Emma&#10;Bob -- Nils"
                  value={bulkRoleText}
                  onChange={(e) => setBulkRoleText(e.target.value)}
                  disabled={processingBulk}
                />
              </div>
              <Button 
                onClick={parseBulkRoles}
                disabled={processingBulk || !bulkRoleText.trim()}
                className="w-full"
              >
                {processingBulk ? 'Analyserer...' : 'Analyser og match'}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                {bulkRoleResults.map((result, idx) => (
                  <Card key={idx} className={cn(
                    "p-4",
                    result.status === 'skipped' && "bg-gray-100",
                    result.status === 'assigned' && "bg-green-50",
                    result.status === 'created' && "bg-blue-50"
                  )}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{result.roleName}</h4>
                            <Badge variant={result.team === 'yellow' ? 'default' : 'secondary'} className="text-xs">
                              {result.team === 'yellow' ? 'Gul' : 'Blå'}
                            </Badge>
                            {result.isRepeat && (
                              <Badge variant="outline" className="text-xs">
                                Repetert
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">Søker etter: {result.actorInput}</p>
                        </div>
                        {result.status !== 'pending' && (
                          <Badge variant={
                            result.status === 'assigned' ? 'default' :
                            result.status === 'created' ? 'secondary' : 'outline'
                          }>
                            {result.status === 'assigned' && 'Tildelt'}
                            {result.status === 'created' && 'Opprettet'}
                            {result.status === 'skipped' && 'Hoppet over'}
                          </Badge>
                        )}
                      </div>

                      {result.status === 'pending' && (
                        <div className="space-y-2 mt-3">
                          {result.matches.length > 0 ? (
                            <>
                              <p className="text-sm font-medium">Foreslåtte matches:</p>
                              <div className="space-y-2">
                                {result.matches.map((actor) => (
                                  <Button
                                    key={actor.id}
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => applyBulkRoleSelection(idx, actor.id)}
                                  >
                                    <User className="h-4 w-4 mr-2" />
                                    {actor.name}
                                    <Badge variant="secondary" className="ml-auto">
                                      Match
                                    </Badge>
                                  </Button>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">Ingen eksisterende matches funnet</p>
                          )}
                          
                          <Button
                            variant="outline"
                            className="w-full border-dashed"
                            onClick={() => applyBulkRoleSelection(idx, 'create')}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Opprett ny skuespiller: {result.actorInput}
                          </Button>
                        </div>
                      )}

                      {result.status === 'skipped' && (
                        <p className="text-sm text-red-600">
                          {!result.actorInput 
                            ? 'Ugyldig format' 
                            : 'Rolle eksisterer allerede i databasen'
                          }
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              <DialogFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowBulkRoleDialog(false)
                    setBulkRoleText('')
                    setBulkRoleResults([])
                  }}
                >
                  Avbryt
                </Button>
                <Button 
                  onClick={finalizeBulkRoles}
                  disabled={bulkRoleResults.every(r => r.status === 'pending' || r.status === 'skipped')}
                >
                  Fullfør ({bulkRoleResults.filter(r => r.status === 'assigned' || r.status === 'created').length} roller)
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </div>
  )
}
