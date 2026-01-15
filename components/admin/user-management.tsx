"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import QRCode from 'qrcode'
import { 
  Users, 
  Crown, 
  Shield, 
  User, 
  Edit, 
  Trash2,
  UserPlus,
  Theater,
  Link,
  Unlink,
  Mail,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Check,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface User {
  id: string
  full_name: string
  email: string
  phone?: string
  role: 'customer' | 'staff' | 'admin' | 'superadmin'
  profile_slug?: string
  actor_id?: string
  actor?: {
    id: string
    name: string
    bio?: string
    photo_url?: string
  }
  created_at: string
  updated_at: string
}

interface Actor {
  id: string
  name: string
  bio?: string
  photo_url?: string
  contact_email?: string
  contact_phone?: string
  user_id?: string
}

const USERS_PER_PAGE = 25
const ACTORS_PER_PAGE = 25

type RoleFilter = 'all' | 'customer' | 'staff' | 'admin' | 'superadmin'
type ConnectionFilter = 'all' | 'connected' | 'not-connected'

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [actors, setActors] = useState<Actor[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const router = useRouter()

  // Search and filtering
  const [userSearch, setUserSearch] = useState('')
  const [actorSearch, setActorSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter>('all')
  const [actorConnectionFilter, setActorConnectionFilter] = useState<ConnectionFilter>('all')

  // Pagination
  const [userPage, setUserPage] = useState(1)
  const [actorPage, setActorPage] = useState(1)

  // Dialogs
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingActor, setEditingActor] = useState<Actor | null>(null)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [showActorDialog, setShowActorDialog] = useState(false)
  const [showBulkActorDialog, setShowBulkActorDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Forms
  const [userForm, setUserForm] = useState({
    role: 'customer' as 'customer' | 'staff' | 'admin' | 'superadmin',
    actorId: '',
    profileSlug: ''
  })

  const [actorForm, setActorForm] = useState({
    name: '',
    bio: '',
    photo_url: '',
    contact_email: '',
    contact_phone: '',
    user_id: ''
  })

  const [bulkActorText, setBulkActorText] = useState('')
  const [bulkActorResults, setBulkActorResults] = useState<{success: string[], errors: string[]}>({ success: [], errors: [] })
  const [userSearchQuery, setUserSearchQuery] = useState('')

  // Verification and QR
  const [sendingVerificationFor, setSendingVerificationFor] = useState<string | null>(null)
  const [showRegistrationModalFor, setShowRegistrationModalFor] = useState<string | null>(null)
  const [registrationToken, setRegistrationToken] = useState<string | null>(null)
  const [registrationQr, setRegistrationQr] = useState<string | null>(null)
  const [registrationExpires, setRegistrationExpires] = useState<string | null>(null)

  // Filtered and paginated data
  const filteredUsers = useMemo(() => {
    let result = users

    // Search filter
    if (userSearch.trim()) {
      const query = userSearch.toLowerCase()
      result = result.filter(user =>
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.actor?.name?.toLowerCase().includes(query)
      )
    }

    // Role filter
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter)
    }

    // Connection filter
    if (connectionFilter === 'connected') {
      result = result.filter(user => user.actor_id)
    } else if (connectionFilter === 'not-connected') {
      result = result.filter(user => !user.actor_id)
    }

    return result
  }, [users, userSearch, roleFilter, connectionFilter])

  const filteredActors = useMemo(() => {
    let result = actors

    // Search filter
    if (actorSearch.trim()) {
      const query = actorSearch.toLowerCase()
      result = result.filter(actor =>
        actor.name.toLowerCase().includes(query) ||
        actor.contact_email?.toLowerCase().includes(query)
      )
    }

    // Connection filter
    if (actorConnectionFilter === 'connected') {
      result = result.filter(actor => actor.user_id)
    } else if (actorConnectionFilter === 'not-connected') {
      result = result.filter(actor => !actor.user_id)
    }

    return result
  }, [actors, actorSearch, actorConnectionFilter])

  // Pagination
  const totalUserPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE)
  const totalActorPages = Math.ceil(filteredActors.length / ACTORS_PER_PAGE)
  
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * USERS_PER_PAGE
    return filteredUsers.slice(start, start + USERS_PER_PAGE)
  }, [filteredUsers, userPage])

  const paginatedActors = useMemo(() => {
    const start = (actorPage - 1) * ACTORS_PER_PAGE
    return filteredActors.slice(start, start + ACTORS_PER_PAGE)
  }, [filteredActors, actorPage])

  // Reset page when filters change
  useEffect(() => { setUserPage(1) }, [userSearch, roleFilter, connectionFilter])
  useEffect(() => { setActorPage(1) }, [actorSearch, actorConnectionFilter])

  // Filter users for actor dialog search
  const availableUsersForActor = useMemo(() => {
    const query = userSearchQuery.toLowerCase().trim()
    return users.filter(user => {
      const matchesSearch = !query || 
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      const isAvailable = !user.actor_id || user.actor_id === editingActor?.id
      return matchesSearch && isAvailable
    })
  }, [users, userSearchQuery, editingActor])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const usersResponse = await fetch('/api/admin/users')
      
      if (usersResponse.status === 401) {
        router.push('/logg-inn')
        return
      }

      if (usersResponse.status === 403) {
        setForbidden(true)
        setUsers([])
        return
      }

      const usersData = await usersResponse.json()
      setUsers(usersData.users || [])

      const actorsResponse = await fetch('/api/actors')
      const actorsData = await actorsResponse.json()
      setActors(actorsData.actors || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error("Kunne ikke laste data")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          role: userForm.role,
          actorId: userForm.actorId === 'none' ? null : userForm.actorId || null,
          profileSlug: userForm.profileSlug || null
        })
      })

      if (response.ok) {
        toast.success("Bruker oppdatert")
        await loadData()
        setShowUserDialog(false)
        setEditingUser(null)
      } else {
        const error = await response.json()
        toast.error(`Kunne ikke oppdatere bruker: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error("Kunne ikke oppdatere bruker")
    }
  }

  const handleUpdateActor = async () => {
    if (!editingActor) {
      await handleCreateActor()
      return
    }

    if (!actorForm.name.trim()) {
      toast.error("Navn er påkrevd")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/actors/${editingActor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...actorForm,
          user_id: actorForm.user_id === 'none' ? null : actorForm.user_id || null
        })
      })

      if (response.ok) {
        toast.success("Skuespiller oppdatert")
        await loadData()
        setShowActorDialog(false)
        setEditingActor(null)
      } else {
        const error = await response.json()
        toast.error(`Kunne ikke oppdatere skuespiller: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating actor:', error)
      toast.error("Kunne ikke oppdatere skuespiller")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateActor = async () => {
    if (!actorForm.name.trim()) {
      toast.error("Navn er påkrevd")
      return
    }

    if (actors.some(actor => actor.name.toLowerCase() === actorForm.name.toLowerCase())) {
      toast.error("En skuespiller med dette navnet eksisterer allerede")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/actors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...actorForm,
          user_id: actorForm.user_id === 'none' ? null : actorForm.user_id || null
        })
      })

      if (response.ok) {
        toast.success("Skuespiller opprettet")
        await loadData()
        setShowActorDialog(false)
        setEditingActor(null)
      } else {
        const error = await response.json()
        toast.error(`Kunne ikke opprette skuespiller: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating actor:', error)
      toast.error("Kunne ikke opprette skuespiller")
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulkActorCreation = async () => {
    if (!bulkActorText.trim()) {
      toast.error("Skriv inn navn (ett per linje)")
      return
    }

    const names = bulkActorText.split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0)

    if (names.length === 0) {
      toast.error("Ingen gyldige navn funnet")
      return
    }

    setSubmitting(true)
    const results = { success: [] as string[], errors: [] as string[] }

    for (const name of names) {
      if (actors.some(actor => actor.name.toLowerCase() === name.toLowerCase())) {
        results.errors.push(`${name} - eksisterer allerede`)
        continue
      }

      try {
        const response = await fetch('/api/actors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, user_id: null })
        })

        if (response.ok) {
          results.success.push(name)
        } else {
          const error = await response.json()
          results.errors.push(`${name} - ${error.error}`)
        }
      } catch (error) {
        results.errors.push(`${name} - nettverksfeil`)
      }
    }

    setBulkActorResults(results)
    await loadData()
    setSubmitting(false)
    
    if (results.errors.length === 0) {
      toast.success(`${results.success.length} skuespillere opprettet`)
      setShowBulkActorDialog(false)
      setBulkActorText('')
    } else if (results.success.length > 0) {
      toast.success(`${results.success.length} opprettet, ${results.errors.length} feilet`)
    } else {
      toast.error("Alle opprettelser feilet")
    }
  }

  const handleDeleteActor = async (actorId: string) => {
    if (!confirm("Er du sikker på at du vil slette denne skuespilleren?")) return

    try {
      const response = await fetch(`/api/actors/${actorId}`, { method: 'DELETE' })

      if (response.ok) {
        toast.success("Skuespiller slettet")
        await loadData()
      } else {
        const error = await response.json()
        toast.error(`Kunne ikke slette skuespiller: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting actor:', error)
      toast.error("Kunne ikke slette skuespiller")
    }
  }

  const openUserDialog = (user: User) => {
    setEditingUser(user)
    const validRole = ['customer', 'staff', 'admin', 'superadmin'].includes(user.role) ? user.role : 'customer'
    setUserForm({
      role: validRole,
      actorId: user.actor_id || 'none',
      profileSlug: user.profile_slug || ''
    })
    setShowUserDialog(true)
  }

  const openActorDialog = (actor: Actor) => {
    setEditingActor(actor)
    setActorForm({
      name: actor.name,
      bio: actor.bio || '',
      photo_url: actor.photo_url || '',
      contact_email: actor.contact_email || '',
      contact_phone: actor.contact_phone || '',
      user_id: actor.user_id || 'none'
    })
    setUserSearchQuery('')
    setShowActorDialog(true)
  }

  const openNewActorDialog = () => {
    setEditingActor(null)
    setActorForm({
      name: '',
      bio: '',
      photo_url: '',
      contact_email: '',
      contact_phone: '',
      user_id: 'none'
    })
    setUserSearchQuery('')
    setShowActorDialog(true)
  }

  const handleSendVerification = async (userId: string) => {
    if (!confirm('Send verifikasjonskode til denne administratoren?')) return
    setSendingVerificationFor(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/send-verification`, { method: 'POST' })

      if (res.status === 401) {
        router.push('/logg-inn')
        return
      }

      if (res.status === 403) {
        toast.error('Du har ikke tilgang til å sende verifikasjonskoder')
        return
      }

      if (res.status === 429) {
        toast.error('For mange forespørsler. Prøv igjen senere.')
        return
      }

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.adminUuidCreated ? 'Admin UUID opprettet og verifikasjonskode sendt' : 'Verifikasjonskode sendt')
      } else {
        toast.error(`Kunne ikke sende kode: ${data.error || 'ukjent feil'}`)
      }
    } catch (err) {
      console.error('Error sending admin verification:', err)
      toast.error('Kunne ikke sende kode')
    } finally {
      setSendingVerificationFor(null)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Badge className="bg-purple-600 hover:bg-purple-700"><Crown className="h-3 w-3 mr-1" />Superadmin</Badge>
      case 'admin':
        return <Badge className="bg-red-600 hover:bg-red-700"><Crown className="h-3 w-3 mr-1" />Admin</Badge>
      case 'staff':
        return <Badge className="bg-blue-600 hover:bg-blue-700"><Shield className="h-3 w-3 mr-1" />Ansatt</Badge>
      default:
        return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />Kunde</Badge>
    }
  }

  const clearFilters = () => {
    setUserSearch('')
    setRoleFilter('all')
    setConnectionFilter('all')
    setUserPage(1)
  }

  const clearActorFilters = () => {
    setActorSearch('')
    setActorConnectionFilter('all')
    setActorPage(1)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (forbidden) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Ingen tilgang
          </CardTitle>
          <CardDescription>Du må være en verifisert administrator for å se denne siden.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">Kontakt en administrator for å få verifisert kontoen din.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/')}>Tilbake</Button>
            <Button onClick={() => router.push('/logg-inn')}>Logg inn</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasActiveFilters = userSearch || roleFilter !== 'all' || connectionFilter !== 'all'
  const hasActiveActorFilters = actorSearch || actorConnectionFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{users.length}</p>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Brukere</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Theater className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{actors.length}</p>
                <p className="text-sm text-purple-600/80 dark:text-purple-400/80">Skuespillere</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Link className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{users.filter(u => u.actor_id).length}</p>
                <p className="text-sm text-green-600/80 dark:text-green-400/80">Koblede</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{users.filter(u => u.role === 'admin' || u.role === 'superadmin').length}</p>
                <p className="text-sm text-amber-600/80 dark:text-amber-400/80">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Brukere ({filteredUsers.length})
          </TabsTrigger>
          <TabsTrigger value="actors" className="flex items-center gap-2">
            <Theater className="h-4 w-4" />
            Skuespillere ({filteredActors.length})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Brukere</CardTitle>
                  <CardDescription>
                    Viser {paginatedUsers.length} av {filteredUsers.length} brukere
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Oppdater
                </Button>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-3 pt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Søk på navn, e-post eller skuespiller..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Rolle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle roller</SelectItem>
                    <SelectItem value="customer">Kunder</SelectItem>
                    <SelectItem value="staff">Ansatte</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="superadmin">Superadmins</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={connectionFilter} onValueChange={(v) => setConnectionFilter(v as ConnectionFilter)}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Kobling" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="connected">Koblede</SelectItem>
                    <SelectItem value="not-connected">Ikke koblet</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={clearFilters} title="Nullstill filtre">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* User List */}
              <div className="divide-y">
                {paginatedUsers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {hasActiveFilters ? 'Ingen brukere matcher filtrene' : 'Ingen brukere funnet'}
                  </div>
                ) : (
                  paginatedUsers.map(user => (
                    <div 
                      key={user.id} 
                      className={cn(
                        "flex items-center justify-between p-4 hover:bg-muted/50 transition-colors",
                        user.actor_id && "bg-green-50/50 dark:bg-green-950/20"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={user.actor?.photo_url} />
                          <AvatarFallback className="text-sm">{user.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{user.full_name}</span>
                            {user.actor && (
                              <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 shrink-0">
                                <Theater className="h-3 w-3 mr-1" />
                                {user.actor.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {getRoleBadge(user.role)}
                        {user.role === 'admin' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleSendVerification(user.id)}
                              disabled={sendingVerificationFor === user.id}
                              title="Send verifikasjonskode"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async () => {
                                setShowRegistrationModalFor(user.id)
                                try {
                                  const res = await fetch('/api/admin/devices/create-registration', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ deviceName: `Device for ${user.email}` })
                                  })
                                  const data = await res.json()
                                  if (!res.ok) throw new Error(data.error)
                                  setRegistrationToken(data.token)
                                  setRegistrationExpires(data.expiresAt)
                                  const uri = await QRCode.toDataURL(data.token)
                                  setRegistrationQr(uri)
                                } catch (e: any) {
                                  toast.error(e.message || 'Kunne ikke generere QR')
                                  setShowRegistrationModalFor(null)
                                }
                              }}
                              title="Generer onboarding QR"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openUserDialog(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalUserPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Side {userPage} av {totalUserPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserPage(p => Math.max(1, p - 1))}
                      disabled={userPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                      disabled={userPage === totalUserPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actors Tab */}
        <TabsContent value="actors" className="mt-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Skuespillere</CardTitle>
                  <CardDescription>
                    Viser {paginatedActors.length} av {filteredActors.length} skuespillere
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={openNewActorDialog} size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Ny
                  </Button>
                  <Button onClick={() => setShowBulkActorDialog(true)} variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Opprett flere
                  </Button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-3 pt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Søk på navn eller e-post..."
                    value={actorSearch}
                    onChange={(e) => setActorSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={actorConnectionFilter} onValueChange={(v) => setActorConnectionFilter(v as ConnectionFilter)}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Kobling" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="connected">Koblede</SelectItem>
                    <SelectItem value="not-connected">Ikke koblet</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveActorFilters && (
                  <Button variant="ghost" size="icon" onClick={clearActorFilters} title="Nullstill filtre">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Actor List */}
              <div className="divide-y">
                {paginatedActors.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {hasActiveActorFilters ? 'Ingen skuespillere matcher filtrene' : 'Ingen skuespillere funnet'}
                  </div>
                ) : (
                  paginatedActors.map(actor => {
                    const linkedUser = users.find(u => u.actor_id === actor.id)
                    return (
                      <div 
                        key={actor.id} 
                        className={cn(
                          "flex items-center justify-between p-4 hover:bg-muted/50 transition-colors",
                          linkedUser && "bg-blue-50/50 dark:bg-blue-950/20"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={actor.photo_url} />
                            <AvatarFallback className="text-sm">{actor.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{actor.name}</span>
                              {linkedUser && (
                                <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 shrink-0">
                                  <Link className="h-3 w-3 mr-1" />
                                  {linkedUser.full_name}
                                </Badge>
                              )}
                            </div>
                            {actor.bio && (
                              <p className="text-sm text-muted-foreground truncate">{actor.bio}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openActorDialog(actor)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteActor(actor.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Pagination */}
              {totalActorPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Side {actorPage} av {totalActorPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActorPage(p => Math.max(1, p - 1))}
                      disabled={actorPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActorPage(p => Math.min(totalActorPages, p + 1))}
                      disabled={actorPage === totalActorPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Edit Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rediger bruker</DialogTitle>
            <DialogDescription>Endre rolle og koble til skuespillerprofil</DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{editingUser.full_name}</p>
                <p className="text-sm text-muted-foreground">{editingUser.email}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Rolle</Label>
                <Select value={userForm.role} onValueChange={(value: any) => setUserForm({ ...userForm, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Kunde</SelectItem>
                    <SelectItem value="staff">Ansatt</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Koble til skuespiller</Label>
                <Select value={userForm.actorId} onValueChange={(value) => setUserForm({ ...userForm, actorId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg skuespiller" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen kobling</SelectItem>
                    {actors.map(actor => (
                      <SelectItem key={actor.id} value={actor.id}>{actor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Profil-slug (valgfritt)</Label>
                <Input 
                  value={userForm.profileSlug}
                  onChange={(e) => setUserForm({ ...userForm, profileSlug: e.target.value })}
                  placeholder="f.eks. john-doe"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Avbryt</Button>
            <Button onClick={handleUpdateUser}>Lagre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Actor Edit Dialog */}
      <Dialog open={showActorDialog} onOpenChange={setShowActorDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingActor ? 'Rediger skuespiller' : 'Ny skuespiller'}</DialogTitle>
            <DialogDescription>{editingActor ? 'Oppdater informasjon' : 'Opprett ny skuespillerprofil'}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Navn *</Label>
                <Input 
                  value={actorForm.name}
                  onChange={(e) => setActorForm({ ...actorForm, name: e.target.value })}
                  placeholder="Skuespillernavn"
                />
              </div>
              <div className="space-y-2">
                <Label>Foto URL</Label>
                <Input 
                  value={actorForm.photo_url}
                  onChange={(e) => setActorForm({ ...actorForm, photo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Biografi</Label>
              <Textarea 
                value={actorForm.bio}
                onChange={(e) => setActorForm({ ...actorForm, bio: e.target.value })}
                placeholder="Kort biografi..."
                className="min-h-[80px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-post</Label>
                <Input 
                  type="email"
                  value={actorForm.contact_email}
                  onChange={(e) => setActorForm({ ...actorForm, contact_email: e.target.value })}
                  placeholder="skuespiller@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input 
                  value={actorForm.contact_phone}
                  onChange={(e) => setActorForm({ ...actorForm, contact_phone: e.target.value })}
                  placeholder="+47 123 45 678"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Koble til bruker</Label>
              <Input
                placeholder="Søk etter bruker..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
              <div className="h-40 border rounded-md overflow-y-auto">
                <div
                  className={cn(
                    "p-3 cursor-pointer hover:bg-muted transition-colors border-b flex items-center gap-2",
                    actorForm.user_id === "none" && "bg-primary/10"
                  )}
                  onClick={() => setActorForm({ ...actorForm, user_id: "none" })}
                >
                  <Unlink className="h-4 w-4" />
                  <span>Ingen kobling</span>
                  {actorForm.user_id === "none" && <Check className="h-4 w-4 ml-auto text-primary" />}
                </div>
                {availableUsersForActor.map(user => (
                  <div
                    key={user.id}
                    className={cn(
                      "p-3 cursor-pointer hover:bg-muted transition-colors border-b",
                      actorForm.user_id === user.id && "bg-primary/10"
                    )}
                    onClick={() => setActorForm({ ...actorForm, user_id: user.id })}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      {actorForm.user_id === user.id && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActorDialog(false)} disabled={submitting}>Avbryt</Button>
            <Button onClick={handleUpdateActor} disabled={submitting}>
              {submitting ? 'Lagrer...' : (editingActor ? 'Lagre' : 'Opprett')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actor Creation Dialog */}
      <Dialog open={showBulkActorDialog} onOpenChange={setShowBulkActorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Opprett flere skuespillere</DialogTitle>
            <DialogDescription>Skriv ett navn per linje. Duplikater hoppes over.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <textarea
              className="w-full min-h-[300px] p-3 border rounded-md font-mono text-sm bg-background"
              placeholder="Ola Nordmann&#10;Kari Hansen&#10;Per Olsen"
              value={bulkActorText}
              onChange={(e) => setBulkActorText(e.target.value)}
              disabled={submitting}
            />

            {(bulkActorResults.success.length > 0 || bulkActorResults.errors.length > 0) && (
              <div className="space-y-2 p-4 bg-muted rounded-md max-h-[200px] overflow-y-auto">
                {bulkActorResults.success.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Opprettet ({bulkActorResults.success.length}):</h4>
                    <ul className="text-sm text-green-600 dark:text-green-500 space-y-1">
                      {bulkActorResults.success.map((name, idx) => (
                        <li key={idx}>✓ {name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {bulkActorResults.errors.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">Feilet ({bulkActorResults.errors.length}):</h4>
                    <ul className="text-sm text-red-600 dark:text-red-500 space-y-1">
                      {bulkActorResults.errors.map((error, idx) => (
                        <li key={idx}>✗ {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBulkActorDialog(false)
                setBulkActorText('')
                setBulkActorResults({ success: [], errors: [] })
              }}
              disabled={submitting}
            >
              Lukk
            </Button>
            <Button onClick={handleBulkActorCreation} disabled={submitting || !bulkActorText.trim()}>
              {submitting ? 'Oppretter...' : 'Opprett alle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registration QR Modal */}
      <Dialog open={!!showRegistrationModalFor} onOpenChange={(open) => { if (!open) { setShowRegistrationModalFor(null); setRegistrationToken(null); setRegistrationQr(null); setRegistrationExpires(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onboarding QR</DialogTitle>
            <DialogDescription>Vis denne QR-koden til den nye administratoren.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {registrationQr ? (
              <>
                <img src={registrationQr} alt="Onboarding QR" className="w-64 h-64 object-contain rounded-lg border" />
                <p className="text-sm text-muted-foreground">
                  Gyldig til: {registrationExpires ? new Date(registrationExpires).toLocaleString('nb-NO') : '—'}
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Genererer QR…
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRegistrationModalFor(null); setRegistrationToken(null); setRegistrationQr(null); setRegistrationExpires(null) }}>Lukk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
