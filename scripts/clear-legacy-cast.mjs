// Clear legacy cast data from ensembles
// This script clears the yellow_cast and blue_cast JSONB fields
// to prevent conflicts with the new roles/actors system

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Read .env file manually
const envFile = fs.readFileSync('.env', 'utf8')
const envVars = {}
envFile.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...values] = line.split('=')
    envVars[key.trim()] = values.join('=').trim()
  }
})

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL']
const supabaseServiceKey = envVars['SUPABASE_SERVICE_ROLE_KEY']

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing')
console.log('Service Key:', supabaseServiceKey ? 'Found' : 'Missing')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearLegacyCast() {
  try {
    console.log('🧹 Clearing legacy cast data from ensembles...')

    // Clear yellow_cast and blue_cast fields
    const { data, error } = await supabase
      .from('ensembles')
      .update({
        yellow_cast: [],
        blue_cast: []
      })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Update all records
      .select('id, title, yellow_cast, blue_cast')

    if (error) {
      console.error('❌ Error clearing legacy cast data:', error)
      process.exit(1)
    }

    console.log(`✅ Cleared legacy cast data from ${data?.length || 0} ensembles`)
    
    // Show updated ensembles
    if (data && data.length > 0) {
      console.log('\nUpdated ensembles:')
      data.forEach(ensemble => {
        console.log(`  - ${ensemble.title}: yellow_cast=${ensemble.yellow_cast?.length || 0}, blue_cast=${ensemble.blue_cast?.length || 0}`)
      })
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

clearLegacyCast()