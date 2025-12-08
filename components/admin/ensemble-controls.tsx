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
            pendingEnrollments.map((enrollment) => (
              <Card key={enrollment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {enrollment.users.full_name}
                      </CardTitle>
                      <CardDescription>{enrollment.users.email}</CardDescription>
                    </div>
                    <Badge variant="secondary">Venter</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3 mb-4">
                    <div>
                      <Label htmlFor={`role-${enrollment.id}`}>Rolle</Label>
                      <Input
                        id={`role-${enrollment.id}`}
                        placeholder="f.eks. Skuespiller"
                        value={selectedRole[enrollment.id] || ""}
                        onChange={(e) =>
                          setSelectedRole({
                            ...selectedRole,
                            [enrollment.id]: e.target.value,
                          })
                        }
                      />
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
                    <div className="flex items-end gap-2">
                      <Button
                        onClick={() => handleApprove(enrollment)}
                        className="flex-1"
                        size="sm"
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Godta
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
            ))
          )}
        </TabsContent>

        {/* Yellow Team */}
        <TabsContent value="yellow" className="space-y-4 mt-4">
          <div className="text-sm text-muted-foreground mb-4">
            {yellowMembers.length} medlem{yellowMembers.length !== 1 ? "er" : ""}
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
                <Card key={member.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{member.users.full_name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
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
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Blue Team */}
        <TabsContent value="blue" className="space-y-4 mt-4">
          <div className="text-sm text-muted-foreground mb-4">
            {blueMembers.length} medlem{blueMembers.length !== 1 ? "er" : ""}
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
                <Card key={member.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{member.users.full_name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
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
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
