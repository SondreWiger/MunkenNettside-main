"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, RefreshCw, CreditCard, Calendar, User, DollarSign, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefundDialog } from "@/components/admin/refund-dialog"
import { formatPrice } from "@/lib/utils/booking"
import { toast } from "sonner"

const statusLabels: Record<string, string> = {
  pending: "Venter",
  completed: "Fullført",
  failed: "Feilet",
  refunded: "Refundert",
}

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  pending: { variant: "outline", className: "border-amber-500 text-amber-600 dark:text-amber-400" },
  completed: { variant: "default", className: "bg-green-600 hover:bg-green-700" },
  failed: { variant: "destructive" },
  refunded: { variant: "secondary", className: "bg-slate-500 hover:bg-slate-600" },
}

export default function PurchaseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [purchase, setPurchase] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)

  const fetchPurchase = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/purchases/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setPurchase(data)
      } else {
        toast.error("Kunne ikke laste kjøp")
        router.push("/admin/kjop")
      }
    } catch (error) {
      console.error("Error fetching purchase:", error)
      toast.error("Kunne ikke laste kjøp")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPurchase()
  }, [params.id])

  if (loading) {
    return (
      <main className="p-6 space-y-6">
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </main>
    )
  }

  if (!purchase) {
    return (
      <main className="p-6 space-y-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-slate-500 dark:text-slate-400">Kjøp ikke funnet</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  const config = statusConfig[purchase.status] || { variant: "secondary" as const }
  const transaction = Array.isArray(purchase.transactions) && purchase.transactions.length > 0 
    ? purchase.transactions[0] 
    : null

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/kjop">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Tilbake
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kjøpsdetaljer</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">ID: {purchase.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={config.variant} className={config.className}>
            {statusLabels[purchase.status] || purchase.status}
          </Badge>
          {purchase.status === "completed" && (
            <Button onClick={() => setRefundDialogOpen(true)} variant="destructive" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refunder
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Customer Info */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Kundeinformasjon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Navn</p>
              <p className="font-medium text-slate-900 dark:text-white">{purchase.user?.name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">E-post</p>
              <p className="font-medium text-slate-900 dark:text-white">{purchase.user?.email || "—"}</p>
            </div>
            {purchase.user?.phone && (
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Telefon</p>
                <p className="font-medium text-slate-900 dark:text-white">{purchase.user.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase Info */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" />
              Kjøpsinformasjon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ensemble</p>
              <p className="font-medium text-slate-900 dark:text-white">{purchase.ensemble?.title || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Beløp betalt</p>
              <p className="font-semibold text-lg text-slate-900 dark:text-white">
                {formatPrice(purchase.amount_paid_nok)}
              </p>
            </div>
            {purchase.discount_code_used && (
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Rabattkode brukt</p>
                <p className="font-medium text-slate-900 dark:text-white">{purchase.discount_code_used}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Kjøpsdato</p>
              <p className="font-medium text-slate-900 dark:text-white">
                {new Date(purchase.created_at).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Details */}
      {transaction && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Transaksjonsdetaljer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Transaksjon-ID</p>
                <p className="font-mono text-sm text-slate-900 dark:text-white">{transaction.id}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Betalingsmetode</p>
                <p className="font-medium text-slate-900 dark:text-white capitalize">{transaction.processor}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Transaksjonsstatus</p>
                <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
                  {transaction.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Beløp</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {formatPrice(transaction.amount_nok)}
                </p>
              </div>
            </div>
            {transaction.transaction_id && (
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Ekstern transaksjon-ID</p>
                <p className="font-mono text-sm text-slate-900 dark:text-white">{transaction.transaction_id}</p>
              </div>
            )}
            {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Metadata</p>
                <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-lg overflow-auto">
                  {JSON.stringify(transaction.metadata, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recordings */}
      {purchase.recording_ids && purchase.recording_ids.length > 0 && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Opptak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {purchase.recording_ids.map((recordingId: string) => (
                <div key={recordingId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="font-mono text-sm text-slate-900 dark:text-white">{recordingId}</p>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/opptak/${recordingId}`}>Vis</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Access Information */}
      {purchase.access_granted_at && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Tilgang
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tilgang gitt</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {new Date(purchase.access_granted_at).toLocaleDateString("nb-NO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {purchase.access_expires_at && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tilgang utløper</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {new Date(purchase.access_expires_at).toLocaleDateString("nb-NO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refund Dialog */}
      <RefundDialog
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
        purchaseId={purchase.id}
        purchaseAmount={purchase.amount_paid_nok}
        onRefundComplete={fetchPurchase}
      />
    </main>
  )
}
