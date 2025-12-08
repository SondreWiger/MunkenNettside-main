"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface Enrollment {
  id: string
  user_id: string
  ensemble_id: string
  status: string
  enrolled_at: string
  reviewed_at: string | null
  role?: string
  users: {
    full_name: string
    email: string
  }
}

export default function EnrollmentsPage() {
  const params = useParams()
  const ensembleId = params.id as string
  const [ensembleData, setEnsembleData] = useState<any>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<Record<string, string>>({})

  useEffect(() => {
    if (ensembleId) {
      fetchData()
    }
  }, [ensembleId])

  const fetchData = async () => {
    const supabase = getSupabaseBrowserClient()

    // Fetch ensemble title
    const { data: ensemble } = await supabase
      .from("ensembles")
      .select("id, title, yellow_team_name, blue_team_name")
      .eq("id", ensembleId)
      .single()

    if (ensemble) {
      setEnsembleData(ensemble)
    }

    // Fetch all enrollments (all statuses)
    const { data: enrollmentsData, error: enrollError } = await supabase
      .from("ensemble_enrollments")
      .select(`
        id,
        user_id,
        ensemble_id,
        status,
        role,
        enrolled_at,
        reviewed_at,
        users!user_id(full_name, email)
      `)
      .eq("ensemble_id", ensembleId)
      .order("enrolled_at", { ascending: false })

    if (enrollError) {
      console.error("Enrollment fetch error:", enrollError)
    }

    if (enrollmentsData) {
      console.log("Enrollments loaded:", enrollmentsData)
      setEnrollments(enrollmentsData)
    } else {
      console.log("No enrollments data returned")
    }

    setLoading(false)
  }

  const updateStatus = async (enrollmentId: string, newStatus: string, role?: string) => {
    const supabase = getSupabaseBrowserClient()
    
    console.log(`[Update] Button clicked - ID: ${enrollmentId}, Status: ${newStatus}`)

    try {
      const { data, error } = await supabase
        .from("ensemble_enrollments")
        .update({ 
          status: newStatus.toLowerCase().trim(),
          reviewed_at: new Date().toISOString(),
          ...(role ? { role: role.trim() } : {})
        })
        .eq("id", enrollmentId)

      console.log(`[Update] Response:`, { data, error })

      if (error) {
        console.error("[Update] Error:", JSON.stringify(error, null, 2))
        return
      }

      // Update local state with new status and role
      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enrollmentId
            ? { ...e, status: newStatus, role: role || e.role }
            : e
        )
      )
      // Clear role input for this enrollment
      setRoles((prev) => {
        const updated = { ...prev }
        delete updated[enrollmentId]
        return updated
      })
    } catch (err) {
      console.error("[Update] Exception:", err)
    }
  }

  if (loading) {
    return (
      <main className="container px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Laster...</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "yellow":
        return "bg-yellow-100 text-yellow-900"
      case "blue":
        return "bg-blue-100 text-blue-900"
      case "rejected":
        return "bg-red-100 text-red-900"
      default:
        return "bg-gray-100 text-gray-900"
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="outline">
            <Link href={`/admin/ensembler/${ensembleId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Påmeldinger</h1>
            <p className="text-muted-foreground">{ensembleData?.title}</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Pending Section */}
          {enrollments.filter((e) => e.status === "pending").length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 text-gray-900">Venter på godkjenning</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrollments
                  .filter((e) => e.status === "pending")
                  .map((enrollment) => (
                    <EnrollmentCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      ensembleData={ensembleData}
                      roles={roles}
                      onRoleChange={(id, role) => setRoles((prev) => ({ ...prev, [id]: role }))}
                      onUpdateStatus={updateStatus}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Yellow Team Section */}
          {enrollments.filter((e) => e.status === "yellow").length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 text-yellow-900">
                {ensembleData?.yellow_team_name || "Gult lag"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrollments
                  .filter((e) => e.status === "yellow")
                  .map((enrollment) => (
                    <EnrollmentCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      ensembleData={ensembleData}
                      roles={roles}
                      onRoleChange={(id, role) => setRoles((prev) => ({ ...prev, [id]: role }))}
                      onUpdateStatus={updateStatus}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Blue Team Section */}
          {enrollments.filter((e) => e.status === "blue").length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 text-blue-900">
                {ensembleData?.blue_team_name || "Blått lag"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrollments
                  .filter((e) => e.status === "blue")
                  .map((enrollment) => (
                    <EnrollmentCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      ensembleData={ensembleData}
                      roles={roles}
                      onRoleChange={(id, role) => setRoles((prev) => ({ ...prev, [id]: role }))}
                      onUpdateStatus={updateStatus}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Rejected Section */}
          {enrollments.filter((e) => e.status === "rejected").length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 text-red-900">Avslått</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrollments
                  .filter((e) => e.status === "rejected")
                  .map((enrollment) => (
                    <EnrollmentCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      ensembleData={ensembleData}
                      roles={roles}
                      onRoleChange={(id, role) => setRoles((prev) => ({ ...prev, [id]: role }))}
                      onUpdateStatus={updateStatus}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>

        {enrollments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Ingen påmeldinger ennå</p>
          </div>
        )}
      </div>
    </main>
  )
}

interface EnrollmentCardProps {
  enrollment: Enrollment
  ensembleData: any
  roles: Record<string, string>
  onRoleChange: (enrollmentId: string, role: string) => void
  onUpdateStatus: (enrollmentId: string, newStatus: string, role?: string) => void
}

function EnrollmentCard({ enrollment, ensembleData, roles, onRoleChange, onUpdateStatus }: EnrollmentCardProps) {
  const currentRole = roles[enrollment.id] ?? enrollment.role ?? ""

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="font-semibold text-lg text-gray-900">{enrollment.users.full_name}</p>
            <p className="text-sm text-gray-500">{enrollment.users.email}</p>
          </div>
          <Badge
            className={`${
              enrollment.status === "pending"
                ? "bg-gray-100 text-gray-900"
                : enrollment.status === "yellow"
                ? "bg-yellow-100 text-yellow-900"
                : enrollment.status === "blue"
                ? "bg-blue-100 text-blue-900"
                : "bg-red-100 text-red-900"
            }`}
          >
            {enrollment.status === "pending"
              ? "Venter"
              : enrollment.status === "yellow"
              ? "Gult"
              : enrollment.status === "blue"
              ? "Blått"
              : "Avslått"}
          </Badge>
        </div>

        {enrollment.role && (
          <div className="mb-3 text-sm text-gray-600">
            <span className="font-medium">Rolle:</span> {enrollment.role}
          </div>
        )}

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-1">
            {enrollment.role ? "Oppdater rolle" : "Rolle"}
          </label>
          <Input
            placeholder="f.eks. Hovedrolle, Kor"
            value={currentRole}
            onChange={(e) => onRoleChange(enrollment.id, e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => onUpdateStatus(enrollment.id, "yellow", currentRole)}
            variant={enrollment.status === "yellow" ? "default" : "outline"}
            className="w-full justify-start"
          >
            <Check className="h-4 w-4 mr-2" />
            {ensembleData?.yellow_team_name || "Gult lag"}
          </Button>
          <Button
            onClick={() => onUpdateStatus(enrollment.id, "blue", currentRole)}
            variant={enrollment.status === "blue" ? "default" : "outline"}
            className="w-full justify-start"
          >
            <Check className="h-4 w-4 mr-2" />
            {ensembleData?.blue_team_name || "Blått lag"}
          </Button>
          <Button
            onClick={() => onUpdateStatus(enrollment.id, "rejected")}
            variant={enrollment.status === "rejected" ? "default" : "outline"}
            className={`w-full justify-start ${
              enrollment.status === "rejected" ? "" : "text-red-600 hover:text-red-700"
            }`}
          >
            <X className="h-4 w-4 mr-2" />
            Avslå
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}