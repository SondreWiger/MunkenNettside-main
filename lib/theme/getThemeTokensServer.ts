import { getSupabaseAdminClient } from '@/lib/supabase/server'

export async function getThemeTokensServer() {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'theme_tokens').single()
    return data?.value || null
  } catch (e) {
    console.error('Error fetching theme tokens server-side', e)
    return null
  }
}
