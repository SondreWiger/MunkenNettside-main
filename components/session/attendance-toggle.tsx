"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function AttendanceToggle({ showId }: { showId: string }) {
  const [isAttending, setIsAttending] = useState(false)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        const res = await fetch(`/api/shows/${showId}/attendance`)
        if (!res.ok) return
        const body = await res.json()
        const attendees = body.attendees || []
        setCount(attendees.length)
        if (user) {
          setIsAttending(attendees.some((a: any) => a.user?.id === user.id))
        }
      } catch (e) {
        console.error('Error loading attendance', e)
      }
    }
    load()
  }, [showId])

  const toggle = async () => {
    setLoading(true)
    try {
      const action = isAttending ? 'unattend' : 'attend'
      const res = await fetch(`/api/shows/${showId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed')
      }
      if (action === 'attend') {
        setIsAttending(true)
        setCount((c) => c + 1)
        toast.success('Marked as attending')
      } else {
        setIsAttending(false)
        setCount((c) => Math.max(0, c - 1))
        toast.success('Marked as not attending')
      }
    } catch (e: any) {
      console.error('Toggle attendance failed', e)
      toast.error('Kunne ikke oppdatere deltakelse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={toggle} disabled={loading}>{isAttending ? 'Deltar (klikk for å melde avbud)' : 'Meld meg på øving'}</Button>
      <div className="text-sm text-muted-foreground">{count} deltar</div>
    </div>
  )
}
