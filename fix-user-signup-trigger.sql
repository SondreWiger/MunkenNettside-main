-- Fix handle_new_user() function to support account_type and date_of_birth
-- This resolves the 500 error during user signup
-- RUN THIS IN SUPABASE SQL EDITOR

-- Step 1: Drop the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Create a simple, bulletproof trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug TEXT;
  v_account_type TEXT;
  v_dob TEXT;
BEGIN
  -- Simple slug generation with fallback
  v_slug := LOWER(REGEXP_REPLACE(
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'user'),
    '[^a-z0-9]+', '-', 'g'
  ));
  
  -- Ensure slug is not empty
  IF v_slug = '' OR v_slug IS NULL THEN
    v_slug := 'user-' || substring(NEW.id::text from 1 for 8);
  END IF;
  
  -- Make slug unique
  IF EXISTS (SELECT 1 FROM public.users WHERE profile_slug = v_slug) THEN
    v_slug := v_slug || '-' || substring(NEW.id::text from 1 for 8);
  END IF;

  -- Validate account type
  v_account_type := NEW.raw_user_meta_data->>'account_type';
  IF v_account_type NOT IN ('standalone', 'parent', 'kid') THEN
    v_account_type := 'standalone';
  END IF;

  -- Get date of birth as text (safely)
  v_dob := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'date_of_birth', '')), '');

  -- Insert into users table
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    role,
    profile_slug,
    account_type,
    date_of_birth
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),
    'customer',
    v_slug,
    COALESCE(v_account_type, 'standalone'),
    CASE 
      WHEN v_dob IS NOT NULL AND v_dob ~ '^\d{4}-\d{2}-\d{2}$' 
      THEN v_dob::DATE 
      ELSE NULL 
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block user creation if this fails
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Step 3: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
