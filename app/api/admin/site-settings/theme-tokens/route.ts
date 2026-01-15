import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { validateThemeTokens } from '@/lib/theme/validateThemeTokens'

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only admins can fetch/edit theme tokens
    const { data: userRow } = await supabase.from('users').select('role').eq('id', currentUser.id).single()
    if (!userRow || userRow.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data } = await supabase.from('site_settings').select('value').eq('key', 'theme_tokens').single()
    const value = data?.value || null
    return NextResponse.json({ value })
  } catch (err) {
    console.error('GET theme-tokens error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tokens } = body
    if (!tokens || typeof tokens !== 'object') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userRow } = await supabase.from('users').select('role').eq('id', currentUser.id).single()
    if (!userRow || userRow.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Validate tokens
    const validation = validateThemeTokens(tokens)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid tokens', details: validation.error.format() }, { status: 400 })
    }

    // Try update then insert
    const { error: updateError } = await supabase.from('site_settings').update({ value: tokens, updated_by: currentUser.id }).eq('key', 'theme_tokens')
    if (updateError) {
      const { error: insertError } = await supabase.from('site_settings').insert({ key: 'theme_tokens', value: tokens, updated_by: currentUser.id })
      if (insertError) {
        console.error('Failed to upsert theme_tokens:', insertError)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST theme-tokens error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
