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

async function fixTrigger() {
  console.log('Applying trigger fix to Supabase...\n')
  
  // Read the SQL file
  const sql = readFileSync('scripts/enable-user-trigger.sql', 'utf8')
  
  console.log('SQL to execute:')
  console.log(sql)
  console.log('\n')
  
  // Execute the SQL using the REST API directly
  const response = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    }
  )
  
  const result = await response.text()
  console.log('Response status:', response.status)
  console.log('Response:', result)
  
  if (!response.ok) {
    console.log('\n❌ Failed to apply trigger via API')
    console.log('\nPlease apply manually in Supabase dashboard:')
    console.log('1. Go to: https://supabase.com/dashboard/project/avtlhezgsxjzvnrnagyw/sql')
    console.log('2. Click "New query"')
    console.log('3. Paste this SQL:\n')
    console.log(sql)
    console.log('\n4. Click "Run"')
  } else {
    console.log('\n✅ Trigger applied successfully!')
    
    // Test signup again
    console.log('\nTesting signup...')
    const testEmail = `test_${Date.now()}@example.com`
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpassword123',
      options: {
        data: {
          full_name: 'Test User',
          phone: '+4712345678'
        }
      }
    })
    
    if (error) {
      console.log('❌ Still failing:', error.message)
    } else {
      console.log('✅ Signup works now!')
    }
  }
}

fixTrigger()
