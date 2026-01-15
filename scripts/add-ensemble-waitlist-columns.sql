-- Add waitlist and capacity management columns to ensembles table
-- Run this migration to add support for ensemble capacity limits and waitlists

ALTER TABLE public.ensembles 
ADD COLUMN IF NOT EXISTS max_actors INTEGER,
ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS auto_accept_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.ensembles.max_actors IS 'Maximum number of actors allowed (NULL = unlimited)';
COMMENT ON COLUMN public.ensembles.waitlist_enabled IS 'Enable waitlist when ensemble is full';
COMMENT ON COLUMN public.ensembles.auto_accept_enabled IS 'Auto-accept enrollments when there''s space';
COMMENT ON COLUMN public.ensembles.archived IS 'Archive ensemble instead of deleting';
