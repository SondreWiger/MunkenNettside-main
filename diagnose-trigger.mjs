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

async function checkDatabase() {
  console.log('Checking database state...\n')
  
  // Check if users table exists
  const { data: usersTable, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(1)
  
  if (usersError) {
    console.log('❌ Users table check failed:', usersError.message)
  } else {
    console.log('✅ Users table exists')
  }
  
  // Try to create a user in auth.users directly using admin API
  console.log('\nAttempting to create test user...')
  const testEmail = `test_${Date.now()}@example.com`
  
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'testpassword123',
    email_confirm: true,
    user_metadata: {
      full_name: 'Test User',
      phone: '+4712345678'
    }
  })
  
  if (authError) {
    console.log('❌ Failed to create user:', authError.message)
  } else {
    console.log('✅ Auth user created:', authData.user.id)
    
    // Wait a bit for trigger
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Check if profile was auto-created
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()
    
    if (profileError) {
      console.log('❌ Profile was NOT auto-created by trigger')
      console.log('   Error:', profileError.message)
      console.log('\n🔧 Creating profile manually to test...')
      
      // Try to create manually
      const { data: manualProfile, error: manualError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name: authData.user.user_metadata.full_name || 'Test User',
          phone: authData.user.user_metadata.phone || null,
          role: 'customer',
          profile_slug: `test-${Date.now()}`
        })
        .select()
        .single()
      
      if (manualError) {
        console.log('❌ Manual profile creation also failed:', manualError.message)
        console.log('   This indicates a deeper issue with the users table or RLS policies')
      } else {
        console.log('✅ Manual profile creation worked!')
        console.log('   Issue: Trigger is not firing automatically')
      }
    } else {
      console.log('✅ Profile was auto-created by trigger!')
      console.log('   Profile:', profile)
    }
    
    // Cleanup
    await supabase.auth.admin.deleteUser(authData.user.id)
  }
  
  console.log('\n\n📋 DIAGNOSIS:')
  console.log('If profile was NOT auto-created, the trigger is not working.')
  console.log('This could mean:')
  console.log('1. The trigger was not created successfully')
  console.log('2. The handle_new_user function does not exist')
  console.log('3. The function has an error in it')
  console.log('\nNext step: Run the COMPLETE setup SQL from scripts/000-complete-setup.sql')
}

checkDatabase()
