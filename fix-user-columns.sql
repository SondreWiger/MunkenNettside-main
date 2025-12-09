-- Add missing columns to users table for user-actor linking
-- This fixes the "Could not find a relationship between 'users' and 'actor_id'" error

-- Add actor_id column (foreign key to actors table)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'actor_id') THEN
        ALTER TABLE public.users ADD COLUMN actor_id UUID REFERENCES public.actors(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add profile_slug column (for custom user profile URLs)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'profile_slug') THEN
        ALTER TABLE public.users ADD COLUMN profile_slug TEXT UNIQUE;
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('actor_id', 'profile_slug')
ORDER BY column_name;