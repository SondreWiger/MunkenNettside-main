import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Read .env.local file manually
const envContent = fs.readFileSync('.env', 'utf-8')
const envLines = envContent.split('\n')
const env = {}
envLines.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addColumn() {
  console.log('Checking if notification_read column exists...')
  
  // Check if column exists
  const { data: columns, error: checkError } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'ensemble_enrollments')
    .eq('column_name', 'notification_read')

  if (checkError) {
    console.error('Error checking column:', checkError)
  }

  if (columns && columns.length > 0) {
    console.log('✓ notification_read column already exists')
    process.exit(0)
  }

  console.log('Adding notification_read column...')
  
  // Add the column using raw SQL query
  const { error } = await supabase.rpc('exec', {
    query: 'ALTER TABLE public.ensemble_enrollments ADD COLUMN notification_read BOOLEAN DEFAULT FALSE;'
  })

  if (error) {
    console.error('Error adding column:', error)
    console.log('\nPlease run this SQL manually in Supabase SQL Editor:')
    console.log('ALTER TABLE public.ensemble_enrollments ADD COLUMN notification_read BOOLEAN DEFAULT FALSE;')
    process.exit(1)
  }

  console.log('✓ Success! Column added.')
}

addColumn()
