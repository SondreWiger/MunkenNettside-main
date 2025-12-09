-- STEP 1: Create the handle_new_user function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_slug TEXT;
BEGIN
  -- Generate a simple slug
  user_slug := LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', 'bruker'), ' ', '-'));
  
  -- If slug is empty, use a default
  IF user_slug = '' OR user_slug IS NULL THEN
    user_slug := 'bruker-' || EXTRACT(epoch FROM NOW())::integer;
  END IF;
  
  -- Make it unique by adding a timestamp if needed
  IF EXISTS(SELECT 1 FROM public.users WHERE profile_slug = user_slug) THEN
    user_slug := user_slug || '-' || EXTRACT(epoch FROM NOW())::integer;
  END IF;

  -- Insert with error handling
  BEGIN
    INSERT INTO public.users (id, email, full_name, phone, role, profile_slug)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Ukjent'),
      NEW.raw_user_meta_data->>'phone',
      'customer',
      user_slug
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    -- Don't fail the trigger, just log the error
  END;
  
  RETURN NEW;
END;
$$;

-- STEP 2: Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
