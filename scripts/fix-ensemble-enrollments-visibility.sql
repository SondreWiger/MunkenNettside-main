-- Fix ensemble_enrollments RLS to allow public viewing
-- This allows anyone to see ensemble enrollments for users with public profiles

DROP POLICY IF EXISTS "Public can view ensemble enrollments for public profiles" ON public.ensemble_enrollments;

CREATE POLICY "Public can view ensemble enrollments for public profiles" ON public.ensemble_enrollments
  FOR SELECT USING (
    -- Allow if the user's profile is public
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = ensemble_enrollments.user_id 
      AND users.is_public = true
    )
  );

-- Note: This policy works alongside the existing policies:
-- 1. Users can still view their own enrollments (even if profile is private)
-- 2. Admins can still view all enrollments
-- 3. Now everyone can view enrollments for users with public profiles
