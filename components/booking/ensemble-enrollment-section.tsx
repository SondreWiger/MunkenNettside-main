"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, CheckCircle, Clock, XCircle, User } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface EnsembleEnrollmentSectionProps {
  ensembleId: string
  ensembleSlug: string
  ensembleTitle: string
}

export function EnsembleEnrollmentSection({ ensembleId, ensembleSlug, ensembleTitle }: EnsembleEnrollmentSectionProps) {
  // State declarations (only once, at the top)
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [myEnrollment, setMyEnrollment] = useState<any>(null)
  const [childrenEnrollments, setChildrenEnrollments] = useState<any[]>([])
  const [connectedChildren, setConnectedChildren] = useState<any[]>([])
  const [enrollmentPermission, setEnrollmentPermission] = useState<string | null>(null)
  const [parentInfo, setParentInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  const loadEnrollmentData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        setLoading(false)
        return
      }

      setUser(authUser)

      // Get user profile to check account type
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single()

      if (profile) {
        setUserProfile(profile)

        // If user is a kid, fetch their enrollment permission
        if (profile.account_type === 'kid') {
          const { data: connection } = await supabase
            .from("family_connections")
            .select("enrollment_permission")
            .eq("child_id", authUser.id)
            .eq("status", "active")
            .single()

          setEnrollmentPermission(connection?.enrollment_permission || 'request')
        }
      }

      // Get my enrollment
      const { data: myEnroll } = await supabase
        .from("ensemble_enrollments")
        .select("*")
        .eq("ensemble_id", ensembleId)
        .eq("user_id", authUser.id)
        .single()

      setMyEnrollment(myEnroll)

      // Get connected children (for parents)
      const { data: familyConnections } = await supabase
        .from("family_connections")
        .select(`
          child_id,
          enrollment_permission,
          child:child_id(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("parent_id", authUser.id)
        .eq("status", "active")

      if (familyConnections && familyConnections.length > 0) {
        const children = familyConnections
          .filter((fc: any) => fc.child)
          .map((fc: any) => ({
            ...fc.child,
            enrollment_permission: fc.enrollment_permission || 'request'
          }))
        
        setConnectedChildren(children)

        // Get enrollments for each child
        const childIds = children.map((child: any) => child.id)
        const { data: childEnrolls } = await supabase
          .from("ensemble_enrollments")
          .select("*")
          .eq("ensemble_id", ensembleId)
          .in("user_id", childIds)

        if (childEnrolls) {
          // Map enrollments with child data
          const enrichedEnrollments = childEnrolls.map((enrollment: any) => {
            const child = children.find((c: any) => c.id === enrollment.user_id)
            return { ...enrollment, child }
          })
          setChildrenEnrollments(enrichedEnrollments)
        }
      }
    } catch (error) {
      console.error("Error loading enrollment data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEnrollmentData()
  }, [ensembleId])

  if (loading) {
    return <div className="text-center py-8">Laster...</div>
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meld deg på ensemble</CardTitle>
          <CardDescription>Logg inn for å melde deg på</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/logg-inn?redirect=/ensemble/${ensembleSlug}`}>
            <Button className="w-full">Logg inn</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  // Check if user is a child with blocked enrollment
  const isBlockedChild = userProfile?.account_type === 'kid' && enrollmentPermission === 'blocked'
  const needsParentApproval = userProfile?.account_type === 'kid' && enrollmentPermission === 'request'

  if (isBlockedChild) {
    console.log('[BLOCKED UI] Rendered for blocked user:', { userProfile, enrollmentPermission })
    return (
      <div className="pt-4 w-full flex flex-col items-center">
        <div className="w-full max-w-xl bg-red-100 border-2 border-red-400 rounded-xl p-6 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-red-800 mb-2">
            Påmelding er blokkert
          </span>
          <span className="text-base text-red-700 mb-4">
            Du har ikke tillatelse til å melde deg på dette ensemblet.
          </span>
          <span className="text-sm text-red-600">
            Dette er bestemt av dine foreldretillatelser. Kontakt din foresatt hvis du mener dette er feil.
          </span>
          <div className="w-full mt-6">
            <div className="w-full h-14 bg-gray-300 rounded-lg flex items-center justify-center opacity-60 cursor-not-allowed select-none text-gray-600 text-lg font-semibold border border-gray-400">
              🚫 Du kan ikke melde deg på
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'yellow':
      case 'blue':
      case 'accepted':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Godkjent</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Venter</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Avvist</Badge>
      default:
        return null
    }
  }

  // Count how many can be enrolled (self + children who aren't enrolled)
  // For blocked/request children, they cannot enroll themselves
  const canEnrollSelf = !myEnrollment && !isBlockedChild && !needsParentApproval
  const unenrolledChildren = connectedChildren.filter(
    child => !childrenEnrollments.find(e => e.user_id === child.id)
  )
  // Filter out children who can't be enrolled (only count 'allowed' children)
  const enrollableChildren = unenrolledChildren.filter(
    child => child.enrollment_permission === 'allowed'
  )
  const hasUnenrolledPeople = canEnrollSelf || enrollableChildren.length > 0

  return (
    <div className="space-y-4 w-full" key={userProfile?.account_type + '-' + enrollmentPermission}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Påmeldingsstatus
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* My enrollment status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Meg selv</p>
                {myEnrollment && (
                  <p className="text-sm text-muted-foreground">
                    Meldt på {new Date(myEnrollment.created_at).toLocaleDateString('nb-NO')}
                  </p>
                )}
              </div>
            </div>
            {myEnrollment ? (
              getStatusBadge(myEnrollment.status)
            ) : (
              <Badge variant="outline">Ikke påmeldt</Badge>
            )}
          </div>

          {/* Children enrollment status */}
          {connectedChildren.length > 0 && (
            <>
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Barn</p>
                <div className="space-y-2">
                  {connectedChildren.map((child: any) => {
                    const enrollment = childrenEnrollments.find(e => e.user_id === child.id)
                    return (
                      <div key={child.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {child.avatar_url && (
                            <img
                              src={child.avatar_url}
                              alt={child.full_name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium">{child.full_name}</p>
                            {enrollment && (
                              <p className="text-sm text-muted-foreground">
                                Meldt på {new Date(enrollment.created_at).toLocaleDateString('nb-NO')}
                              </p>
                            )}
                          </div>
                        </div>
                        {enrollment ? (
                          getStatusBadge(enrollment.status)
                        ) : (
                          <Badge variant="outline">Ikke påmeldt</Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Enroll button - different states based on permissions */}
          {isBlockedChild ? (
            <div className="pt-4 w-full flex flex-col items-center">
              <div className="w-full max-w-xl bg-red-100 border-2 border-red-400 rounded-xl p-6 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-red-800 mb-2">
                  Påmelding er blokkert
                </span>
                <span className="text-base text-red-700 mb-4">
                  Du har ikke tillatelse til å melde deg på dette ensemblet.
                </span>
                <span className="text-sm text-red-600">
                  Dette er bestemt av dine foreldretillatelser. Kontakt din foresatt hvis du mener dette er feil.
                </span>
                <div className="w-full mt-6">
                  <div className="w-full h-14 bg-gray-300 rounded-lg flex items-center justify-center opacity-60 cursor-not-allowed select-none text-gray-600 text-lg font-semibold border border-gray-400">
                    🚫 Du kan ikke melde deg på
                  </div>
                </div>
              </div>
            </div>
          ) : needsParentApproval ? (
            <div className="pt-4 space-y-2">
              <Button 
                className="w-full" 
                size="lg" 
                variant="secondary"
                onClick={async () => {
                  // Create enrollment request instead of direct enrollment
                  try {
                    const response = await fetch('/api/enrollment-request', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ensembleId: ensembleId,
                        requestMessage: `Jeg vil gjerne melde meg på ${ensembleTitle}`
                      })
                    })

                    const data = await response.json()

                    if (!response.ok) {
                      throw new Error(data.error || 'Kunne ikke sende forespørsel')
                    }

                    // Show success message
                    alert('Forespørsel sendt til din foresatt!')
                    // Reload to update UI
                    loadEnrollmentData()
                  } catch (error: any) {
                    alert(error.message || 'Kunne ikke sende forespørsel')
                  }
                }}
              >
                Be om tillatelse fra forelder
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Din forelder må godkjenne påmeldingen din
              </p>
            </div>
          ) : hasUnenrolledPeople ? (
            <div className="pt-4">
              <Link href={`/ensemble/${ensembleSlug}/bestill`}>
                <Button className="w-full" size="lg">
                  {canEnrollSelf && enrollableChildren.length > 0
                    ? "Meld på meg og/eller barn"
                    : canEnrollSelf
                    ? "Meld meg på"
                    : "Meld på barn"}
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground text-center mt-2">
                {enrollableChildren.length > 0 && `${enrollableChildren.length} barn kan meldes på`}
              </p>
            </div>
          ) : (
            <div className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Du og alle dine barn er allerede påmeldt
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
