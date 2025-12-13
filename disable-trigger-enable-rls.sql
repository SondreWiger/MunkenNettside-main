-- DISABLE the trigger completely to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- DISABLE RLS temporarily on users table to allow inserts
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with a simple policy that allows everything for now
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON users;
CREATE POLICY "Allow all operations" ON users
  FOR ALL USING (true) WITH CHECK (true);