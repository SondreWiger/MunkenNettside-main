"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, DollarSign, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface RefundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseId: string
  purchaseAmount: number
  onRefundComplete?: () => void
}

const REFUND_REASONS = [
  { value: 'cancellation', label: 'Forestilling/kurs kansellert' },
  { value: 'customer_request', label: 'Kundeforespørsel' },
  { value: 'technical_issue', label: 'Teknisk problem' },
  { value: 'duplicate', label: 'Duplikat betaling' },
  { value: 'other', label: 'Annet' },
]

export function RefundDialog({
  open,
  onOpenChange,
  purchaseId,
  purchaseAmount,
  onRefundComplete,
}: RefundDialogProps) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [eligibility, setEligibility] = useState<any>(null)
  const [refundReason, setRefundReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [refundAmount, setRefundAmount] = useState(purchaseAmount)

  const checkEligibility = async () => {
    setChecking(true)
    try {
      const response = await fetch(`/api/admin/refund/${purchaseId}`)
      if (response.ok) {
        const data = await response.json()
        setEligibility(data)
        setRefundAmount(data.amount)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Kunne ikke sjekke refusjonskvalitet')
      }
    } catch (error) {
      console.error('Error checking eligibility:', error)
      toast.error('Kunne ikke sjekke refusjonskvalitet')
    } finally {
      setChecking(false)
    }
  }

  const handleRefund = async () => {
    if (!refundReason) {
      toast.error('Velg en årsak for refusjon')
      return
    }

    if (refundReason === 'other' && !customReason.trim()) {
      toast.error('Angi en årsak for refusjon')
      return
    }

    const finalReason = refundReason === 'other' 
      ? customReason 
      : REFUND_REASONS.find(r => r.value === refundReason)?.label || refundReason

    setLoading(true)
    try {
      const response = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId,
          reason: finalReason,
          amount_nok: refundAmount,
          adminNote: adminNote || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || 'Refusjon behandlet')
        onOpenChange(false)
        onRefundComplete?.()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Kunne ikke behandle refusjon')
      }
    } catch (error) {
      console.error('Error processing refund:', error)
      toast.error('Kunne ikke behandle refusjon')
    } finally {
      setLoading(false)
    }
  }

  // Check eligibility when dialog opens
  if (open && !eligibility && !checking) {
    checkEligibility()
  }

  // Reset when dialog closes
  if (!open && (eligibility || refundReason)) {
    setTimeout(() => {
      setEligibility(null)
      setRefundReason('')
      setCustomReason('')
      setAdminNote('')
      setRefundAmount(purchaseAmount)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Behandle refusjon</DialogTitle>
          <DialogDescription>
            Kjøps-ID: {purchaseId}
          </DialogDescription>
        </DialogHeader>

        {checking ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : eligibility ? (
          <div className="space-y-4">
            {/* Eligibility Status */}
            {eligibility.alreadyRefunded ? (
              <div className="flex items-start gap-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-slate-600 dark:text-slate-400 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Allerede refundert</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Dette kjøpet har allerede blitt refundert.
                  </p>
                </div>
              </div>
            ) : !eligibility.isEligible ? (
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-300">Ikke kvalifisert</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Dette kjøpet kan ikke refunderes (status: {eligibility.status}).
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Purchase Info */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Beløp:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {eligibility.amount.toLocaleString('no-NO')} NOK
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Betalingsmetode:</span>
                    <span className="font-medium text-slate-900 dark:text-white capitalize">
                      {eligibility.processor}
                    </span>
                  </div>
                  {eligibility.refundReason && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Type:</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {eligibility.refundReason}
                      </span>
                    </div>
                  )}
                </div>

                {/* Refund Amount */}
                <div className="space-y-2">
                  <Label htmlFor="refundAmount">Refusjonsbeløp (NOK)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="refundAmount"
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                      max={eligibility.amount}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Maks: {eligibility.amount.toLocaleString('no-NO')} NOK
                  </p>
                </div>

                {/* Refund Reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason">Årsak *</Label>
                  <Select value={refundReason} onValueChange={setRefundReason}>
                    <SelectTrigger id="reason">
                      <SelectValue placeholder="Velg årsak" />
                    </SelectTrigger>
                    <SelectContent>
                      {REFUND_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Reason */}
                {refundReason === 'other' && (
                  <div className="space-y-2">
                    <Label htmlFor="customReason">Spesifiser årsak *</Label>
                    <Input
                      id="customReason"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Beskriv årsaken til refusjon..."
                    />
                  </div>
                )}

                {/* Admin Note */}
                <div className="space-y-2">
                  <Label htmlFor="adminNote">Internt notat (valgfritt)</Label>
                  <Textarea
                    id="adminNote"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Notat synlig kun for administratorer..."
                    rows={3}
                  />
                </div>

                {/* Warning */}
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900 dark:text-amber-300">
                      Viktig informasjon
                    </p>
                    <p className="text-amber-700 dark:text-amber-400 mt-1">
                      {eligibility.processor === 'paypal' || eligibility.processor === 'vipps' ? (
                        <>Refusjon for {eligibility.processor.toUpperCase()} må fullføres manuelt i betalingsleverandørens dashboard. 
                        Dette systemet markerer kun kjøpet som refundert.</>
                      ) : (
                        'Denne handlingen kan ikke angres. Kunden vil motta en bekreftelse på e-post.'
                      )}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Avbryt
          </Button>
          {eligibility?.isEligible && !eligibility?.alreadyRefunded && (
            <Button
              onClick={handleRefund}
              disabled={loading || !refundReason || (refundReason === 'other' && !customReason.trim())}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Behandler...
                </>
              ) : (
                'Behandle refusjon'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
