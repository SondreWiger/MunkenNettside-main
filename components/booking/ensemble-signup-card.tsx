"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Check, X, Clock, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface EnsembleSignupCardProps {
  ensembleId: string
  ensembleSlug: string
  ensembleTitle: string
  stage: string
  participationPrice?: number
}

type EnrollmentStatus = 'none' | 'pending' | 'yellow' | 'accepted' | 'rejected'

interface ConnectedChild {
  id: string
  full_name: string
}

export function EnsembleSignupCard({
  ensembleId,
  ensembleSlug,
  ensembleTitle,
  stage,
  participationPrice = 0,
}: EnsembleSignupCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>('none')
  const [userAccountType, setUserAccountType] = useState<string | null>(null)
  const [connectedChildren, setConnectedChildren] = useState<ConnectedChild[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [showChildSelector, setShowChildSelector] = useState(false)

  const isOpenForEnrollment = stage === "Påmelding"

  useEffect(() => {
    async function loadUserData() {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Load user profile
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, email, phone, account_type')
          .eq('id', user.id)
          .single()
        
        setUserProfile(profile)
        setUserAccountType(profile?.account_type)

        // Load connected children if user is a parent
        if (profile?.account_type === 'parent') {
          const { data: connections } = await supabase
            .from('family_connections')
            .select('child_id, child:child_id(id, full_name)')
            .eq('parent_id', user.id)
            .eq('status', 'active')

          if (connections) {
            const children = connections
              .filter((c: any) => c.child && c.child.id)
              .map((c: any) => ({
                id: c.child.id,
                full_name: c.child.full_name
              }))
            setConnectedChildren(children)
          }
        }

        // Check enrollment status
        const { data: enrollment } = await supabase
          .from('ensemble_enrollments')
          .select('status')
          .eq('user_id', user.id)
          .eq('ensemble_id', ensembleId)
          .maybeSingle()

        if (enrollment) {
          setEnrollmentStatus(enrollment.status as EnrollmentStatus)
        }
      }
    }
    
    loadUserData()
  }, [ensembleId])

  async function handleSignUp(childId?: string) {
    if (!isOpenForEnrollment || enrollmentStatus !== 'none') return

    setLoading(true)
    setError(null)
    try {
      // Ensure totalAmount is a number
      const totalAmount = typeof participationPrice === 'number' ? participationPrice : 0

      // Determine who to enroll (self or child)
      const enrolleeId = childId
      const enrolleeProfile = childId 
        ? connectedChildren.find(c => c.id === childId)
        : userProfile

      const payload = { 
        ensembleId,
        customerName: enrolleeProfile?.full_name || "Ukjent",
        customerEmail: enrolleeProfile?.email || userProfile?.email || "",
        customerPhone: enrolleeProfile?.phone || userProfile?.phone || "",
        totalAmount: totalAmount,
        childUserId: childId, // Indicate this is a child enrollment
      }
      
      console.log("[ensemble-signup-card] Sending payload:", payload, "totalAmount type:", typeof totalAmount)

      const response = await fetch("/api/ensemble/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("Enrollment error response:", data)
        setError(data.error || "Kunne ikke melde på")
        setLoading(false)
        return
      }

      setEnrollmentStatus('pending')
      setShowChildSelector(false)
      router.push(`/ensemble/${ensembleSlug}?enrollmentSuccess=true`)
    } catch (error) {
      console.error("Enrollment error:", error)
      setError("Feil ved påmelding")
      setLoading(false)
    }
  }

  // Get color and text based on status
  const getStatusInfo = () => {
    switch (enrollmentStatus) {
      case 'none':
        return {
          bgColor: 'bg-blue-500',
          text: 'Meld deg på',
          icon: Users,
          disabled: false,
          description: isOpenForEnrollment ? 'Påmelding åpen' : `Status: ${stage}`
        }
      case 'pending':
        return {
          bgColor: 'bg-yellow-500',
          text: 'Du har søkt',
          icon: Clock,
          disabled: true,
          description: 'Søknad sendt - venter på svar'
        }
      case 'yellow':
      case 'accepted':
        return {
          bgColor: 'bg-green-500',
          text: 'Du er godkjent',
          icon: Check,
          disabled: true,
          description: 'Godkjent - husk å betale medlemskap'
        }
      case 'rejected':
        return {
          bgColor: 'bg-red-500',
          text: 'Avvist',
          icon: X,
          disabled: true,
          description: 'Søknaden ble ikke godkjent'
        }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  const handleButtonClick = () => {
    if (userAccountType === 'parent' && connectedChildren.length > 0) {
      setShowChildSelector(true)
    } else {
      handleSignUp()
    }
  }

  return (
    <Card className={`sticky bottom-4 shadow-lg ${statusInfo.bgColor} text-white`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{ensembleTitle}</CardTitle>
        <CardDescription className="text-white/90">
          {statusInfo.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={showChildSelector} onOpenChange={setShowChildSelector}>
          <DialogTrigger asChild>
            <Button
              onClick={handleButtonClick}
              disabled={loading || statusInfo.disabled || !isOpenForEnrollment}
              className="w-full bg-white text-gray-900 hover:bg-gray-100"
              size="lg"
            >
              <StatusIcon className="mr-2 h-4 w-4" />
              {loading ? "Melder på..." : statusInfo.text}
            </Button>
          </DialogTrigger>
          {userAccountType === 'parent' && connectedChildren.length > 0 && (
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Velg hvem du vil melde på</DialogTitle>
                <DialogDescription>
                  Meld deg selv eller et av dine barn på {ensembleTitle}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    handleSignUp()
                  }}
                  className="w-full p-3 text-left border rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="font-medium">{userProfile?.full_name}</div>
                  <div className="text-sm text-gray-500">(Deg selv)</div>
                </button>
                {connectedChildren.map(child => (
                  <button
                    key={child.id}
                    onClick={() => {
                      handleSignUp(child.id)
                    }}
                    className="w-full p-3 text-left border rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="font-medium">{child.full_name}</div>
                    <div className="text-sm text-gray-500">(Ditt barn)</div>
                  </button>
                ))}
              </div>
            </DialogContent>
          )}
        </Dialog>
        {error && (
          <p className="text-sm text-white mt-3 text-center bg-red-700/30 rounded p-2">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
