-- Add enrollment permission controls for family accounts
-- Parents can control whether children can enroll directly or need approval

-- Add permission column to family_connections
ALTER TABLE public.family_connections 
ADD COLUMN IF NOT EXISTS enrollment_permission TEXT NOT NULL DEFAULT 'request' 
CHECK (enrollment_permission IN ('blocked', 'request', 'allowed'));

-- Create enrollment requests table
CREATE TABLE IF NOT EXISTS public.enrollment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ensemble_id UUID NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  request_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, ensemble_id, parent_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_child ON public.enrollment_requests(child_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_parent ON public.enrollment_requests(parent_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_ensemble ON public.enrollment_requests(ensemble_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_status ON public.enrollment_requests(status);

-- RLS
ALTER TABLE public.enrollment_requests ENABLE ROW LEVEL SECURITY;

-- Parents can view requests for their children
DROP POLICY IF EXISTS "Parents can view enrollment requests" ON public.enrollment_requests;
CREATE POLICY "Parents can view enrollment requests" ON public.enrollment_requests
  FOR SELECT USING (
    parent_id = auth.uid() OR child_id = auth.uid()
  );

-- Children can create enrollment requests
DROP POLICY IF EXISTS "Children can create enrollment requests" ON public.enrollment_requests;
CREATE POLICY "Children can create enrollment requests" ON public.enrollment_requests
  FOR INSERT WITH CHECK (child_id = auth.uid());

-- Parents can update (approve/reject) their children's requests
DROP POLICY IF EXISTS "Parents can update enrollment requests" ON public.enrollment_requests;
CREATE POLICY "Parents can update enrollment requests" ON public.enrollment_requests
  FOR UPDATE USING (parent_id = auth.uid());

-- Admins can manage all requests
DROP POLICY IF EXISTS "Admins can manage enrollment requests" ON public.enrollment_requests;
CREATE POLICY "Admins can manage enrollment requests" ON public.enrollment_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_enrollment_requests_updated_at ON public.enrollment_requests;
CREATE TRIGGER update_enrollment_requests_updated_at 
  BEFORE UPDATE ON public.enrollment_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
