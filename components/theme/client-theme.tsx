"use client"

import { useEffect } from 'react'
import { applyTheme } from '@/lib/theme/applyTheme'

export default function ClientTheme() {
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/site-settings/theme-tokens')
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        const tokens = data?.value || null
        if (tokens && typeof tokens === 'object') {
          applyTheme(tokens)
        }
      } catch (e) {
        // Ignore errors - best-effort client-side apply
        // eslint-disable-next-line no-console
        console.warn('Client theme load failed', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  return null
}
