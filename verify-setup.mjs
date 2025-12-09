import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envFile = readFileSync('.env', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=#]+)=(.*)$/)
  if (match) {
    env[match[1].trim()] = match[2].trim()
  }
})

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifySetup() {
  console.log('Verifying database setup...\n')
  
  // Test 1: Check if we can query users table
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role')
    .limit(3)
  
  if (usersError) {
    console.log('❌ Cannot query users table:', usersError.message)
  } else {
    console.log(`✅ Users table accessible (${users.length} users found)`)
    if (users.length > 0) {
      console.log('   Sample user:', users[0].email, '- role:', users[0].role)
    }
  }
  
  console.log('\n📋 SUMMARY:')
  console.log('The trigger and function cannot be verified programmatically.')
  console.log('You need to check Postgres logs for the actual error.')
  console.log('\nGo to: https://supabase.com/dashboard/project/avtlhezgsxjzvnrnagyw/logs/postgres-logs')
  console.log('Look for errors containing "handle_new_user" or "trigger"')
}

verifySetup()
