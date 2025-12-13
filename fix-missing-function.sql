-- STEP 1: Drop existing trigger first (run this alone)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- STEP 2: Drop existing function if it exists (run this alone)
DROP FUNCTION IF EXISTS generate_user_slug(TEXT, UUID);
DROP FUNCTION IF EXISTS generate_user_slug(TEXT, TEXT);
DROP FUNCTION IF EXISTS handle_new_user();

-- STEP 3: Create the generate_user_slug function (run this alone)
CREATE OR REPLACE FUNCTION generate_user_slug(p_full_name TEXT, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug from full name
  base_slug := LOWER(REGEXP_REPLACE(TRIM(COALESCE(p_full_name, 'bruker')), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := REGEXP_REPLACE(base_slug, '^-+|-+$', '', 'g');
  
  -- If empty, use user ID
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'bruker';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS(SELECT 1 FROM public.users WHERE profile_slug = final_slug AND id != p_user_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Create the trigger function (run this alone)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_slug TEXT;
BEGIN
  -- Generate slug using the helper function
  user_slug := generate_user_slug(
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'bruker'),
    NEW.id
  );

  INSERT INTO public.users (id, email, full_name, phone, role, profile_slug)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Ukjent'),
    NEW.raw_user_meta_data->>'phone',
    'customer',
    user_slug
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    profile_slug = EXCLUDED.profile_slug;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Create the trigger (run this alone)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- STEP 6: Fix RLS policies (run this alone)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;

CREATE POLICY "Public profiles are viewable by everyone" ON users
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow user creation during signup" ON users
  FOR INSERT WITH CHECK (true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;