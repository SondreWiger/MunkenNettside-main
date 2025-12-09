#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Use hardcoded values for this migration
const supabaseUrl = 'https://avtlhezgsxjzvnrnagyw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dGxoZXpnc3hqenZucm5hZ3l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE0Mjk0NywiZXhwIjoyMDgwNzE4OTQ3fQ.q3BKjbE4PkdPK09jwrItiJDWf23YwR9y1OfQjPT05IQ'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testDatabase() {
  try {
    console.log('Testing current users table structure...')
    
    // Try to query with actor_id to see if it fails
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, actor_id, profile_slug')
      .limit(1)
    
    if (error) {
      console.error('Error querying users table:', error.message)
      console.error('Full error:', error)
      
      // Check what columns actually exist
      console.log('\nChecking existing table structure...')
      const { data: simpleData, error: simpleError } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .limit(1)
        
      if (simpleError) {
        console.error('Even simple query failed:', simpleError)
      } else {
        console.log('Basic columns work fine. Missing actor_id and profile_slug columns.')
        console.log('Sample data:', simpleData)
      }
    } else {
      console.log('SUCCESS: Users table has all required columns!')
      console.log('Sample data:', data)
    }
    
  } catch (err) {
    console.error('Test failed:', err.message)
  }
}

testDatabase()