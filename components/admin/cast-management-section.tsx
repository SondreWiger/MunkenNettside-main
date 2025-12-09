"use client"

import { useState } from "react"
import { Ensemble, CastMember } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, User, Crown } from "lucide-react"

interface CastManagementSectionProps {
  ensemble: Ensemble
  setEnsemble: (ensemble: Ensemble) => void
}

// Pre-defined roles for easy assignment
const PREDEFINED_ROLES = [
  "Skuespiller",
  "Regissør",
  "Produsent",
  "Manusforfatter",
  "Scenograf",
  "Kostyme",
  "Lyd",
  "Lys",
  "Koryfé",
  "Koreograf",
  "Musikalsk ansvarlig"
]

export function CastManagementSection({ ensemble, setEnsemble }: CastManagementSectionProps) {
  const [activeRole, setActiveRole] = useState<string>("Skuespiller")
  const [newMemberForm, setNewMemberForm] = useState({
    name: "",
    character: "",
    profile_slug: "",
    photo_url: "",
    featured: false
  })

  // Get all cast members as a flat array
  const getAllCastMembers = (): (CastMember & { team: 'yellow' | 'blue'; index: number })[] => {
    const yellow = (ensemble.yellow_cast || []).map((member, index) => ({ 
      ...member, 
      team: 'yellow' as const, 
      index 
    }))
    const blue = (ensemble.blue_cast || []).map((member, index) => ({ 
      ...member, 
      team: 'blue' as const, 
      index 
    }))
    return [...yellow, ...blue]
  }

  // Get members by role
  const getMembersByRole = (role: string) => {
    return getAllCastMembers().filter(member => member.role === role)
  }

  // Get all unique roles
  const getAllRoles = (): string[] => {
    const allMembers = getAllCastMembers()
    const roles = new Set(allMembers.map(member => member.role).filter(Boolean))
    return Array.from(roles).sort()
  }

  // Get featured members
  const getFeaturedMembers = () => {
    return getAllCastMembers().filter(member => member.featured)
  }

  // Add a new member
  const addMember = () => {
    if (!newMemberForm.name.trim()) return

    const newMember: CastMember = {
      name: newMemberForm.name,
      role: activeRole,
      character: newMemberForm.character || undefined,
      photo_url: newMemberForm.photo_url || undefined,
      profile_slug: newMemberForm.profile_slug || undefined,
      featured: newMemberForm.featured
    }

    // Add to yellow cast by default
    setEnsemble({
      ...ensemble,
      yellow_cast: [...(ensemble.yellow_cast || []), newMember]
    })

    // Reset form
    setNewMemberForm({
      name: "",
      character: "",
      profile_slug: "",
      photo_url: "",
      featured: false
    })
  }

  // Update a member
  const updateMember = (team: 'yellow' | 'blue', index: number, updates: Partial<CastMember>) => {
    const castArray = team === 'yellow' ? ensemble.yellow_cast : ensemble.blue_cast
    const newCast = [...(castArray || [])]
    newCast[index] = { ...newCast[index], ...updates }
    
    setEnsemble({
      ...ensemble,
      [team === 'yellow' ? 'yellow_cast' : 'blue_cast']: newCast
    })
  }

  // Remove a member
  const removeMember = (team: 'yellow' | 'blue', index: number) => {
    const castArray = team === 'yellow' ? ensemble.yellow_cast : ensemble.blue_cast
    const newCast = (castArray || []).filter((_, i) => i !== index)
    
    setEnsemble({
      ...ensemble,
      [team === 'yellow' ? 'yellow_cast' : 'blue_cast']: newCast
    })
  }

  // Move member between teams
  const moveMember = (fromTeam: 'yellow' | 'blue', index: number, toTeam: 'yellow' | 'blue') => {
    if (fromTeam === toTeam) return

    const fromCast = fromTeam === 'yellow' ? ensemble.yellow_cast : ensemble.blue_cast
    const toCast = toTeam === 'yellow' ? ensemble.yellow_cast : ensemble.blue_cast
    
    if (!fromCast || !fromCast[index]) return

    const member = fromCast[index]
    const newFromCast = fromCast.filter((_, i) => i !== index)
    const newToCast = [...(toCast || []), member]

    setEnsemble({
      ...ensemble,
      [fromTeam === 'yellow' ? 'yellow_cast' : 'blue_cast']: newFromCast,
      [toTeam === 'yellow' ? 'yellow_cast' : 'blue_cast']: newToCast
    })
  }

  const roles = getAllRoles()
  const featuredMembers = getFeaturedMembers()

  return (
    <div className="space-y-6">
      {/* Featured Members Overview */}
      {featuredMembers.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-600" />
              Fremhevede skuespillere ({featuredMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {featuredMembers.map((member) => (
                <div key={`${member.team}-${member.index}`} className="p-3 bg-white rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-gray-600">{member.role}</div>
                      {member.character && (
                        <div className="text-xs text-gray-500">som {member.character}</div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {member.team === 'yellow' ? 'Gult' : 'Blått'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Member */}
      <Card>
        <CardHeader>
          <CardTitle>Legg til nytt medlem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rolle</Label>
              <Select value={activeRole} onValueChange={setActiveRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Navn</Label>
              <Input
                placeholder="Fullt navn"
                value={newMemberForm.name}
                onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Karakter/rolle i forestilling</Label>
              <Input
                placeholder="Hvis aktuelt"
                value={newMemberForm.character}
                onChange={(e) => setNewMemberForm({ ...newMemberForm, character: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Profillenke (slug)</Label>
              <Input
                placeholder="john-smith"
                value={newMemberForm.profile_slug}
                onChange={(e) => setNewMemberForm({ ...newMemberForm, profile_slug: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Profilbilde URL</Label>
            <Input
              placeholder="https://example.com/image.jpg"
              value={newMemberForm.photo_url}
              onChange={(e) => setNewMemberForm({ ...newMemberForm, photo_url: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured"
              checked={newMemberForm.featured}
              onCheckedChange={(checked) => 
                setNewMemberForm({ ...newMemberForm, featured: !!checked })
              }
            />
            <Label htmlFor="featured">Fremhev på hovedside</Label>
          </div>

          <Button onClick={addMember} disabled={!newMemberForm.name.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Legg til medlem
          </Button>
        </CardContent>
      </Card>

      {/* Role-based Management */}
      <Card>
        <CardHeader>
          <CardTitle>Administrer etter rolle</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeRole} onValueChange={setActiveRole}>
            <TabsList className="grid w-full grid-cols-4 md:grid-cols-6">
              {PREDEFINED_ROLES.slice(0, 6).map((role) => {
                const count = getMembersByRole(role).length
                return (
                  <TabsTrigger key={role} value={role} className="text-xs">
                    {role} {count > 0 && `(${count})`}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {PREDEFINED_ROLES.map((role) => (
              <TabsContent key={role} value={role} className="mt-4">
                <div className="space-y-4">
                  {getMembersByRole(role).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Ingen medlemmer med rolle "{role}"</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {getMembersByRole(role).map((member) => (
                        <Card key={`${member.team}-${member.index}`} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs">Navn</Label>
                              <Input
                                value={member.name}
                                onChange={(e) => updateMember(member.team, member.index, { name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Karakter</Label>
                              <Input
                                placeholder="Hvis aktuelt"
                                value={member.character || ""}
                                onChange={(e) => updateMember(member.team, member.index, { character: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Profillenke</Label>
                              <Input
                                placeholder="slug"
                                value={member.profile_slug || ""}
                                onChange={(e) => updateMember(member.team, member.index, { profile_slug: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="mt-4 space-y-2">
                            <Label className="text-xs">Profilbilde URL</Label>
                            <Input
                              placeholder="https://example.com/image.jpg"
                              value={member.photo_url || ""}
                              onChange={(e) => updateMember(member.team, member.index, { photo_url: e.target.value })}
                            />
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`featured-${member.team}-${member.index}`}
                                  checked={member.featured || false}
                                  onCheckedChange={(checked) => 
                                    updateMember(member.team, member.index, { featured: !!checked })
                                  }
                                />
                                <Label htmlFor={`featured-${member.team}-${member.index}`} className="text-sm">
                                  Fremhev
                                </Label>
                              </div>

                              <div className="flex items-center gap-2">
                                <Label className="text-xs">Lag:</Label>
                                <Select
                                  value={member.team}
                                  onValueChange={(team: 'yellow' | 'blue') => 
                                    moveMember(member.team, member.index, team)
                                  }
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="yellow">Gult</SelectItem>
                                    <SelectItem value="blue">Blått</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeMember(member.team, member.index)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Fjern
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-700">Gult lag ({(ensemble.yellow_cast || []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {(ensemble.yellow_cast || []).length === 0 ? (
              <p className="text-gray-500 text-sm">Ingen medlemmer</p>
            ) : (
              <div className="space-y-2">
                {ensemble.yellow_cast.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                    <div>
                      <div className="font-medium text-sm">{member.name}</div>
                      <div className="text-xs text-gray-600">{member.role}</div>
                    </div>
                    {member.featured && <Crown className="h-4 w-4 text-amber-500" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-blue-700">Blått lag ({(ensemble.blue_cast || []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {(ensemble.blue_cast || []).length === 0 ? (
              <p className="text-gray-500 text-sm">Ingen medlemmer</p>
            ) : (
              <div className="space-y-2">
                {ensemble.blue_cast.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <div>
                      <div className="font-medium text-sm">{member.name}</div>
                      <div className="text-xs text-gray-600">{member.role}</div>
                    </div>
                    {member.featured && <Crown className="h-4 w-4 text-amber-500" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}