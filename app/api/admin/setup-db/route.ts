import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // First, check if actors table exists
    const { data: actorsTableCheck } = await supabase
      .from('actors')
      .select('id')
      .limit(1)

    if (actorsTableCheck !== null) {
      return NextResponse.json({ message: 'Tables already exist' })
    }

    // Create the tables using SQL
    const createActorsSQL = `
      CREATE TABLE IF NOT EXISTS public.actors (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        bio TEXT,
        photo_url TEXT,
        birth_date DATE,
        contact_email TEXT,
        contact_phone TEXT,
        user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `
    
    const createRolesSQL = `
      CREATE TABLE IF NOT EXISTS public.roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        ensemble_id UUID NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
        character_name TEXT NOT NULL,
        description TEXT,
        importance TEXT DEFAULT 'supporting' CHECK (importance IN ('lead', 'supporting', 'ensemble')),
        yellow_actor_id UUID REFERENCES public.actors(id) ON DELETE SET NULL,
        blue_actor_id UUID REFERENCES public.actors(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(ensemble_id, character_name)
      );
    `

    // Execute SQL using rpc (if available) or raw SQL
    const { error: actorsError } = await supabase.rpc('exec_sql', { 
      sql: createActorsSQL 
    })
    
    const { error: rolesError } = await supabase.rpc('exec_sql', { 
      sql: createRolesSQL 
    })

    if (actorsError || rolesError) {
      console.error('SQL execution errors:', { actorsError, rolesError })
      return NextResponse.json({ 
        error: 'Failed to create tables',
        details: { actorsError: actorsError?.message, rolesError: rolesError?.message }
      }, { status: 500 })
    }

    return NextResponse.json({ message: 'Tables created successfully' })

  } catch (error) {
    console.error('Database setup error:', error)
    return NextResponse.json({ error: 'Failed to setup database' }, { status: 500 })
  }
}