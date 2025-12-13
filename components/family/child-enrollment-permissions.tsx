"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, UserCheck, UserX, UserCog } from "lucide-react"
import { toast } from "sonner"

interface Child {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  enrollment_permission: string
}

export function ChildEnrollmentPermissions() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()

  useEffect(() => {
    fetchChildren()
  }, [])

  const fetchChildren = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("family_connections")
        .select(`
          child_id,
          enrollment_permission,
          child:users!family_connections_child_id_fkey(
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq("parent_id", user.id)
        .eq("status", "active")

      if (error) throw error

      const childrenData = data.map((conn: any) => ({
        id: conn.child.id,
        full_name: conn.child.full_name,
        email: conn.child.email,
        avatar_url: conn.child.avatar_url,
        enrollment_permission: conn.enrollment_permission || "request",
      }))

      setChildren(childrenData)
    } catch (error) {
      console.error("Error fetching children:", error)
      toast.error("Kunne ikke hente barn")
    } finally {
      setLoading(false)
    }
  }

  const updatePermission = async (childId: string, permission: string) => {
    setUpdating(childId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("family_connections")
        .update({ enrollment_permission: permission })
        .eq("parent_id", user.id)
        .eq("child_id", childId)

      if (error) throw error

      setChildren(prev =>
        prev.map(child =>
          child.id === childId
            ? { ...child, enrollment_permission: permission }
            : child
        )
      )

      const permissionLabel = 
        permission === "blocked" ? "blokkert" :
        permission === "request" ? "forespørsel påkrevd" :
        "tillatt"

      toast.success(`Påmeldingstillatelse oppdatert til: ${permissionLabel}`)
    } catch (error) {
      console.error("Error updating permission:", error)
      toast.error("Kunne ikke oppdatere tillatelse")
    } finally {
      setUpdating(null)
    }
  }

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case "blocked":
        return <UserX className="h-4 w-4 text-red-500" />
      case "request":
        return <UserCog className="h-4 w-4 text-yellow-500" />
      case "allowed":
        return <UserCheck className="h-4 w-4 text-green-500" />
      default:
        return <UserCog className="h-4 w-4" />
    }
  }

  const getPermissionBadge = (permission: string) => {
    switch (permission) {
      case "blocked":
        return <Badge variant="destructive">Blokkert</Badge>
      case "request":
        return <Badge variant="secondary">Må spørre</Badge>
      case "allowed":
        return <Badge variant="default" className="bg-green-500">Tillatt</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (children.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Du har ingen koblede barn ennå.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {children.map((child) => (
        <Card key={child.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={child.avatar_url || undefined} />
                  <AvatarFallback>
                    {child.full_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{child.full_name}</CardTitle>
                  <CardDescription>{child.email}</CardDescription>
                </div>
              </div>
              {getPermissionBadge(child.enrollment_permission)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Påmeldingstillatelse for ensemble
              </Label>
              <RadioGroup
                value={child.enrollment_permission}
                onValueChange={(value) => updatePermission(child.id, value)}
                disabled={updating === child.id}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent">
                  <RadioGroupItem value="blocked" id={`${child.id}-blocked`} />
                  <Label
                    htmlFor={`${child.id}-blocked`}
                    className="flex flex-1 cursor-pointer items-center gap-2"
                  >
                    <UserX className="h-4 w-4 text-red-500" />
                    <div>
                      <div className="font-medium">Blokkert</div>
                      <div className="text-xs text-muted-foreground">
                        Barnet kan ikke melde seg på ensemble i det hele tatt
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent">
                  <RadioGroupItem value="request" id={`${child.id}-request`} />
                  <Label
                    htmlFor={`${child.id}-request`}
                    className="flex flex-1 cursor-pointer items-center gap-2"
                  >
                    <UserCog className="h-4 w-4 text-yellow-500" />
                    <div>
                      <div className="font-medium">Må spørre (anbefalt)</div>
                      <div className="text-xs text-muted-foreground">
                        Barnet kan sende forespørsel som du må godkjenne
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent">
                  <RadioGroupItem value="allowed" id={`${child.id}-allowed`} />
                  <Label
                    htmlFor={`${child.id}-allowed`}
                    className="flex flex-1 cursor-pointer items-center gap-2"
                  >
                    <UserCheck className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="font-medium">Tillatt</div>
                      <div className="text-xs text-muted-foreground">
                        Barnet kan melde seg på ensemble direkte uten godkjenning
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {updating === child.id && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Oppdaterer...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
