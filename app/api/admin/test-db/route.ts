import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    console.log('Testing current users table structure...')
    
    // Test if the columns exist by trying to select them
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id, full_name, email, actor_id, profile_slug')
      .limit(1)
      
    if (testError && testError.message.includes('actor_id')) {
      console.log('actor_id column is missing, need to add it')
      
      // For now, let's just update the API to not use the missing columns
      // and return a message to manually add them
      return NextResponse.json({ 
        error: 'Database migration required',
        message: 'The actor_id and profile_slug columns need to be added to the users table.',
        sql: `
-- Run this SQL in your Supabase SQL editor:
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.actors(id) ON DELETE SET NULL;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS profile_slug TEXT UNIQUE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_actor_id ON public.users(actor_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_slug ON public.users(profile_slug);
        `
      }, { status: 500 })
    }
    
    console.log('Database columns exist, testing query...')
    return NextResponse.json({ 
      message: 'Database columns are properly configured',
      testData 
    })

  } catch (error) {
    console.error('Migration test error:', error)
    return NextResponse.json({ error: 'Failed to test database' }, { status: 500 })
  }
}