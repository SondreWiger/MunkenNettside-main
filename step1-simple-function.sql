-- Step 1: Just create the function (simplest version)
CREATE OR REPLACE FUNCTION generate_user_slug(p_full_name TEXT, p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN 'bruker-' || REPLACE(p_user_id::text, '-', '');
END;
$$ LANGUAGE plpgsql;