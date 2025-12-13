"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Check, X, Clock, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { nb } from "date-fns/locale"

interface EnrollmentRequest {
  id: string
  child: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  ensemble: {
    id: string
    title: string
    slug: string
  }
  status: string
  request_message: string | null
  created_at: string
}

export function EnrollmentRequestsList() {
  const [requests, setRequests] = useState<EnrollmentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("enrollment_requests")
        .select(`
          id,
          status,
          request_message,
          created_at,
          child:users!enrollment_requests_child_id_fkey(
            id,
            full_name,
            avatar_url
          ),
          ensemble:ensembles(
            id,
            title,
            slug
          )
        `)
        .eq("parent_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setRequests(data as any || [])
    } catch (error) {
      console.error("Error fetching requests:", error)
      toast.error("Kunne ikke hente forespørsler")
    } finally {
      setLoading(false)
    }
  }

  const handleRequest = async (requestId: string, action: "approve" | "reject") => {
    setProcessing(requestId)
    try {
      const response = await fetch("/api/enrollment-request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Kunne ikke behandle forespørsel")
      }

      toast.success(action === "approve" ? "Påmelding godkjent!" : "Forespørsel avvist")
      await fetchRequests()
    } catch (error: any) {
      console.error("Error handling request:", error)
      toast.error(error.message)
    } finally {
      setProcessing(null)
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

  const pendingRequests = requests.filter(r => r.status === "pending")
  const reviewedRequests = requests.filter(r => r.status !== "pending")

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Ventende forespørsler ({pendingRequests.length})
          </h3>
          {pendingRequests.map((request) => (
            <Card key={request.id} className="border-yellow-200 bg-yellow-50/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.child.avatar_url || undefined} />
                      <AvatarFallback>
                        {request.child.full_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {request.child.full_name}
                      </CardTitle>
                      <CardDescription>
                        Vil melde seg på <strong>{request.ensemble.title}</strong>
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">Venter</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.request_message && (
                  <div className="rounded-lg bg-white p-3 text-sm">
                    <p className="font-medium mb-1">Melding:</p>
                    <p className="text-muted-foreground">{request.request_message}</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(request.created_at), {
                    addSuffix: true,
                    locale: nb,
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleRequest(request.id, "approve")}
                    disabled={processing === request.id}
                    className="flex-1"
                  >
                    {processing === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Godkjenn
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleRequest(request.id, "reject")}
                    disabled={processing === request.id}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Avvis
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reviewed Requests */}
      {reviewedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Tidligere forespørsler
          </h3>
          {reviewedRequests.map((request) => (
            <Card key={request.id} className="opacity-75">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={request.child.avatar_url || undefined} />
                      <AvatarFallback>
                        {request.child.full_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm">
                        {request.child.full_name} — {request.ensemble.title}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {formatDistanceToNow(new Date(request.created_at), {
                          addSuffix: true,
                          locale: nb,
                        })}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={request.status === "approved" ? "default" : "destructive"}
                    className={request.status === "approved" ? "bg-green-500" : ""}
                  >
                    {request.status === "approved" ? "Godkjent" : "Avvist"}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Ingen påmeldingsforespørsler ennå
          </CardContent>
        </Card>
      )}
    </div>
  )
}
