-- Fix the foreign key constraint to be DEFERRABLE
-- This allows the trigger to insert into users table while auth.users insert is still in progress

-- Drop the existing constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Re-add it as DEFERRABLE INITIALLY DEFERRED
ALTER TABLE public.users 
  ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) 
  ON DELETE CASCADE 
  DEFERRABLE INITIALLY DEFERRED;
