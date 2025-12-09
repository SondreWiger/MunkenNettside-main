#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Use hardcoded values for this migration
const supabaseUrl = 'https://avtlhezgsxjzvnrnagyw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dGxoZXpnc3hqenZucm5hZ3l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE0Mjk0NywiZXhwIjoyMDgwNzE4OTQ3fQ.q3BKjbE4PkdPK09jwrItiJDWf23YwR9y1OfQjPT05IQ'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('Reading SQL migration file...')
    const sqlContent = readFileSync(join(__dirname, 'fix-user-columns.sql'), 'utf8')
    
    console.log('Executing SQL migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent })
    
    if (error) {
      console.error('Error executing migration:', error)
      return
    }
    
    console.log('Migration completed successfully!')
    console.log('Result:', data)
    
    // Test that the API works now
    console.log('\nTesting users API...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, role, actor_id, profile_slug')
      .limit(5)
    
    if (usersError) {
      console.error('Users API still has error:', usersError)
    } else {
      console.log('Users API working! Sample data:', users)
    }
    
  } catch (err) {
    console.error('Migration failed:', err.message)
  }
}

runMigration()