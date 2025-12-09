// Clear all actors and roles data to start fresh
// This script clears the actors and roles tables

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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearActorsAndRoles() {
  try {
    console.log('🧹 Clearing actors and roles data...')

    // First delete all roles (has foreign key to actors)
    const { error: rolesError } = await supabase
      .from('roles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (rolesError && rolesError.code !== '42P01') { // Ignore table doesn't exist error
      console.error('❌ Error clearing roles:', rolesError)
      process.exit(1)
    } else if (rolesError?.code === '42P01') {
      console.log('⚠️  Roles table does not exist yet')
    } else {
      console.log('✅ Cleared all roles')
    }

    // Then delete all actors
    const { error: actorsError } = await supabase
      .from('actors')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (actorsError && actorsError.code !== '42P01') { // Ignore table doesn't exist error
      console.error('❌ Error clearing actors:', actorsError)
      process.exit(1)
    } else if (actorsError?.code === '42P01') {
      console.log('⚠️  Actors table does not exist yet')
    } else {
      console.log('✅ Cleared all actors')
    }

    console.log('\n🎭 All actors and roles data cleared. You can now start fresh!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

clearActorsAndRoles()