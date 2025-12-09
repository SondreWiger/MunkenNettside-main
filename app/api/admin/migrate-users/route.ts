import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // Add actor_id and profile_slug columns to users table if they don't exist
    const alterUsersSQL = `
      DO $$ 
      BEGIN
        -- Add actor_id column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'actor_id'
        ) THEN
          ALTER TABLE public.users 
          ADD COLUMN actor_id UUID REFERENCES public.actors(id) ON DELETE SET NULL;
        END IF;
        
        -- Add profile_slug column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'profile_slug'
        ) THEN
          ALTER TABLE public.users 
          ADD COLUMN profile_slug TEXT UNIQUE;
        END IF;
      END $$;
    `

    // Execute the migration using a raw query
    const { error } = await supabase.from('_migration_temp').select('id').limit(1)
    
    // Since we can't execute raw SQL directly, let's use the admin client to run this migration
    // We'll need to do this through a Supabase SQL query directly
    
    return NextResponse.json({ 
      message: 'Migration SQL prepared. Please run this in your Supabase SQL editor:',
      sql: alterUsersSQL 
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Failed to run migration' }, { status: 500 })
  }
}