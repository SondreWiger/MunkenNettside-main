-- Add admin UUID expiration field
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS admin_uuid_expires_at TIMESTAMPTZ;

-- Set expiration for existing admin UUIDs (24 hours from now)
UPDATE public.users 
SET admin_uuid_expires_at = NOW() + INTERVAL '24 hours'
WHERE admin_uuid IS NOT NULL 
  AND admin_uuid_expires_at IS NULL;