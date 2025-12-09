import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env file
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
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function testDirectInsert() {
  console.log('Testing direct insert into users table...\n')
  
  const testId = crypto.randomUUID()
  const testEmail = `test_${Date.now()}@example.com`
  
  // Try to insert directly
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: testId,
      email: testEmail,
      full_name: 'Direct Test User',
      phone: '+4712345678',
      role: 'customer',
      profile_slug: `test-${Date.now()}`
    })
    .select()
    .single()
  
  if (error) {
    console.log('❌ Direct insert failed:', error.message)
    console.log('Error details:', JSON.stringify(error, null, 2))
    console.log('\nThis means the RLS policy is blocking inserts!')
    console.log('The trigger tries to insert but RLS blocks it.')
  } else {
    console.log('✅ Direct insert worked!')
    console.log('Data:', data)
    
    // Clean up
    await supabase.from('users').delete().eq('id', testId)
  }
}

testDirectInsert()
