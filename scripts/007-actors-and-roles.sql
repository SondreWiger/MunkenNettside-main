-- =============================================
-- ACTORS AND ROLES ENHANCEMENT
-- Add actors table and update ensemble cast structure
-- =============================================

-- Create actors table to store reusable actor profiles
CREATE TABLE IF NOT EXISTS public.actors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  birth_date DATE,
  contact_email TEXT,
  contact_phone TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Link to user account
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name) -- Ensure unique actor names for auto-complete
);

-- Create roles table to store character definitions
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ensemble_id UUID NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL, -- Character name in the play
  description TEXT,
  importance TEXT DEFAULT 'supporting' CHECK (importance IN ('lead', 'supporting', 'ensemble')),
  yellow_actor_id UUID REFERENCES public.actors(id) ON DELETE SET NULL,
  blue_actor_id UUID REFERENCES public.actors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ensemble_id, character_name) -- Unique character names per ensemble
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_actors_name ON public.actors(name);
CREATE INDEX IF NOT EXISTS idx_actors_user_id ON public.actors(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_ensemble_id ON public.roles(ensemble_id);
CREATE INDEX IF NOT EXISTS idx_roles_yellow_actor ON public.roles(yellow_actor_id);
CREATE INDEX IF NOT EXISTS idx_roles_blue_actor ON public.roles(blue_actor_id);

-- Row Level Security
ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for actors
DROP POLICY IF EXISTS "Anyone can view actors" ON public.actors;
CREATE POLICY "Anyone can view actors" ON public.actors
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage actors" ON public.actors;
CREATE POLICY "Admins can manage actors" ON public.actors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for roles
DROP POLICY IF EXISTS "Anyone can view roles" ON public.roles;
CREATE POLICY "Anyone can view roles" ON public.roles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;
CREATE POLICY "Admins can manage roles" ON public.roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_actors_updated_at ON public.actors;
CREATE TRIGGER update_actors_updated_at 
  BEFORE UPDATE ON public.actors 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON public.roles;
CREATE TRIGGER update_roles_updated_at 
  BEFORE UPDATE ON public.roles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();