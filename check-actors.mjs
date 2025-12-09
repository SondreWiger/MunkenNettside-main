#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Use hardcoded values for this migration
const supabaseUrl = 'https://avtlhezgsxjzvnrnagyw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dGxoZXpnc3hqenZucm5hZ3l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE0Mjk0NywiZXhwIjoyMDgwNzE4OTQ3fQ.q3BKjbE4PkdPK09jwrItiJDWf23YwR9y1OfQjPT05IQ'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkActorsTable() {
  try {
    console.log('Checking if actors table exists...')
    
    const { data, error } = await supabase
      .from('actors')
      .select('id, name')
      .limit(1)
    
    if (error) {
      console.error('Actors table error:', error.message)
      console.error('Full error:', error)
    } else {
      console.log('Actors table exists! Sample data:', data)
    }

    console.log('\nTesting the exact query from admin API...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        full_name,
        email,
        phone,
        role,
        profile_slug,
        actor_id,
        created_at,
        updated_at,
        actor:actor_id(
          id,
          name,
          bio,
          photo_url
        )
      `)
      .order('full_name')
      .limit(3)

    if (usersError) {
      console.error('Users with actor join failed:', usersError.message)
      console.error('Full error:', usersError)
    } else {
      console.log('Users with actor join succeeded! Data:', JSON.stringify(users, null, 2))
    }
    
  } catch (err) {
    console.error('Test failed:', err.message)
  }
}

checkActorsTable()