#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables
const envFile = readFileSync('.env', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupExpiredData() {
  console.log('🧹 Starting GDPR compliance data cleanup...')
  
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
  const fiveYearsAgo = new Date(now.getTime() - (5 * 365 * 24 * 60 * 60 * 1000))
  
  try {
    // 1. Clean up expired seat reservations
    console.log('🪑 Cleaning expired seat reservations...')
    const { count: expiredSeats, error: seatsError } = await supabase
      .from('seats')
      .update({ status: 'available', reserved_until: null })
      .lt('reserved_until', now.toISOString())
      .eq('status', 'reserved')
    
    if (seatsError) {
      console.error('❌ Error cleaning seats:', seatsError)
    } else {
      console.log(`✅ Cleaned ${expiredSeats} expired seat reservations`)
    }

    // 2. Clean up expired admin verifications (over 24 hours old)
    console.log('🔑 Cleaning expired admin verifications...')
    const { count: expiredVerifications, error: verificationError } = await supabase
      .from('admin_verifications')
      .delete()
      .lt('expires_at', now.toISOString())
    
    if (verificationError) {
      console.error('❌ Error cleaning verifications:', verificationError)
    } else {
      console.log(`✅ Cleaned ${expiredVerifications} expired admin verifications`)
    }

    // 3. Clean up expired device registrations (over 24 hours old)
    console.log('📱 Cleaning expired device registrations...')
    const { count: expiredDevices, error: deviceError } = await supabase
      .from('admin_device_registrations')
      .delete()
      .lt('expires_at', now.toISOString())
      .eq('used', false)
    
    if (deviceError) {
      console.error('❌ Error cleaning devices:', deviceError)
    } else {
      console.log(`✅ Cleaned ${expiredDevices} expired device registrations`)
    }

    // 4. Clean up expired family connection codes (over 24 hours old)
    console.log('👪 Cleaning expired family connection codes...')
    const { count: expiredCodes, error: codesError } = await supabase
      .from('users')
      .update({ 
        family_connection_code: null, 
        family_code_expires_at: null 
      })
      .lt('family_code_expires_at', now.toISOString())
      .not('family_connection_code', 'is', null)
    
    if (codesError) {
      console.error('❌ Error cleaning family codes:', codesError)
    } else {
      console.log(`✅ Cleaned ${expiredCodes} expired family connection codes`)
    }

    // 5. Clean up expired video access tokens
    console.log('🎥 Cleaning expired video access tokens...')
    const { count: expiredTokens, error: tokensError } = await supabase
      .from('video_access_tokens')
      .delete()
      .lt('expires_at', now.toISOString())
    
    if (tokensError) {
      console.error('❌ Error cleaning video tokens:', tokensError)
    } else {
      console.log(`✅ Cleaned ${expiredTokens} expired video access tokens`)
    }

    // 6. Archive old booking data (5+ years old) but keep for legal compliance
    console.log('🎫 Archiving old booking data...')
    const { data: oldBookings } = await supabase
      .from('bookings')
      .select('id, customer_name, customer_email, created_at')
      .lt('created_at', fiveYearsAgo.toISOString())
      .eq('status', 'completed')
    
    if (oldBookings && oldBookings.length > 0) {
      // Anonymize old booking data while preserving for accounting
      const { count: archivedBookings, error: archiveError } = await supabase
        .from('bookings')
        .update({
          customer_name: 'Arkivert kunde',
          customer_email: 'arkivert@teateret.no',
          customer_phone: null
        })
        .lt('created_at', fiveYearsAgo.toISOString())
        .eq('status', 'completed')
      
      if (archiveError) {
        console.error('❌ Error archiving bookings:', archiveError)
      } else {
        console.log(`✅ Anonymized ${archivedBookings} old booking records`)
      }
    }

    // 7. Clean up old action logs (keep 1 year for security)
    console.log('📋 Cleaning old action logs...')
    const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000))
    const { count: oldLogs, error: logsError } = await supabase
      .from('admin_action_logs')
      .delete()
      .lt('created_at', oneYearAgo.toISOString())
    
    if (logsError) {
      console.error('❌ Error cleaning action logs:', logsError)
    } else {
      console.log(`✅ Cleaned ${oldLogs} old action log entries`)
    }

    // 8. Update children accounts that turned 18
    console.log('👶➡️👨 Updating accounts for children who turned 18...')
    const eighteenYearsAgo = new Date(now.getTime() - (18 * 365 * 24 * 60 * 60 * 1000))
    
    const { count: updatedAccounts, error: updateError } = await supabase
      .from('users')
      .update({ 
        account_type: 'standalone',
        date_of_birth: null // Remove birth date for privacy
      })
      .eq('account_type', 'kid')
      .lt('date_of_birth', eighteenYearsAgo.toISOString().split('T')[0])
    
    if (updateError) {
      console.error('❌ Error updating adult accounts:', updateError)
    } else {
      console.log(`✅ Updated ${updatedAccounts} child accounts to adult status`)
    }

    // 9. Remove family connections for users who turned 18
    const { count: removedConnections, error: connectionError } = await supabase
      .from('family_connections')
      .delete()
      .in('child_id', 
        (await supabase
          .from('users')
          .select('id')
          .eq('account_type', 'standalone')
          .lt('date_of_birth', eighteenYearsAgo.toISOString().split('T')[0])
        ).data?.map(u => u.id) || []
      )
    
    if (connectionError) {
      console.error('❌ Error removing family connections:', connectionError)
    } else {
      console.log(`✅ Removed ${removedConnections} family connections for adults`)
    }

    console.log('\n✅ GDPR compliance cleanup completed successfully!')
    console.log('📊 Summary:')
    console.log(`- Expired reservations: ${expiredSeats || 0}`)
    console.log(`- Expired verifications: ${expiredVerifications || 0}`)
    console.log(`- Expired devices: ${expiredDevices || 0}`)
    console.log(`- Expired family codes: ${expiredCodes || 0}`)
    console.log(`- Expired video tokens: ${expiredTokens || 0}`)
    console.log(`- Archived bookings: ${oldBookings?.length || 0}`)
    console.log(`- Old action logs: ${oldLogs || 0}`)
    console.log(`- Updated adult accounts: ${updatedAccounts || 0}`)
    console.log(`- Removed family connections: ${removedConnections || 0}`)

  } catch (error) {
    console.error('❌ Cleanup error:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupExpiredData()
}

export { cleanupExpiredData }