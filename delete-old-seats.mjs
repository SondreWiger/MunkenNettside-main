#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load .env file manually
const envFile = readFileSync('.env', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const VENUE_ID = '00000000-0000-0000-0000-000000000001'

console.log('🗑️  Deleting old seats...')

// Get all shows for this venue
const { data: shows } = await supabase
  .from('shows')
  .select('id, title')
  .eq('venue_id', VENUE_ID)

if (!shows || shows.length === 0) {
  console.log('ℹ️  No shows found')
  process.exit(0)
}

console.log(`📊 Found ${shows.length} show(s)`)

// Delete seats
const showIds = shows.map(s => s.id)
const { error: deleteError } = await supabase
  .from('seats')
  .delete()
  .in('show_id', showIds)

if (deleteError) {
  console.error('❌ Error:', deleteError)
  process.exit(1)
}

console.log('✅ Old seats deleted!')
console.log('\n📝 Now visit a booking page to regenerate seats with the new layout')
