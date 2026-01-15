"use client"

import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function WardrobeSizes() {
  const [loading, setLoading] = useState(false)
  const [sizes, setSizes] = useState({ shirt: '', trousers: '', shoe: '' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('users').select('id, metadata').eq('id', user.id).single()
        if (!mounted) return
        const wardrobe = profile?.metadata?.wardrobe || {}
        setSizes({ shirt: wardrobe.shirt || '', trousers: wardrobe.trousers || '', shoe: wardrobe.shoe || '' })
      } catch (err: unknown) {
        console.error('Error loading wardrobe sizes', err)
      }
    })()
    return () => { mounted = false }
  }, [])

  async function save() {
    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')
      // Merge into metadata. Use update on users table (RLS allows user updating their own row)
      const { data: profile } = await supabase.from('users').select('id, metadata').eq('id', user.id).single()
      const metadata = profile?.metadata || {}
      metadata.wardrobe = { ...(metadata.wardrobe || {}), ...sizes }
      const { error } = await supabase.from('users').update({ metadata }).eq('id', user.id)
      if (error) throw error
      toast.success('Størrelser lagret')
    } catch (err: unknown) {
      console.error('Save wardrobe sizes error', err)
      toast.error('Kunne ikke lagre størrelser')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Klesskaper størrelser</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <Label>Skjorte</Label>
          <Input value={sizes.shirt} onChange={(e) => setSizes({ ...sizes, shirt: e.target.value })} />
        </div>
        <div>
          <Label>Bukse</Label>
          <Input value={sizes.trousers} onChange={(e) => setSizes({ ...sizes, trousers: e.target.value })} />
        </div>
        <div>
          <Label>Skostørrelse</Label>
          <Input value={sizes.shoe} onChange={(e) => setSizes({ ...sizes, shoe: e.target.value })} />
        </div>
      </div>
      <div>
        <Button onClick={save} disabled={loading}>{loading ? 'Lagrer...' : 'Lagre størrelser'}</Button>
      </div>
    </div>
  )
}
