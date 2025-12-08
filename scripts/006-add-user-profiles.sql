-- Add slug and bio fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS bio_short TEXT,
ADD COLUMN IF NOT EXISTS bio_long TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_users_slug ON public.users(slug);

-- Function to generate unique slug from full_name
CREATE OR REPLACE FUNCTION generate_user_slug(p_full_name TEXT, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_base_slug TEXT;
  v_slug TEXT;
  v_counter INT := 1;
BEGIN
  -- Convert name to slug format (lowercase, hyphens, no special chars)
  v_base_slug := LOWER(TRIM(p_full_name));
  v_base_slug := REGEXP_REPLACE(v_base_slug, '\s+', '-', 'g');
  v_base_slug := REGEXP_REPLACE(v_base_slug, '[^a-z0-9-]', '', 'g');
  v_base_slug := REGEXP_REPLACE(v_base_slug, '-+', '-', 'g');
  
  v_slug := v_base_slug;
  
  -- Check if slug already exists and add counter if needed
  WHILE EXISTS (SELECT 1 FROM public.users WHERE slug = v_slug AND id != p_user_id) LOOP
    v_slug := v_base_slug || '-' || v_counter;
    v_counter := v_counter + 1;
  END LOOP;
  
  RETURN v_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate slug on insert/update
DROP TRIGGER IF EXISTS on_users_slug_generated ON public.users;
DROP FUNCTION IF EXISTS set_user_slug();

CREATE OR REPLACE FUNCTION set_user_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_user_slug(NEW.full_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_users_slug_generated
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION set_user_slug();
