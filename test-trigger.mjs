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
  env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTrigger() {
  console.log('Checking if trigger exists...\n')
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        tgname as trigger_name,
        tgenabled as enabled
      FROM pg_trigger
      WHERE tgname = 'on_auth_user_created';
    `
  }).single()

  if (error) {
    console.log('Checking trigger directly...')
    // Try direct query
    const { data: triggers, error: err2 } = await supabase
      .from('pg_trigger')
      .select('tgname, tgenabled')
      .eq('tgname', 'on_auth_user_created')
    
    if (err2) {
      console.log('Cannot query pg_trigger table. Need to check manually.')
      console.log('Error:', err2.message)
    } else {
      console.log('Triggers:', triggers)
    }
  } else {
    console.log('Trigger status:', data)
  }

  // Check if handle_new_user function exists
  console.log('\nChecking if handle_new_user function exists...\n')
  
  const { data: funcData, error: funcError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT proname, prosrc 
        FROM pg_proc 
        WHERE proname = 'handle_new_user';
      `
    })

  if (funcError) {
    console.log('Cannot check function. Error:', funcError.message)
  } else {
    console.log('Function exists:', funcData ? 'YES' : 'NO')
  }

  // Try to test signup
  console.log('\n\nTesting actual signup...\n')
  
  const testEmail = `test_${Date.now()}@example.com`
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: testEmail,
    password: 'testpassword123',
    options: {
      data: {
        full_name: 'Test User',
        phone: '+4712345678'
      }
    }
  })

  if (signupError) {
    console.log('❌ Signup Error:', signupError.message)
    console.log('Full error:', JSON.stringify(signupError, null, 2))
  } else {
    console.log('✅ Signup successful!')
    console.log('User ID:', signupData.user?.id)
    
    // Check if user profile was created
    if (signupData.user?.id) {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', signupData.user.id)
        .single()

      if (profileError) {
        console.log('❌ Profile NOT created:', profileError.message)
      } else {
        console.log('✅ Profile created successfully:', profile)
      }
    }
  }
}

checkTrigger()
