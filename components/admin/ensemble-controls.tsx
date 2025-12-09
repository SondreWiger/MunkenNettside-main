"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, Trash2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Enrollment {
  id: string
  user_id: string
  ensemble_id: string
  status: "pending" | "approved" | "rejected"
  enrolled_at: string
  users: {
    full_name: string
    email: string
    slug: string
  }
}

interface TeamMember {
  id: string
  user_id: string
  ensemble_id: string
  team: "yellow" | "blue"
  role: string
  position_order: number
  users: {
    full_name: string
    slug: string
  }
}

interface EnsembleControlsProps {
  ensembleId: string
  ensembleTitle: string
  yellowTeamName: string
  blueTeamName: string
}

export function EnsembleControls({
  ensembleId,
  ensembleTitle,
  yellowTeamName,
  blueTeamName,
}: EnsembleControlsProps) {
  const [pendingEnrollments, setPendingEnrollments] = useState<Enrollment[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<{ [key: string]: string }>({})
  const [selectedTeam, setSelectedTeam] = useState<{ [key: string]: "yellow" | "blue" }>({})
  const [editingRole, setEditingRole] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    fetchEnrollments()
  }, [])

  async function fetchEnrollments() {
    try {
      const response = await fetch(`/api/ensemble/${ensembleId}/members`)
      if (!response.ok) throw new Error("Failed to fetch")

      const data = await response.json()
      setPendingEnrollments(data.pendingEnrollments || [])
      setTeamMembers(data.teamMembers || [])
    } catch (error) {
      console.error("Error fetching enrollments:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleQuickApprove(enrollment: Enrollment) {
    // Auto-assign defaults for quick approval
    const role = selectedRole[enrollment.id] || "Medlem"
    const team = selectedTeam[enrollment.id] || "yellow"

    try {
      const response = await fetch(`/api/ensemble/${ensembleId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quickApprove",
          enrollmentId: enrollment.id,
          userId: enrollment.user_id,
          team,
          role,
          userFullName: enrollment.users.full_name,
          ensembleId,
        }),
      })

      if (!response.ok) throw new Error("Failed to quick approve")

      const result = await response.json()

      // Remove from pending and add to team
      setPendingEnrollments(pendingEnrollments.filter((e) => e.id !== enrollment.id))
      setTeamMembers([
        ...teamMembers,
        {
          id: result.teamMemberId || `temp-${enrollment.id}`,
          user_id: enrollment.user_id,
          ensemble_id: ensembleId,
          team,
          role,
          position_order: 0,
          users: enrollment.users,
        },
      ])

      // Clear selections
      const newRole = { ...selectedRole }
      const newTeam = { ...selectedTeam }
      delete newRole[enrollment.id]
      delete newTeam[enrollment.id]
      setSelectedRole(newRole)
      setSelectedTeam(newTeam)
    } catch (error) {
      console.error("Error in quick approval:", error)
      alert("Feil ved rask godkjenning")
    }
  }

  async function handleBulkApprove() {
    if (!confirm(`Vil du godkjenne alle ${pendingEnrollments.length} påmeldinger med standardinnstillinger?`)) return

    try {
      const promises = pendingEnrollments.map((enrollment) => 
        fetch(`/api/ensemble/${ensembleId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "quickApprove",
            enrollmentId: enrollment.id,
            userId: enrollment.user_id,
            team: selectedTeam[enrollment.id] || "yellow",
            role: selectedRole[enrollment.id] || "Medlem",
            userFullName: enrollment.users.full_name,
            ensembleId,
          }),
        })
      )

      await Promise.all(promises)

      // Move all to team members
      const newTeamMembers = pendingEnrollments.map((enrollment) => ({
        id: `temp-${enrollment.id}`,
        user_id: enrollment.user_id,
        ensemble_id: ensembleId,
        team: (selectedTeam[enrollment.id] || "yellow") as "yellow" | "blue",
        role: selectedRole[enrollment.id] || "Medlem",
        position_order: 0,
        users: enrollment.users,
      }))

      setTeamMembers([...teamMembers, ...newTeamMembers])
      setPendingEnrollments([])
      setSelectedRole({})
      setSelectedTeam({})
    } catch (error) {
      console.error("Error in bulk approval:", error)
      alert("Feil ved massegodkjenning")
    }
  }

  async function handleApprove(enrollment: Enrollment) {
    const role = selectedRole[enrollment.id] || "Medlem"
    const team = selectedTeam[enrollment.id] || "yellow"

    try {
      const response = await fetch(`/api/ensemble/${ensembleId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          enrollmentId: enrollment.id,
          userId: enrollment.user_id,
          team,
          role,
        }),
      })

      if (!response.ok) throw new Error("Failed to approve")

      // Remove from pending and add to team
      setPendingEnrollments(pendingEnrollments.filter((e) => e.id !== enrollment.id))
      setTeamMembers([
        ...teamMembers,
        {
          id: `temp-${enrollment.id}`,
          user_id: enrollment.user_id,
          ensemble_id: ensembleId,
          team,
          role,
          position_order: 0,
          users: enrollment.users,
        },
      ])

      // Clear selections
      const newRole = { ...selectedRole }
      const newTeam = { ...selectedTeam }
      delete newRole[enrollment.id]
      delete newTeam[enrollment.id]
      setSelectedRole(newRole)
      setSelectedTeam(newTeam)
    } catch (error) {
      console.error("Error approving enrollment:", error)
      alert("Failed to approve enrollment")
    }
  }

  async function handleReject(enrollmentId: string) {
    try {
      const response = await fetch(`/api/ensemble/${ensembleId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          enrollmentId,
        }),
      })

      if (!response.ok) throw new Error("Failed to reject")

      setPendingEnrollments(pendingEnrollments.filter((e) => e.id !== enrollmentId))
    } catch (error) {
      console.error("Error rejecting enrollment:", error)
      alert("Failed to reject enrollment")
    }
  }

  async function handleRemoveTeamMember(teamMemberId: string) {
    if (!confirm("Vil du fjerne denne personen fra laget?")) return

    try {
      const response = await fetch(`/api/ensemble/${ensembleId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "removeTeamMember",
          teamMemberId,
        }),
      })

      if (!response.ok) throw new Error("Failed to remove")

      setTeamMembers(teamMembers.filter((m) => m.id !== teamMemberId))
    } catch (error) {
      console.error("Error removing team member:", error)
      alert("Failed to remove team member")
    }
  }

  async function handleUpdateMemberRole(teamMemberId: string, newRole: string) {
    if (!newRole.trim()) return

    try {
      const response = await fetch(`/api/ensemble/${ensembleId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateTeamMember",
          teamMemberId,
          newRole,
        }),
      })

      if (!response.ok) throw new Error("Failed to update role")

      // Update local state
      setTeamMembers(teamMembers.map((m) => 
        m.id === teamMemberId ? { ...m, role: newRole } : m
      ))

      // Clear editing state
      const newEditingRole = { ...editingRole }
      delete newEditingRole[teamMemberId]
      setEditingRole(newEditingRole)

    } catch (error) {
      console.error("Error updating member role:", error)
      alert("Feil ved oppdatering av rolle")
    }
  }

  const yellowMembers = teamMembers.filter((m) => m.team === "yellow")
  const blueMembers = teamMembers.filter((m) => m.team === "blue")

  if (loading) {
    return <div className="p-4">Laster inn...</div>
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Påmeldinger ({pendingEnrollments.length})
          </TabsTrigger>
          <TabsTrigger value="yellow">{yellowTeamName}</TabsTrigger>
          <TabsTrigger value="blue">{blueTeamName}</TabsTrigger>
        </TabsList>

        {/* Pending Enrollments */}
        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingEnrollments.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Ingen ventende påmeldinger
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Bulk Actions */}
              <div className="flex gap-2 p-4 bg-muted/50 rounded-lg">
                <Button
                  onClick={handleBulkApprove}
                  disabled={pendingEnrollments.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Godkjenn alle ({pendingEnrollments.length})
                </Button>
                <div className="text-sm text-muted-foreground flex items-center ml-2">
                  Bruker standardinnstillinger for alle
                </div>
              </div>

              {pendingEnrollments.map((enrollment) => (
                <Card key={enrollment.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {enrollment.users.full_name}
                        </CardTitle>
                        <CardDescription>{enrollment.users.email}</CardDescription>
                        <Link
                          href={`/profile/${enrollment.users.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Se profil →
                        </Link>
                      </div>
                      <Badge variant="secondary">Venter</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3 mb-4">
                      <div>
                        <Label htmlFor={`role-${enrollment.id}`}>Rolle/Karakter</Label>
                        <Input
                          id={`role-${enrollment.id}`}
                          placeholder="Skriv rolle eller karakter"
                          value={selectedRole[enrollment.id] || ""}
                          onChange={(e) =>
                            setSelectedRole({
                              ...selectedRole,
                              [enrollment.id]: e.target.value,
                            })
                          }
                        />
                        <Select
                          value={selectedRole[enrollment.id] || "Medlem"}
                          onValueChange={(value) =>
                            setSelectedRole({
                              ...selectedRole,
                              [enrollment.id]: value,
                            })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Eller velg standard" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Hovedrolle">Hovedrolle</SelectItem>
                            <SelectItem value="Biroll">Biroll</SelectItem>
                            <SelectItem value="Ensemble">Ensemble</SelectItem>
                            <SelectItem value="Crew">Crew</SelectItem>
                            <SelectItem value="Medlem">Medlem</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor={`team-${enrollment.id}`}>Lag</Label>
                        <Select
                          value={selectedTeam[enrollment.id] || "yellow"}
                          onValueChange={(value: any) =>
                            setSelectedTeam({
                              ...selectedTeam,
                              [enrollment.id]: value,
                            })
                          }
                        >
                          <SelectTrigger id={`team-${enrollment.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yellow">{yellowTeamName}</SelectItem>
                            <SelectItem value="blue">{blueTeamName}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleQuickApprove(enrollment)}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Rask godkjenning
                        </Button>
                        <Button
                          onClick={() => handleApprove(enrollment)}
                          variant="outline"
                          size="sm"
                        >
                          Tilpasset
                        </Button>
                        <Button
                          onClick={() => handleReject(enrollment.id)}
                          variant="destructive"
                          size="sm"
                        >
                          Avvis
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Påmeldt:{" "}
                      {new Date(enrollment.enrolled_at).toLocaleDateString("no-NO")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Yellow Team */}
        <TabsContent value="yellow" className="space-y-4 mt-4">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              {yellowMembers.length} medlem{yellowMembers.length !== 1 ? "er" : ""}
            </div>
          </div>
          {yellowMembers.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Ingen medlemmer i {yellowTeamName} ennå
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {yellowMembers.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold">{member.users.full_name}</p>
                          <Link
                            href={`/profile/${member.users.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Se profil →
                          </Link>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingRole[member.id] ?? member.role}
                            onChange={(e) =>
                              setEditingRole({
                                ...editingRole,
                                [member.id]: e.target.value,
                              })
                            }
                            placeholder="Rolle/karakter"
                            className="text-sm max-w-xs"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdateMemberRole(member.id, editingRole[member.id] ?? member.role)
                              }
                            }}
                          />
                          {editingRole[member.id] !== undefined && editingRole[member.id] !== member.role && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateMemberRole(member.id, editingRole[member.id])}
                            >
                              Oppdater
                            </Button>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRemoveTeamMember(member.id)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Blue Team */}
        <TabsContent value="blue" className="space-y-4 mt-4">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              {blueMembers.length} medlem{blueMembers.length !== 1 ? "er" : ""}
            </div>
          </div>
          {blueMembers.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Ingen medlemmer i {blueTeamName} ennå
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {blueMembers.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold">{member.users.full_name}</p>
                          <Link
                            href={`/profile/${member.users.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Se profil →
                          </Link>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingRole[member.id] ?? member.role}
                            onChange={(e) =>
                              setEditingRole({
                                ...editingRole,
                                [member.id]: e.target.value,
                              })
                            }
                            placeholder="Rolle/karakter"
                            className="text-sm max-w-xs"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdateMemberRole(member.id, editingRole[member.id] ?? member.role)
                              }
                            }}
                          />
                          {editingRole[member.id] !== undefined && editingRole[member.id] !== member.role && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateMemberRole(member.id, editingRole[member.id])}
                            >
                              Oppdater
                            </Button>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRemoveTeamMember(member.id)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
