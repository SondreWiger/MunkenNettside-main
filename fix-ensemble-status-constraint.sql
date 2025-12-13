-- =============================================
-- FIX: Ensemble Enrollments Status Constraint
-- =============================================
-- This fixes the CHECK constraint on ensemble_enrollments.status
-- to include 'payment_pending' and 'confirmed' values

-- Drop the old constraint if it exists
ALTER TABLE public.ensemble_enrollments DROP CONSTRAINT IF EXISTS ensemble_enrollments_status_check;

-- Add the correct constraint with all valid status values
ALTER TABLE public.ensemble_enrollments ADD CONSTRAINT ensemble_enrollments_status_check 
  CHECK (status IN ('pending', 'yellow', 'blue', 'rejected', 'payment_pending', 'confirmed'));
