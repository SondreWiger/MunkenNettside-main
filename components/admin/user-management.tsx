"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
  Mail
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface User {
  id: string
  full_name: string
  email: string
  phone?: string
  role: 'customer' | 'staff' | 'admin'
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

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [actors, setActors] = useState<Actor[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingActor, setEditingActor] = useState<Actor | null>(null)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [showActorDialog, setShowActorDialog] = useState(false)
  const [showBulkActorDialog, setShowBulkActorDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [userForm, setUserForm] = useState({
    role: 'customer' as 'customer' | 'staff' | 'admin',
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
  const [showUserSearch, setShowUserSearch] = useState(false)

  // Filter users for search
  const filteredUsers = users.filter(user => {
    const query = userSearchQuery.toLowerCase().trim()
    const matchesSearch = !query || 
      user.full_name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    
    // Only show users that don't have an actor_id, OR have this actor's id
    const isAvailable = !user.actor_id || user.actor_id === editingActor?.id
    
    return matchesSearch && isAvailable
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    try {
      // Load users
      const usersResponse = await fetch('/api/admin/users')
      const usersData = await usersResponse.json()
      setUsers(usersData.users || [])

      // Load all actors
      const actorsResponse = await fetch('/api/actors')
      const actorsData = await actorsResponse.json()
      setActors(actorsData.actors || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error("Kunne ikke laste data")
    }
    
    setLoading(false)
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
      // Create new actor
      await handleCreateActor()
      return
    }

    // Validate required fields for updates too
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
    // Validate required fields
    if (!actorForm.name.trim()) {
      toast.error("Navn er påkrevd")
      return
    }

    // Check for duplicate name
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
      // Check for duplicate
      if (actors.some(actor => actor.name.toLowerCase() === name.toLowerCase())) {
        results.errors.push(`${name} - eksisterer allerede`)
        continue
      }

      try {
        const response = await fetch('/api/actors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            user_id: null
          })
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
      const response = await fetch(`/api/actors/${actorId}`, {
        method: 'DELETE'
      })

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
    // Ensure role is one of the valid values, default to customer if not
    const validRole = ['customer', 'staff', 'admin'].includes(user.role) ? user.role : 'customer'
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Crown
      case 'staff': return Shield
      default: return User
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'staff': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const [sendingVerificationFor, setSendingVerificationFor] = useState<string | null>(null)

  const handleSendVerification = async (userId: string) => {
    if (!confirm('Send verifikasjonskode til denne administratoren?')) return
    setSendingVerificationFor(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/send-verification`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Verifikasjonskode sendt')
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Laster...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Koblingsoversikt
          </CardTitle>
          <CardDescription>
            Oversikt over brukere og skuespillere som er koblet sammen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{users.length}</div>
              <div className="text-sm text-blue-800">Totalt brukere</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{actors.length}</div>
              <div className="text-sm text-purple-800">Totalt skuespillere</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{users.filter(u => u.actor_id).length}</div>
              <div className="text-sm text-green-800">Koblede brukere</div>
            </div>
          </div>
          
          {users.filter(u => u.actor_id).length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Aktive koblinger:</h4>
              <div className="space-y-2">
                {users.filter(u => u.actor_id).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <span><strong>{user.full_name}</strong> ({user.email})</span>
                    <span className="flex items-center gap-1 text-purple-600">
                      <Theater className="h-3 w-3" />
                      {user.actor?.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Brukeradministrasjon
          </CardTitle>
          <CardDescription>
            Administrer brukerroller og koble brukere til skuespillerprofiler
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map(user => {
              const RoleIcon = getRoleIcon(user.role)
              
              return (
                <div key={user.id} className={`flex items-center justify-between p-4 border rounded-lg ${user.actor_id ? 'bg-green-50 border-green-200' : ''}`}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.actor?.photo_url} />
                      <AvatarFallback>{user.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2" title={user.actor_id ? "Koblet til skuespiller" : "Ikke koblet til skuespiller"}>
                          <span className="font-medium">{user.full_name}</span>
                          {user.actor && (
                            <Theater className="h-4 w-4 text-purple-600" />
                          )}
                          {user.profile_slug && (
                            <Badge variant="outline" className="text-xs">
                              Profil: {user.profile_slug}
                            </Badge>
                          )}
                        </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.actor && (
                        <p className="text-sm text-purple-600 font-medium">→ Skuespiller: {user.actor.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("flex items-center gap-1", getRoleColor(user.role))}>
                      <RoleIcon className="h-3 w-3" />
                      {user.role === 'admin' ? 'Administrator' : user.role === 'staff' ? 'Ansatt' : 'Kunde'}
                    </Badge>
                    {user.role === 'admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendVerification(user.id)}
                        disabled={sendingVerificationFor === user.id}
                        title="Send verifikasjonskode til denne administratoren"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openUserDialog(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actors Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Theater className="h-5 w-5" />
            Skuespillere
          </CardTitle>
          <CardDescription>
            Administrer skuespillerprofiler og koble dem til brukere
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Button onClick={openNewActorDialog} className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Ny skuespiller
            </Button>
            <Button onClick={() => setShowBulkActorDialog(true)} variant="outline" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Opprett flere
            </Button>
          </div>
          
          <div className="space-y-4">
            {actors.map(actor => {
              const linkedUser = users.find(u => u.actor_id === actor.id)
              
              return (
                <div key={actor.id} className={`flex items-center justify-between p-4 border rounded-lg ${linkedUser ? 'bg-blue-50 border-blue-200' : ''}`}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={actor.photo_url} />
                      <AvatarFallback>{actor.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2" title={linkedUser ? "Koblet til bruker" : "Ikke koblet til bruker"}>
                        <span className="font-medium">{actor.name}</span>
                        {linkedUser && (
                          <Link className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      {actor.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{actor.bio}</p>
                      )}
                      {linkedUser && (
                        <p className="text-sm text-green-600 font-medium">→ Bruker: {linkedUser.full_name} ({linkedUser.email})</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openActorDialog(actor)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteActor(actor.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* User Edit Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rediger bruker</DialogTitle>
            <DialogDescription>
              Endre rolle og koble til skuespillerprofil
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="user-name">Navn</Label>
                <Input id="user-name" value={editingUser.full_name} disabled />
              </div>
              
              <div>
                <Label htmlFor="user-email">E-post</Label>
                <Input id="user-email" value={editingUser.email} disabled />
              </div>
              
              <div>
                <Label htmlFor="user-role">Rolle</Label>
                <Select value={userForm.role} onValueChange={(value: any) => setUserForm({ ...userForm, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg rolle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Kunde</SelectItem>
                    <SelectItem value="staff">Ansatt</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="actor-link">Koble til skuespiller</Label>
                <Select value={userForm.actorId} onValueChange={(value) => setUserForm({ ...userForm, actorId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg skuespiller" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen kobling</SelectItem>
                    {actors.map(actor => (
                      <SelectItem key={actor.id} value={actor.id}>
                        {actor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="profile-slug">Profil-slug (valgfritt)</Label>
                <Input 
                  id="profile-slug" 
                  value={userForm.profileSlug}
                  onChange={(e) => setUserForm({ ...userForm, profileSlug: e.target.value })}
                  placeholder="f.eks. john-doe"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={handleUpdateUser}>
              Lagre endringer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Actor Edit Dialog */}
      <Dialog open={showActorDialog} onOpenChange={setShowActorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingActor ? 'Rediger skuespiller' : 'Ny skuespiller'}</DialogTitle>
            <DialogDescription>
              {editingActor ? 'Oppdater skuespillerinformasjon' : 'Opprett ny skuespillerprofil'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="actor-name">Navn</Label>
              <Input 
                id="actor-name" 
                value={actorForm.name}
                onChange={(e) => setActorForm({ ...actorForm, name: e.target.value })}
                placeholder="Skuespillernavn"
              />
            </div>
            
            <div>
              <Label htmlFor="actor-bio">Biografi</Label>
              <Textarea 
                id="actor-bio" 
                value={actorForm.bio}
                onChange={(e) => setActorForm({ ...actorForm, bio: e.target.value })}
                placeholder="Kort biografi..."
                className="min-h-[80px]"
              />
            </div>
            
            <div>
              <Label htmlFor="actor-photo">Foto URL</Label>
              <Input 
                id="actor-photo" 
                value={actorForm.photo_url}
                onChange={(e) => setActorForm({ ...actorForm, photo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            
            <div>
              <Label htmlFor="actor-email">Kontakt e-post</Label>
              <Input 
                id="actor-email" 
                type="email"
                value={actorForm.contact_email}
                onChange={(e) => setActorForm({ ...actorForm, contact_email: e.target.value })}
                placeholder="skuespiller@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="actor-phone">Kontakt telefon</Label>
              <Input 
                id="actor-phone" 
                value={actorForm.contact_phone}
                onChange={(e) => setActorForm({ ...actorForm, contact_phone: e.target.value })}
                placeholder="+47 123 45 678"
              />
            </div>
            
            <div>
              <Label htmlFor="user-link">Koble til bruker</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Søk etter bruker (navn eller e-post)..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                />
                <div className="max-h-60 overflow-y-auto border rounded-md bg-white">
                  <div
                    className={cn(
                      "p-3 cursor-pointer hover:bg-gray-100 transition-colors border-b",
                      actorForm.user_id === "none" && "bg-blue-100 font-semibold"
                    )}
                    onClick={() => setActorForm({ ...actorForm, user_id: "none" })}
                  >
                    <div className="flex items-center gap-2">
                      <Unlink className="h-4 w-4" />
                      Ingen kobling
                    </div>
                  </div>
                  {filteredUsers.length === 0 && userSearchQuery.trim() ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Ingen brukere funnet
                    </div>
                  ) : (
                    filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className={cn(
                          "p-3 cursor-pointer hover:bg-gray-100 transition-colors border-b last:border-b-0",
                          actorForm.user_id === user.id && "bg-blue-100"
                        )}
                        onClick={() => setActorForm({ ...actorForm, user_id: user.id })}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{user.full_name}</div>
                            <div className="text-sm text-gray-600">{user.email}</div>
                          </div>
                          {actorForm.user_id === user.id && (
                            <Link className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {userSearchQuery.trim() === '' && (
                  <p className="text-sm text-muted-foreground">
                    Viser {filteredUsers.length} tilgjengelige bruker{filteredUsers.length !== 1 ? 'e' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowActorDialog(false)}
              disabled={submitting}
            >
              Avbryt
            </Button>
            <Button 
              onClick={handleUpdateActor}
              disabled={submitting}
            >
              {submitting ? 'Lagrer...' : (editingActor ? 'Lagre endringer' : 'Opprett skuespiller')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actor Creation Dialog */}
      <Dialog open={showBulkActorDialog} onOpenChange={setShowBulkActorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Opprett flere skuespillere</DialogTitle>
            <DialogDescription>
              Skriv ett navn per linje. Duplikater hoppes over.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <textarea
                className="w-full min-h-[300px] p-3 border rounded-md font-mono text-sm"
                placeholder="Ola Nordmann&#10;Kari Hansen&#10;Per Olsen"
                value={bulkActorText}
                onChange={(e) => setBulkActorText(e.target.value)}
                disabled={submitting}
              />
            </div>

            {bulkActorResults && (bulkActorResults.success.length > 0 || bulkActorResults.errors.length > 0) && (
              <div className="space-y-2 p-4 bg-gray-50 rounded-md max-h-[200px] overflow-y-auto">
                {bulkActorResults.success.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-700 mb-2">Opprettet ({bulkActorResults.success.length}):</h4>
                    <ul className="text-sm text-green-600 space-y-1">
                      {bulkActorResults.success.map((name, idx) => (
                        <li key={idx}>✓ {name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {bulkActorResults.errors.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-semibold text-red-700 mb-2">Feilet ({bulkActorResults.errors.length}):</h4>
                    <ul className="text-sm text-red-600 space-y-1">
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
            <Button 
              onClick={handleBulkActorCreation}
              disabled={submitting || !bulkActorText.trim()}
            >
              {submitting ? 'Oppretter...' : 'Opprett alle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}