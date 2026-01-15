import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'theme_tokens').single()
    const value = data?.value || null
    // Allow clients to cache tokens briefly; tokens are small and infrequently changed.
    return NextResponse.json({ value }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    })
  } catch (err) {
    console.error('GET public theme-tokens error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
