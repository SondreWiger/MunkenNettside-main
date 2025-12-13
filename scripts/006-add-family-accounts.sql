-- =============================================
-- MIGRATION: Add Family Account Support
-- This migration adds family account fields and creates the family_connections table
-- =============================================

-- 1. Add family account fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'standalone' 
  CHECK (account_type IN ('standalone', 'parent', 'kid')),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS family_connection_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS family_code_expires_at TIMESTAMPTZ;

-- 2. Create family_connections table
CREATE TABLE IF NOT EXISTS public.family_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'removed')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parent_id, child_id),
  CHECK (parent_id != child_id)
);

-- 3. Create indexes for family_connections
CREATE INDEX IF NOT EXISTS idx_family_connections_parent ON public.family_connections(parent_id);
CREATE INDEX IF NOT EXISTS idx_family_connections_child ON public.family_connections(child_id);

-- 4. Update ensemble_enrollments to support parent-registered children
ALTER TABLE public.ensemble_enrollments
ADD COLUMN IF NOT EXISTS registered_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 5. Update trigger for family_connections table
DROP TRIGGER IF EXISTS update_family_connections_updated_at ON public.family_connections;
CREATE TRIGGER update_family_connections_updated_at 
  BEFORE UPDATE ON public.family_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable RLS on family_connections table
ALTER TABLE public.family_connections ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for family_connections
DROP POLICY IF EXISTS "Users can view own family connections" ON public.family_connections;
CREATE POLICY "Users can view own family connections" ON public.family_connections
  FOR SELECT USING (auth.uid() = parent_id OR auth.uid() = child_id);

DROP POLICY IF EXISTS "Users can create family connections" ON public.family_connections;
CREATE POLICY "Users can create family connections" ON public.family_connections
  FOR INSERT WITH CHECK (auth.uid() = child_id);

DROP POLICY IF EXISTS "Users can update own family connections" ON public.family_connections;
CREATE POLICY "Users can update own family connections" ON public.family_connections
  FOR UPDATE USING (auth.uid() = parent_id OR auth.uid() = child_id);

DROP POLICY IF EXISTS "Users can delete own family connections" ON public.family_connections;
CREATE POLICY "Users can delete own family connections" ON public.family_connections
  FOR DELETE USING (auth.uid() = parent_id OR auth.uid() = child_id);

DROP POLICY IF EXISTS "Admins can manage family connections" ON public.family_connections;
CREATE POLICY "Admins can manage family connections" ON public.family_connections
  FOR ALL USING (is_admin());

-- 8. Add RLS policy for parents to view connected children's profiles
DROP POLICY IF EXISTS "Parents can view connected children profiles" ON public.users;
CREATE POLICY "Parents can view connected children profiles" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_connections 
      WHERE family_connections.parent_id = auth.uid() 
      AND family_connections.child_id = users.id
      AND family_connections.status = 'active'
    )
  );
