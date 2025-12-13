import { getSupabaseServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function createAdminDevice(supabase: any, userId: string, deviceName?: string, deviceInfo?: any) {
  const deviceToken = crypto.randomUUID()
  const { data, error } = await supabase
    .from('admin_devices')
    .insert({ user_id: userId, device_token: deviceToken, device_name: deviceName || null, device_info: deviceInfo || null })
    .select()
    .single()

  if (error) throw error
  return { device: data, token: deviceToken }
}

export async function getDeviceByToken(supabase: any, token: string) {
  const { data, error } = await supabase.from('admin_devices').select('*').eq('device_token', token).eq('revoked', false).single()
  if (error) return null
  return data
}

export async function revokeDevice(supabase: any, id: string) {
  const { error } = await supabase.from('admin_devices').update({ revoked: true }).eq('id', id)
  if (error) throw error
  return true
}
