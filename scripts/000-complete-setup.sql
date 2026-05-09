-- =========================================================================================================-- TEATERET PLATFORM - COMPLETE DATABASE SETUP=-- This single script creates the entire database schema, RLS policies, functions, indexes, and seed data
-- Version 1.0 - December 2024
-- ========================================================================================================

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================
-- 1. USERS TABLE (extends Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin', 'superadmin')),
  actor_id UUID, -- Will be linked to actors table later
  profile_slug TEXT UNIQUE,
  bio TEXT,
  bio_short TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,
  banner_url TEXT, -- User's custom banner image
  profile_tint TEXT DEFAULT '#6366f1', -- Hex color for profile customization
  banner_style TEXT DEFAULT 'gradient' CHECK (banner_style IN ('gradient', 'solid', 'image', 'pattern')),
  theme_preference TEXT DEFAULT 'default' CHECK (theme_preference IN ('default', 'minimal', 'vibrant', 'dark', 'light')),
  profile_border_color TEXT DEFAULT '#e5e7eb',
  profile_text_color TEXT DEFAULT '#000000',
  custom_css TEXT, -- Allow advanced users to add custom CSS
  website_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  github_url TEXT,
  youtube_url TEXT,
  tiktok_url TEXT,
  location TEXT,
  occupation TEXT,
  favorite_quote TEXT,
  interests TEXT[], -- Array of interests/hobbies
  skills TEXT[], -- Array of skills
  languages_spoken TEXT[], -- Languages the user speaks
  achievements JSONB DEFAULT '[]'::jsonb, -- Array of achievement objects
  is_public BOOLEAN DEFAULT false,
  show_email BOOLEAN DEFAULT false,
  show_phone BOOLEAN DEFAULT false,
  show_social_links BOOLEAN DEFAULT true,
  show_achievements BOOLEAN DEFAULT true,
  show_featured_roles BOOLEAN DEFAULT true,
  paypal_email TEXT, -- Connected PayPal account email
  paypal_payer_id TEXT, -- PayPal payer ID for billing agreements
  paypal_connected_at TIMESTAMPTZ, -- When PayPal was connected
  -- Family account fields
  account_type TEXT NOT NULL DEFAULT 'standalone' CHECK (account_type IN ('standalone', 'parent', 'kid')),
  date_of_birth DATE, -- Required for kid accounts
  family_connection_code TEXT UNIQUE, -- 8-char code for connecting family accounts
  family_code_expires_at TIMESTAMPTZ, -- When the connection code expires
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin onboarding columns
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS admin_uuid UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS admin_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_uuid_created_at TIMESTAMPTZ;


-- =============================================
-- 1B. FAMILY CONNECTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.family_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'removed')),
  enrollment_permission TEXT NOT NULL DEFAULT 'request' CHECK (enrollment_permission IN ('blocked', 'request', 'allowed')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parent_id, child_id),
  CHECK (parent_id != child_id)
);

CREATE INDEX IF NOT EXISTS idx_family_connections_parent ON public.family_connections(parent_id);
CREATE INDEX IF NOT EXISTS idx_family_connections_child ON public.family_connections(child_id);


-- =============================================
-- 1C. ENROLLMENT REQUESTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.enrollment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ensemble_id UUID NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  request_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, ensemble_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollment_requests_child ON public.enrollment_requests(child_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_parent ON public.enrollment_requests(parent_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_ensemble ON public.enrollment_requests(ensemble_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_status ON public.enrollment_requests(status);

-- =============================================
-- ADMIN VERIFICATIONS TABLE
-- Used for admin onboarding: stores verification codes sent to admin users
-- =============================================
CREATE TABLE IF NOT EXISTS public.admin_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_verifications_user ON public.admin_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_verifications_code ON public.admin_verifications(code);

-- Add QR/token and metadata columns for enhanced admin verification flows
ALTER TABLE IF EXISTS public.admin_verifications
  ADD COLUMN IF NOT EXISTS qr_token TEXT,
  ADD COLUMN IF NOT EXISTS qr_scanned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS code_type TEXT DEFAULT 'numeric' CHECK (code_type IN ('numeric','alphanumeric')),
  ADD COLUMN IF NOT EXISTS code_length INTEGER DEFAULT 6,
  ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_admin_verifications_qr_token ON public.admin_verifications(qr_token);

-- Make code column nullable to support QR-first verification flows where code is
-- generated only after QR scan.
ALTER TABLE IF EXISTS public.admin_verifications ALTER COLUMN code DROP NOT NULL;

-- =============================================
-- ADMIN DEVICE REGISTRATIONS (for QR-based device pairing)
-- =============================================
CREATE TABLE IF NOT EXISTS public.admin_device_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL,
  device_name TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  confirmed_device_token TEXT,
  confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_admin_device_registrations_token ON public.admin_device_registrations(token);

-- Add archive flags to ensembles and kurs so they can be shown in archive
ALTER TABLE IF EXISTS public.ensembles
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_ensembles_archived ON public.ensembles(archived);

ALTER TABLE IF EXISTS public.kurs
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_kurs_archived ON public.kurs(archived);

-- Link kurs to an actor profile (optional) so we can explicitly associate an instructor
ALTER TABLE IF EXISTS public.kurs
  ADD COLUMN IF NOT EXISTS instructor_actor_id UUID REFERENCES public.actors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_kurs_instructor_actor_id ON public.kurs(instructor_actor_id);

-- =============================================
-- BACKFILL: attempt to populate instructor_actor_id for existing kurs
-- This performs an exact, case-insensitive match between `actors.name` and `kurs.director`.
-- It is intentionally conservative: only updates rows where `instructor_actor_id` IS NULL.
-- Review the updates before running in production. If you prefer manual mapping, skip this block.
-- To run manually: wrap in a transaction or run selectively in staging first.
DO $$
BEGIN
  -- Update kurs where director matches an actor's name (case-insensitive exact match)
  UPDATE public.kurs k
  SET instructor_actor_id = a.id
  FROM public.actors a
  WHERE k.instructor_actor_id IS NULL
    AND a.name IS NOT NULL
    AND k.director IS NOT NULL
    AND lower(trim(a.name)) = lower(trim(k.director));

  -- Optionally, you can log number of rows updated (client-side). This block leaves no explicit raises.
END$$;


-- =============================================
-- ADMIN DEVICES - trusted devices for admin users
-- =============================================
CREATE TABLE IF NOT EXISTS public.admin_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_token UUID NOT NULL UNIQUE,
  device_name TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  revoked BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_devices_token ON public.admin_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_admin_devices_user ON public.admin_devices(user_id);


-- =============================================
-- ADMIN ACTION LOGS (AUDIT)
-- Records administrative security-relevant events for auditing and rate-limiting
-- =============================================
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type TEXT NOT NULL, -- e.g., admin_code_sent, admin_code_verified, admin_code_verify_failed, admin_uuid_created
  performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action ON public.admin_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_performed_by ON public.admin_action_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_target ON public.admin_action_logs(target_user_id);

-- RLS POLICIES - ADMIN VERIFICATIONS & ACTION LOGS
ALTER TABLE public.admin_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their verifications" ON public.admin_verifications;
CREATE POLICY "Users can manage their verifications" ON public.admin_verifications
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert their own admin action logs" ON public.admin_action_logs;
CREATE POLICY "Users can insert their own admin action logs" ON public.admin_action_logs
  FOR INSERT
  WITH CHECK (performed_by = auth.uid());

DROP POLICY IF EXISTS "Admins can view admin action logs" ON public.admin_action_logs;
CREATE POLICY "Admins can view admin action logs" ON public.admin_action_logs
  FOR SELECT
  USING (
    EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.role = 'superadmin' OR (u.role = 'admin' AND u.admin_verified = TRUE))
    ) OR performed_by = auth.uid()
  );

-- =============================================
-- ADMIN ROADMAP / TODOs
-- Stores admin-maintained roadmap items and progress notes. Admins can create/update/delete items;
-- staff may view them. Public viewing can be implemented via a server API that bypasses RLS (service role) if desired.
-- =============================================
CREATE TABLE IF NOT EXISTS public.admin_roadmap (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  notes TEXT,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  category TEXT,
  subcategory TEXT,
  due_date DATE,
  priority INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_roadmap_done ON public.admin_roadmap(done);
CREATE INDEX IF NOT EXISTS idx_admin_roadmap_priority ON public.admin_roadmap(priority);
CREATE INDEX IF NOT EXISTS idx_admin_roadmap_created_by ON public.admin_roadmap(created_by);
CREATE INDEX IF NOT EXISTS idx_admin_roadmap_category ON public.admin_roadmap(category);
CREATE INDEX IF NOT EXISTS idx_admin_roadmap_due_date ON public.admin_roadmap(due_date);

ALTER TABLE public.admin_roadmap ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage roadmap" ON public.admin_roadmap;
CREATE POLICY "Admins can manage roadmap" ON public.admin_roadmap
  FOR ALL
  USING (
    EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.role = 'superadmin' OR (u.role = 'admin' AND u.admin_verified = TRUE))
    )
  )
  WITH CHECK (
    EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.role = 'superadmin' OR (u.role = 'admin' AND u.admin_verified = TRUE))
    )
  );

DROP POLICY IF EXISTS "Staff can view roadmap" ON public.admin_roadmap;
CREATE POLICY "Staff can view roadmap" ON public.admin_roadmap
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'staff')
    )
  );

-- Seed a small curated list reflecting current state. Admins can add more via the admin UI.
INSERT INTO public.admin_roadmap (id, title, notes, done, priority, created_by, created_at)
VALUES
  (uuid_generate_v4(), 'Øvinger (sessions) med påmelding og adminstyring', 'Includes attendance and session manager UX', TRUE, 10, NULL, NOW()),
  (uuid_generate_v4(), 'Skuespiller-dashboard med garderobestørrelser og eksport', 'Actor-facing dashboard and export', TRUE, 9, NULL, NOW()),
  (uuid_generate_v4(), 'Admin-kan endre og lagre fargetema for hele plattformen', 'Live preview and persisted theme tokens', TRUE, 9, NULL, NOW()),
  (uuid_generate_v4(), 'Offentlig GET-endepunkt for tema-tokens', 'Allows client fallback to apply themes', TRUE, 8, NULL, NOW()),
  (uuid_generate_v4(), 'Client fallback for tema-tokens', 'Client-side component that fetches and applies tokens', TRUE, 8, NULL, NOW()),
  (uuid_generate_v4(), 'Forbedret session manager med banner og ansvarlig info', 'Improved admin session manager UI', TRUE, 7, NULL, NOW()),
  (uuid_generate_v4(), 'Skuespiller kan melde seg på øvinger', 'Attendance toggles and validations', TRUE, 7, NULL, NOW()),
  (uuid_generate_v4(), 'Integrer client-theme i layout slik at alle brukere får tema', 'ClientTheme mounted in layout', TRUE, 10, NULL, NOW()),
  (uuid_generate_v4(), 'Full repo linting and typecheck sweep', 'Many ESLint issues remain; follow-up required', FALSE, 2, NULL, NOW());

-- Add some categories/subcategories and due_dates to seeded roadmap items for better organization
UPDATE public.admin_roadmap SET category = 'Core', subcategory = 'Sessions', due_date = NULL WHERE title ILIKE '%Øvinger%';
UPDATE public.admin_roadmap SET category = 'Admin', subcategory = 'Dashboard', due_date = NULL WHERE title ILIKE '%Skuespiller-dashboard%';
UPDATE public.admin_roadmap SET category = 'Theme', subcategory = 'Tokens', due_date = NULL WHERE title ILIKE '%tema-tokens%';
UPDATE public.admin_roadmap SET category = 'Maintenance', subcategory = 'Lint/Types', due_date = (CURRENT_DATE + INTERVAL '14 days')::date WHERE title ILIKE '%linting%';


-- =============================================
-- ADMIN TIMELINE - historical events and releases
-- =============================================
CREATE TABLE IF NOT EXISTS public.admin_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  notes TEXT,
  event_type TEXT DEFAULT 'note' CHECK (event_type IN ('commit', 'update', 'system', 'meeting', 'release', 'note', 'other')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_timeline ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_admin_timeline_updated_at ON public.admin_timeline;
CREATE TRIGGER update_admin_timeline_updated_at BEFORE UPDATE ON public.admin_timeline FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_admin_timeline_occurred_at ON public.admin_timeline(occurred_at DESC);

ALTER TABLE public.admin_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage timeline" ON public.admin_timeline;
CREATE POLICY "Admins can manage timeline" ON public.admin_timeline
  FOR ALL
  USING (
    EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.role = 'superadmin' OR (u.role = 'admin' AND u.admin_verified = TRUE))
    )
  )
  WITH CHECK (
    EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.role = 'superadmin' OR (u.role = 'admin' AND u.admin_verified = TRUE))
    )
  );

DROP POLICY IF EXISTS "Staff can view timeline" ON public.admin_timeline;
CREATE POLICY "Staff can view timeline" ON public.admin_timeline
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'staff')
    )
  );

-- Seed a few timeline events
INSERT INTO public.admin_timeline (id, title, notes, event_type, occurred_at, created_by, created_at)
VALUES
  (uuid_generate_v4(), 'Initial site scaffolding and DB', 'Project setup and initial migrations', 'release', NOW() - INTERVAL '90 days', NULL, NOW() - INTERVAL '90 days'),
  (uuid_generate_v4(), 'Implemented theme tokens and client fallback', 'Admin can change and persist theme tokens; client applies tokens', 'update', NOW() - INTERVAL '30 days', NULL, NOW() - INTERVAL '30 days'),
  (uuid_generate_v4(), 'Added actor dashboard and exports', 'Actor-facing dashboard with exports and sizes', 'update', NOW() - INTERVAL '20 days', NULL, NOW() - INTERVAL '20 days')
ON CONFLICT DO NOTHING;


-- =============================================
-- PAYMENT TRANSACTIONS TABLE
-- Tracks payment processor transactions and reconciliation metadata
-- =============================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  processor TEXT NOT NULL, -- e.g. 'stripe', 'paypal'
  processor_id TEXT, -- processor transaction id / charge id
  amount_nok BIGINT NOT NULL, -- stored in øre
  currency TEXT DEFAULT 'NOK',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, refunded
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_purchase ON public.transactions(purchase_id);
CREATE INDEX IF NOT EXISTS idx_transactions_processor_id ON public.transactions(processor_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Transactions: users can insert their own" ON public.transactions;
CREATE POLICY "Transactions: users can insert their own" ON public.transactions
  FOR INSERT
  WITH CHECK (true);



-- =============================================
-- 2. ENSEMBLES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.ensembles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  director TEXT,
  stage TEXT NOT NULL DEFAULT 'Planlagt' CHECK (stage IN ('Planlagt', 'Påmelding', 'I produksjon', 'Arkviert')),
  yellow_team_name TEXT NOT NULL DEFAULT 'Gult lag',
  blue_team_name TEXT NOT NULL DEFAULT 'Blått lag',
  yellow_cast JSONB DEFAULT '[]'::jsonb,
  blue_cast JSONB DEFAULT '[]'::jsonb,
  crew JSONB DEFAULT '[]'::jsonb,
  genre TEXT[] DEFAULT '{}',
  duration_minutes INTEGER,
  year INTEGER,
  language TEXT DEFAULT 'Norsk',
  premiere_date DATE,
  age_rating TEXT,
  thumbnail_url TEXT,
  banner_url TEXT,
  hero_video_url TEXT,
  gallery_images JSONB DEFAULT '[]'::jsonb,
  trailer_url TEXT,
  synopsis_short TEXT,
  synopsis_long TEXT,
  awards JSONB DEFAULT '[]'::jsonb,
  press_quotes JSONB DEFAULT '[]'::jsonb,
  recording_price_nok DECIMAL(10,2) DEFAULT 0,
  participation_price_nok DECIMAL(10,2) DEFAULT 0, -- Price to join the ensemble
  default_ticket_price_nok DECIMAL(10,2) DEFAULT 250,
  is_published BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  custom_sections JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 3. RECORDINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ensemble_id UUID NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
  team TEXT NOT NULL CHECK (team IN ('yellow', 'blue')),
  recording_date DATE,
  jottacloud_embed_url TEXT,
  quality TEXT DEFAULT 'HD',
  duration INTEGER,
  thumbnail_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 4. PURCHASES TABLE (for recordings)
-- =============================================
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ensemble_id UUID NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
  recording_ids UUID[] DEFAULT '{}',
  vipps_order_id TEXT,
  amount_paid_nok DECIMAL(10,2) NOT NULL,
  discount_code TEXT,
  discount_code_used TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  access_granted_at TIMESTAMPTZ,
  access_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 5. VIDEO ACCESS TOKENS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.video_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 6. VENUES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  capacity INTEGER DEFAULT 0,
  seat_map_config JSONB DEFAULT '{}'::jsonb,
  amenities JSONB DEFAULT '[]'::jsonb,
  accessibility_info TEXT,
  parking_info TEXT,
  public_transport TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 7. KURS TABLE (experimental/smaller productions)
-- =============================================
CREATE TABLE IF NOT EXISTS public.kurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  director TEXT,
  participants JSONB DEFAULT '[]'::jsonb,
  genre TEXT[] DEFAULT '{}',
  duration_weeks INTEGER,
  level TEXT DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced', 'mixed')),
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  banner_url TEXT,
  gallery_images JSONB DEFAULT '[]'::jsonb,
  synopsis_short TEXT,
  synopsis_long TEXT,
  price_nok DECIMAL(10,2) DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 8. SERIES TABLE (for grouped shows)
-- =============================================
CREATE TABLE IF NOT EXISTS public.series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  shows_count INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 9. SHOWS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ensemble_id UUID REFERENCES public.ensembles(id) ON DELETE SET NULL,
  kurs_id UUID REFERENCES public.kurs(id) ON DELETE SET NULL,
  title TEXT,
  source_type TEXT NOT NULL DEFAULT 'ensemble' CHECK (source_type IN ('ensemble', 'kurs', 'standalone')),
  type TEXT NOT NULL DEFAULT 'ensemble_show' CHECK (type IN ('ensemble_show', 'standalone', 'kurs_session')),
  team TEXT CHECK (team IN ('yellow', 'blue')),
  show_datetime TIMESTAMPTZ NOT NULL,
  doors_open_time TIMESTAMPTZ,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  base_price_nok DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_tiers JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'on_sale', 'sold_out', 'cancelled', 'completed')),
  available_seats INTEGER DEFAULT 0,
  is_part_of_series BOOLEAN DEFAULT FALSE,
  series_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
  special_notes TEXT,
  age_restriction TEXT,
  duration_override INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add a flag to differentiate practice sessions (øving) from public performances
ALTER TABLE public.shows
  ADD COLUMN IF NOT EXISTS is_session BOOLEAN DEFAULT FALSE;


-- =============================================
-- 10. SEATS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.seats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  row TEXT NOT NULL,
  number INTEGER NOT NULL,
  price_tier TEXT,
  price_nok DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'blocked')),
  is_handicap_accessible BOOLEAN DEFAULT FALSE,
  reserved_until TIMESTAMPTZ,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(show_id, section, row, number)
);


-- =============================================
-- 11. BOOKINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  seat_ids JSONB DEFAULT '[]'::jsonb,
  vipps_order_id TEXT,
  total_amount_nok DECIMAL(10,2) NOT NULL DEFAULT 0,
  booking_reference TEXT NOT NULL UNIQUE,
  qr_code_data TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  discount_code_used TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'used', 'cancelled', 'refunded')),
  booked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  special_requests TEXT,
  ticket_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 11b. SHOW ATTENDANCES TABLE (øving deltakere)
-- =============================================
CREATE TABLE IF NOT EXISTS public.show_attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'not_attending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (show_id, user_id)
);



-- =============================================
-- 12. DISCOUNT CODES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value DECIMAL(10,2) NOT NULL,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  applicable_to TEXT NOT NULL DEFAULT 'both' CHECK (applicable_to IN ('recordings', 'shows', 'both')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================
-- 13. SITE SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);


-- =============================================
-- 14. KURS ENROLLMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.kurs_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kurs_id UUID NOT NULL REFERENCES public.kurs(id) ON DELETE CASCADE,
  vipps_order_id TEXT,
  amount_paid_nok DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
  enrollment_reference TEXT NOT NULL UNIQUE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, kurs_id)
);


-- =============================================
-- 15. ENSEMBLE ENROLLMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.ensemble_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ensemble_id UUID NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
  registered_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Parent who registered on behalf of child
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'yellow', 'blue', 'rejected', 'payment_pending')),
  role TEXT,
  vipps_order_id TEXT, -- Vipps payment reference
  amount_paid_nok DECIMAL(10,2), -- Amount paid for participation
  enrollment_reference TEXT UNIQUE, -- Unique reference for this enrollment
  notification_read BOOLEAN DEFAULT FALSE, -- Whether user has seen the status notification
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_completed_at TIMESTAMPTZ, -- When payment was confirmed
  reviewed_at TIMESTAMPTZ,
  reviewed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, ensemble_id)
);


-- =============================================
-- 16. ENSEMBLE TEAM MEMBERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.ensemble_team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ensemble_id UUID NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team TEXT NOT NULL CHECK (team IN ('yellow', 'blue')),
  role TEXT NOT NULL,
  position_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ensemble_id, user_id, team)
);


-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_ensembles_slug ON public.ensembles(slug);
CREATE INDEX IF NOT EXISTS idx_ensembles_is_published ON public.ensembles(is_published);
CREATE INDEX IF NOT EXISTS idx_ensembles_featured ON public.ensembles(featured);
CREATE INDEX IF NOT EXISTS idx_kurs_slug ON public.kurs(slug);
CREATE INDEX IF NOT EXISTS idx_kurs_is_published ON public.kurs(is_published);
CREATE INDEX IF NOT EXISTS idx_kurs_featured ON public.kurs(featured);
CREATE INDEX IF NOT EXISTS idx_recordings_ensemble_id ON public.recordings(ensemble_id);
CREATE INDEX IF NOT EXISTS idx_recordings_team ON public.recordings(team);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_discount_code ON public.purchases(discount_code_used);
CREATE INDEX IF NOT EXISTS idx_shows_ensemble_id ON public.shows(ensemble_id);
CREATE INDEX IF NOT EXISTS idx_shows_kurs_id ON public.shows(kurs_id);
CREATE INDEX IF NOT EXISTS idx_shows_venue_id ON public.shows(venue_id);
CREATE INDEX IF NOT EXISTS idx_shows_show_datetime ON public.shows(show_datetime);
CREATE INDEX IF NOT EXISTS idx_shows_status ON public.shows(status);
CREATE INDEX IF NOT EXISTS idx_seats_show_id ON public.seats(show_id);
CREATE INDEX IF NOT EXISTS idx_seats_status ON public.seats(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_show_id ON public.bookings(show_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_reference ON public.bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_discount_code ON public.bookings(discount_code_used);
CREATE INDEX IF NOT EXISTS idx_video_access_tokens_token ON public.video_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON public.discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_kurs_enrollments_user_id ON public.kurs_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_kurs_enrollments_kurs_id ON public.kurs_enrollments(kurs_id);
CREATE INDEX IF NOT EXISTS idx_kurs_enrollments_status ON public.kurs_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_kurs_enrollments_enrollment_reference ON public.kurs_enrollments(enrollment_reference);
CREATE INDEX IF NOT EXISTS idx_ensemble_enrollments_user_id ON public.ensemble_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_ensemble_enrollments_ensemble_id ON public.ensemble_enrollments(ensemble_id);
CREATE INDEX IF NOT EXISTS idx_ensemble_enrollments_status ON public.ensemble_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_ensemble_team_members_ensemble_id ON public.ensemble_team_members(ensemble_id);
CREATE INDEX IF NOT EXISTS idx_ensemble_team_members_user_id ON public.ensemble_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ensemble_team_members_team ON public.ensemble_team_members(team);


-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ensembles_updated_at ON public.ensembles;
CREATE TRIGGER update_ensembles_updated_at BEFORE UPDATE ON public.ensembles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kurs_updated_at ON public.kurs;
CREATE TRIGGER update_kurs_updated_at BEFORE UPDATE ON public.kurs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recordings_updated_at ON public.recordings;
CREATE TRIGGER update_recordings_updated_at BEFORE UPDATE ON public.recordings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchases_updated_at ON public.purchases;
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_venues_updated_at ON public.venues;
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_series_updated_at ON public.series;
CREATE TRIGGER update_series_updated_at BEFORE UPDATE ON public.series FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shows_updated_at ON public.shows;
CREATE TRIGGER update_shows_updated_at BEFORE UPDATE ON public.shows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_seats_updated_at ON public.seats;
CREATE TRIGGER update_seats_updated_at BEFORE UPDATE ON public.seats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_roadmap_updated_at ON public.admin_roadmap;
CREATE TRIGGER update_admin_roadmap_updated_at BEFORE UPDATE ON public.admin_roadmap FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_discount_codes_updated_at ON public.discount_codes;
CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON public.discount_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kurs_enrollments_updated_at ON public.kurs_enrollments;
CREATE TRIGGER update_kurs_enrollments_updated_at BEFORE UPDATE ON public.kurs_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================
-- ROW LEVEL SECURITY (RLS) - ENABLE ON ALL TABLES
-- =============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ensembles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kurs_enrollments ENABLE ROW LEVEL SECURITY;


-- =============================================
-- HELPER FUNCTIONS FOR RLS
-- =============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
  WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_user_slug(p_full_name TEXT, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug from full name
  base_slug := LOWER(REGEXP_REPLACE(TRIM(p_full_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := REGEXP_REPLACE(base_slug, '^-+|-+$', '', 'g');
  
  -- If empty, use user ID
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'bruker-' || REPLACE(p_user_id::text, '-', '')::text;
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS(SELECT 1 FROM public.users WHERE profile_slug = final_slug AND id != p_user_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_slug TEXT;
  v_account_type TEXT;
  v_date_of_birth DATE;
BEGIN
  -- Generate slug using the helper function
  BEGIN
    user_slug := generate_user_slug(
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'bruker'),
      NEW.id
    );
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to simple slug if generation fails
    user_slug := 'bruker-' || REPLACE(NEW.id::text, '-', '');
  END;

  -- Parse account type with validation
  v_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'standalone');
  IF v_account_type NOT IN ('standalone', 'parent', 'kid') THEN
    v_account_type := 'standalone';
  END IF;

  -- Parse date of birth safely
  BEGIN
    v_date_of_birth := (NEW.raw_user_meta_data->>'date_of_birth')::DATE;
  EXCEPTION WHEN OTHERS THEN
    v_date_of_birth := NULL;
  END;

  -- Insert user record
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Ukjent'),
    NEW.raw_user_meta_data->>'phone',
    'customer',
    user_slug,
    v_account_type,
    v_date_of_birth
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth.users insert
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- RLS POLICIES - USERS
-- =============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Allow insert on signup" ON public.users;
CREATE POLICY "Allow insert on signup" ON public.users
  FOR INSERT WITH CHECK (TRUE);


-- =============================================
-- RLS POLICIES - ENSEMBLES
-- =============================================
DROP POLICY IF EXISTS "Anyone can view published ensembles" ON public.ensembles;
CREATE POLICY "Anyone can view published ensembles" ON public.ensembles
  FOR SELECT USING (is_published = TRUE OR archived = TRUE);

DROP POLICY IF EXISTS "Admins can view all ensembles" ON public.ensembles;
CREATE POLICY "Admins can view all ensembles" ON public.ensembles
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert ensembles" ON public.ensembles;
CREATE POLICY "Admins can insert ensembles" ON public.ensembles
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update ensembles" ON public.ensembles;
CREATE POLICY "Admins can update ensembles" ON public.ensembles
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete ensembles" ON public.ensembles;
CREATE POLICY "Admins can delete ensembles" ON public.ensembles
  FOR DELETE USING (is_admin());


-- =============================================
-- RLS POLICIES - KURS
-- =============================================
DROP POLICY IF EXISTS "Anyone can view published kurs" ON public.kurs;
CREATE POLICY "Anyone can view published kurs" ON public.kurs
  FOR SELECT USING (is_published = TRUE OR archived = TRUE);

DROP POLICY IF EXISTS "Admins can view all kurs" ON public.kurs;
CREATE POLICY "Admins can view all kurs" ON public.kurs
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert kurs" ON public.kurs;
CREATE POLICY "Admins can insert kurs" ON public.kurs
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update kurs" ON public.kurs;
CREATE POLICY "Admins can update kurs" ON public.kurs
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete kurs" ON public.kurs;
CREATE POLICY "Admins can delete kurs" ON public.kurs
  FOR DELETE USING (is_admin());


-- =============================================
-- RLS POLICIES - RECORDINGS
-- =============================================
DROP POLICY IF EXISTS "Anyone can view recordings of published ensembles" ON public.recordings;
CREATE POLICY "Anyone can view recordings of published ensembles" ON public.recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ensembles 
      WHERE id = recordings.ensemble_id AND is_published = TRUE
    )
  );

DROP POLICY IF EXISTS "Admins can manage recordings" ON public.recordings;
CREATE POLICY "Admins can manage recordings" ON public.recordings
  FOR ALL USING (is_admin());


-- =============================================
-- RLS POLICIES - PURCHASES
-- =============================================
DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;
CREATE POLICY "Users can view own purchases" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own purchases" ON public.purchases;
CREATE POLICY "Users can insert own purchases" ON public.purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all purchases" ON public.purchases;
CREATE POLICY "Admins can view all purchases" ON public.purchases
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage purchases" ON public.purchases;
CREATE POLICY "Admins can manage purchases" ON public.purchases
  FOR ALL USING (is_admin());


-- =============================================
-- RLS POLICIES - VIDEO ACCESS TOKENS
-- =============================================
DROP POLICY IF EXISTS "Users can view own tokens" ON public.video_access_tokens;
CREATE POLICY "Users can view own tokens" ON public.video_access_tokens
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role only for token management" ON public.video_access_tokens;
CREATE POLICY "Service role only for token management" ON public.video_access_tokens
  FOR ALL USING (is_admin());


-- =============================================
-- RLS POLICIES - VENUES
-- =============================================
DROP POLICY IF EXISTS "Anyone can view venues" ON public.venues;
CREATE POLICY "Anyone can view venues" ON public.venues
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage venues" ON public.venues;
CREATE POLICY "Admins can manage venues" ON public.venues
  FOR ALL USING (is_admin());


-- =============================================
-- RLS POLICIES - SERIES
-- =============================================
DROP POLICY IF EXISTS "Anyone can view series" ON public.series;
CREATE POLICY "Anyone can view series" ON public.series
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage series" ON public.series;
CREATE POLICY "Admins can manage series" ON public.series
  FOR ALL USING (is_admin());


-- =============================================
-- RLS POLICIES - SHOWS
-- =============================================
DROP POLICY IF EXISTS "Anyone can view shows on sale or scheduled" ON public.shows;
CREATE POLICY "Anyone can view shows on sale or scheduled" ON public.shows
  FOR SELECT USING (status IN ('scheduled', 'on_sale', 'sold_out', 'completed'));

DROP POLICY IF EXISTS "Admins can manage shows" ON public.shows;
CREATE POLICY "Admins can manage shows" ON public.shows
  FOR ALL USING (is_admin());


-- =============================================
-- RLS POLICIES - SEATS
-- =============================================
DROP POLICY IF EXISTS "Anyone can view seats for active shows" ON public.seats;
CREATE POLICY "Anyone can view seats for active shows" ON public.seats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shows 
      WHERE id = seats.show_id AND status IN ('scheduled', 'on_sale')
    )
  );

DROP POLICY IF EXISTS "Admins can manage seats" ON public.seats;
CREATE POLICY "Admins can manage seats" ON public.seats
  FOR ALL USING (is_admin());


-- =============================================
-- RLS POLICIES - BOOKINGS
-- =============================================
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
CREATE POLICY "Users can insert own bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pending bookings" ON public.bookings;
CREATE POLICY "Users can update own pending bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins can manage bookings" ON public.bookings;
CREATE POLICY "Admins can manage bookings" ON public.bookings
  FOR ALL USING (is_admin());


-- =============================================
-- RLS POLICIES - DISCOUNT CODES
-- =============================================
DROP POLICY IF EXISTS "Anyone can view active discount codes" ON public.discount_codes;
CREATE POLICY "Anyone can view active discount codes" ON public.discount_codes
  FOR SELECT USING (
    (valid_from IS NULL OR valid_from <= NOW()) AND
    (valid_until IS NULL OR valid_until >= NOW()) AND
    (max_uses IS NULL OR current_uses < max_uses)
  );

DROP POLICY IF EXISTS "Admins can manage discount codes" ON public.discount_codes;
CREATE POLICY "Admins can manage discount codes" ON public.discount_codes
  FOR ALL USING (is_admin());


-- =============================================
-- RLS POLICIES - SITE SETTINGS
-- =============================================
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Anyone can view site settings" ON public.site_settings
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Admins can manage site settings" ON public.site_settings
  FOR ALL USING (is_admin());


-- =============================================
-- RLS POLICIES - KURS ENROLLMENTS
-- =============================================
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.kurs_enrollments;
CREATE POLICY "Users can view own enrollments" ON public.kurs_enrollments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own enrollments" ON public.kurs_enrollments;
CREATE POLICY "Users can insert own enrollments" ON public.kurs_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pending enrollments" ON public.kurs_enrollments;
CREATE POLICY "Users can update own pending enrollments" ON public.kurs_enrollments
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.kurs_enrollments;
CREATE POLICY "Admins can manage enrollments" ON public.kurs_enrollments
  FOR ALL USING (is_admin());


-- =============================================
-- RLS POLICIES - ENSEMBLE ENROLLMENTS
-- =============================================
ALTER TABLE public.ensemble_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ensemble enrollments" ON public.ensemble_enrollments;
CREATE POLICY "Users can view own ensemble enrollments" ON public.ensemble_enrollments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all ensemble enrollments" ON public.ensemble_enrollments;
CREATE POLICY "Admins can view all ensemble enrollments" ON public.ensemble_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
  WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Public can view ensemble enrollments for public profiles" ON public.ensemble_enrollments;
CREATE POLICY "Public can view ensemble enrollments for public profiles" ON public.ensemble_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = ensemble_enrollments.user_id 
      AND users.is_public = true
    )
  );

DROP POLICY IF EXISTS "Users can insert own ensemble enrollments" ON public.ensemble_enrollments;
CREATE POLICY "Users can insert own ensemble enrollments" ON public.ensemble_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view enrollments with valid reference" ON public.ensemble_enrollments;
CREATE POLICY "Anyone can view enrollments with valid reference" ON public.ensemble_enrollments
  FOR SELECT USING (enrollment_reference IS NOT NULL);

DROP POLICY IF EXISTS "Admins can update ensemble enrollments" ON public.ensemble_enrollments;
CREATE POLICY "Admins can update ensemble enrollments" ON public.ensemble_enrollments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
  WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete ensemble enrollments" ON public.ensemble_enrollments;
CREATE POLICY "Admins can delete ensemble enrollments" ON public.ensemble_enrollments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
  WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    )
  );


-- =============================================
-- RLS POLICIES - ENSEMBLE TEAM MEMBERS
-- =============================================
ALTER TABLE public.ensemble_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view ensemble team members" ON public.ensemble_team_members;
CREATE POLICY "Anyone can view ensemble team members" ON public.ensemble_team_members
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage ensemble team members" ON public.ensemble_team_members;
CREATE POLICY "Admins can manage ensemble team members" ON public.ensemble_team_members
  FOR ALL USING (is_admin());


-- =============================================
-- RLS POLICIES - FAMILY CONNECTIONS
-- =============================================
ALTER TABLE public.family_connections ENABLE ROW LEVEL SECURITY;

-- Users can view connections where they are parent or child
DROP POLICY IF EXISTS "Users can view own family connections" ON public.family_connections;
CREATE POLICY "Users can view own family connections" ON public.family_connections
  FOR SELECT USING (auth.uid() = parent_id OR auth.uid() = child_id);

-- Parents can insert connections (when child uses their code)
DROP POLICY IF EXISTS "Users can create family connections" ON public.family_connections;
CREATE POLICY "Users can create family connections" ON public.family_connections
  FOR INSERT WITH CHECK (auth.uid() = child_id);

-- Users can update their own connections (e.g., to remove)
DROP POLICY IF EXISTS "Users can update own family connections" ON public.family_connections;
CREATE POLICY "Users can update own family connections" ON public.family_connections
  FOR UPDATE USING (auth.uid() = parent_id OR auth.uid() = child_id);

-- Users can delete their own connections
DROP POLICY IF EXISTS "Users can delete own family connections" ON public.family_connections;
CREATE POLICY "Users can delete own family connections" ON public.family_connections
  FOR DELETE USING (auth.uid() = parent_id OR auth.uid() = child_id);

-- Admins can manage all family connections
DROP POLICY IF EXISTS "Admins can manage family connections" ON public.family_connections;
CREATE POLICY "Admins can manage family connections" ON public.family_connections
  FOR ALL USING (is_admin());

-- Parents can view connected children's profiles
DROP POLICY IF EXISTS "Parents can view connected children profiles" ON public.users;
CREATE POLICY "Parents can view connected children profiles" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_connections 
      WHERE family_connections.parent_id = auth.uid() 
      AND family_connections.child_id = users.id
      AND family_connections.status = 'active'
    )
  );


-- =============================================
-- RLS POLICIES - ENROLLMENT REQUESTS
-- =============================================
ALTER TABLE public.enrollment_requests ENABLE ROW LEVEL SECURITY;

-- Parents can view requests for their children
DROP POLICY IF EXISTS "Parents can view enrollment requests" ON public.enrollment_requests;
CREATE POLICY "Parents can view enrollment requests" ON public.enrollment_requests
  FOR SELECT USING (
    parent_id = auth.uid() OR child_id = auth.uid()
  );

-- Children can create enrollment requests
DROP POLICY IF EXISTS "Children can create enrollment requests" ON public.enrollment_requests;
CREATE POLICY "Children can create enrollment requests" ON public.enrollment_requests
  FOR INSERT WITH CHECK (child_id = auth.uid());

-- Parents can update (approve/reject) their children's requests
DROP POLICY IF EXISTS "Parents can update enrollment requests" ON public.enrollment_requests;
CREATE POLICY "Parents can update enrollment requests" ON public.enrollment_requests
  FOR UPDATE USING (parent_id = auth.uid());

-- Admins can manage all requests
DROP POLICY IF EXISTS "Admins can manage enrollment requests" ON public.enrollment_requests;
CREATE POLICY "Admins can manage enrollment requests" ON public.enrollment_requests
  FOR ALL USING (is_admin());


-- =============================================
-- USER CREATION TRIGGER
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================
-- SEED DATA
-- =============================================

-- Insert default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('hero_message', '{"title": "Velkommen til Teateret", "subtitle": "Opplev magien på scenen"}'::jsonb),
  ('featured_ensembles', '[]'::jsonb),
  ('contact_info', '{"email": "kontakt@teateret.no", "phone": "+47 123 45 678", "address": "Teaterveien 1, 0123 Oslo"}'::jsonb),
  ('social_links', '{"facebook": "", "instagram": "", "youtube": ""}'::jsonb),
  ('about_text', '"Vi er et lokalt teater med fokus på kvalitetsforestillinger for hele familien."'::jsonb),
  ('booking_terms', '"Billetter refunderes ikke etter kjøp. Ved avlysning vil du motta full refusjon."'::jsonb),
  ('faq', '[]'::jsonb)
  ,('theme_tokens', '{
    "background": "#F7F5F3",
    "foreground": "#0B0B0B",
    "card": "#FFFFFF",
    "card_foreground": "#0B0B0B",
    "primary": "#6366f1",
    "primary_foreground": "#FFFFFF",
    "accent": "#D9A93A",
    "accent_foreground": "#0B0B0B",
    "destructive": "#C84B31",
    "border": "#EDEBE8",
    "seat_available": "#22C55E",
    "seat_selected": "#A855F7",
    "seat_sold": "#FF6B6B",
    "seat_reserved": "#F59E0B",
    "gradient_hero": "radial-gradient(ellipse at center, #0A0A0A 0%, #12313f 100%)",
    "gradient_hover": "linear-gradient(90deg, #8B1538 0%, #A01D45 100%)",
    "chart_1": "#D9A93A",
    "chart_2": "#6EA3B0",
    "chart_3": "#8FA3B8",
    "chart_4": "#A6C9B8",
    "chart_5": "#D6A77A"
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Insert a sample venue
INSERT INTO public.venues (id, name, address, postal_code, city, capacity, seat_map_config, accessibility_info, parking_info, public_transport) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Hovedscenen',
    'Teaterveien 1',
    '0123',
    'Oslo',
    100,
    '{
      "seats": [
        {"row": "A", "number": 1, "type": "available"},
        {"row": "A", "number": 2, "type": "available"},
        {"row": "A", "number": 3, "type": "available"},
        {"row": "A", "number": 4, "type": "available"},
        {"row": "A", "number": 5, "type": "available"},
        {"row": "A", "number": 6, "type": "available"},
        {"row": "A", "number": 7, "type": "available"},
        {"row": "A", "number": 8, "type": "available"},
        {"row": "A", "number": 9, "type": "available"},
        {"row": "A", "number": 10, "type": "available"},
        {"row": "B", "number": 1, "type": "available"},
        {"row": "B", "number": 2, "type": "available"},
        {"row": "B", "number": 3, "type": "available"},
        {"row": "B", "number": 4, "type": "available"},
        {"row": "B", "number": 5, "type": "available"},
        {"row": "B", "number": 6, "type": "available"},
        {"row": "B", "number": 7, "type": "available"},
        {"row": "B", "number": 8, "type": "available"},
        {"row": "B", "number": 9, "type": "available"},
        {"row": "B", "number": 10, "type": "available"},
        {"row": "C", "number": 1, "type": "available"},
        {"row": "C", "number": 2, "type": "available"},
        {"row": "C", "number": 3, "type": "available"},
        {"row": "C", "number": 4, "type": "available"},
        {"row": "C", "number": 5, "type": "available"},
        {"row": "C", "number": 6, "type": "available"},
        {"row": "C", "number": 7, "type": "available"},
        {"row": "C", "number": 8, "type": "available"},
        {"row": "C", "number": 9, "type": "available"},
        {"row": "C", "number": 10, "type": "available"},
        {"row": "D", "number": 1, "type": "available"},
        {"row": "D", "number": 2, "type": "available"},
        {"row": "D", "number": 3, "type": "available"},
        {"row": "D", "number": 4, "type": "available"},
        {"row": "D", "number": 5, "type": "available"},
        {"row": "D", "number": 6, "type": "available"},
        {"row": "D", "number": 7, "type": "available"},
        {"row": "D", "number": 8, "type": "available"},
        {"row": "D", "number": 9, "type": "available"},
        {"row": "D", "number": 10, "type": "available"},
        {"row": "E", "number": 1, "type": "available"},
        {"row": "E", "number": 2, "type": "available"},
        {"row": "E", "number": 3, "type": "available"},
        {"row": "E", "number": 4, "type": "available"},
        {"row": "E", "number": 5, "type": "available"},
        {"row": "E", "number": 6, "type": "available"},
        {"row": "E", "number": 7, "type": "available"},
        {"row": "E", "number": 8, "type": "available"},
        {"row": "E", "number": 9, "type": "available"},
        {"row": "E", "number": 10, "type": "available"},
        {"row": "F", "number": 1, "type": "available"},
        {"row": "F", "number": 2, "type": "available"},
        {"row": "F", "number": 3, "type": "available"},
        {"row": "F", "number": 4, "type": "available"},
        {"row": "F", "number": 5, "type": "available"},
        {"row": "F", "number": 6, "type": "available"},
        {"row": "F", "number": 7, "type": "available"},
        {"row": "F", "number": 8, "type": "available"},
        {"row": "F", "number": 9, "type": "available"},
        {"row": "F", "number": 10, "type": "available"},
        {"row": "G", "number": 1, "type": "available"},
        {"row": "G", "number": 2, "type": "available"},
        {"row": "G", "number": 3, "type": "available"},
        {"row": "G", "number": 4, "type": "available"},
        {"row": "G", "number": 5, "type": "available"},
        {"row": "G", "number": 6, "type": "available"},
        {"row": "G", "number": 7, "type": "available"},
        {"row": "G", "number": 8, "type": "available"},
        {"row": "G", "number": 9, "type": "available"},
        {"row": "G", "number": 10, "type": "available"},
        {"row": "H", "number": 1, "type": "available"},
        {"row": "H", "number": 2, "type": "available"},
        {"row": "H", "number": 3, "type": "available"},
        {"row": "H", "number": 4, "type": "available"},
        {"row": "H", "number": 5, "type": "available"},
        {"row": "H", "number": 6, "type": "available"},
        {"row": "H", "number": 7, "type": "available"},
        {"row": "H", "number": 8, "type": "available"},
        {"row": "H", "number": 9, "type": "available"},
        {"row": "H", "number": 10, "type": "available"},
        {"row": "I", "number": 1, "type": "available"},
        {"row": "I", "number": 2, "type": "available"},
        {"row": "I", "number": 3, "type": "available"},
        {"row": "I", "number": 4, "type": "available"},
        {"row": "I", "number": 5, "type": "available"},
        {"row": "I", "number": 6, "type": "available"},
        {"row": "I", "number": 7, "type": "available"},
        {"row": "I", "number": 8, "type": "available"},
        {"row": "I", "number": 9, "type": "available"},
        {"row": "I", "number": 10, "type": "available"},
        {"row": "J", "number": 1, "type": "available"},
        {"row": "J", "number": 2, "type": "available"},
        {"row": "J", "number": 3, "type": "available"},
        {"row": "J", "number": 4, "type": "available"},
        {"row": "J", "number": 5, "type": "available"},
        {"row": "J", "number": 6, "type": "available"},
        {"row": "J", "number": 7, "type": "available"},
        {"row": "J", "number": 8, "type": "available"},
        {"row": "J", "number": 9, "type": "available"},
        {"row": "J", "number": 10, "type": "available"}
      ]
    }'::jsonb,
    'Rullestoltilgang via hovedinngang. HC-toalett tilgjengelig.',
    'Parkering tilgjengelig i garasjeanlegg ved siden av bygget.',
    'Nærmeste T-bane: Nationaltheatret (5 min gange)'
  )
ON CONFLICT DO NOTHING;


-- =============================================
-- NOTES FOR MANUAL SETUP
-- =============================================
-- After running this script:
--
-- 1. Register a new user account through the app
-- 2. Make yourself an admin by running:
--    UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';
--
-- 3. The database is now ready for:
--    - Creating ensembles and shows
--    - Configuring venues and seats
--    - Setting up discount codes
--    - Managing bookings and recordings
--
-- =============================================
-- FUNCTION TO REGENERATE QR SIGNATURES
-- =============================================
-- This function regenerates QR code signatures for all bookings
-- Run this after deploying the QR signature fix to ensure all existing bookings have valid signatures
CREATE OR REPLACE FUNCTION public.regenerate_qr_signatures()
RETURNS void AS $$
DECLARE
  v_booking_record RECORD;
  v_qr_data JSONB;
  v_data_without_sig JSONB;
  v_qr_secret TEXT;
  v_signature TEXT;
BEGIN
  -- Get the QR signing secret from environment (this must match QR_SIGNING_SECRET)
  -- NOTE: In production, this should be set as a Supabase variable
  v_qr_secret := current_setting('app.qr_signing_secret', true);
  IF v_qr_secret IS NULL THEN
    RAISE WARNING 'QR_SIGNING_SECRET not configured. Using default (INSECURE).';
    v_qr_secret := 'default-secret-change-in-production';
  END IF;

  FOR v_booking_record IN SELECT * FROM public.bookings WHERE qr_code_data IS NOT NULL
  LOOP
    v_qr_data := v_booking_record.qr_code_data;
    
    -- Remove signature field to create data for signing
    v_data_without_sig := v_qr_data - 'signature';
    
    -- Generate new signature using HMAC-SHA256
    v_signature := encode(
      hmac(
        v_data_without_sig::text,
        v_qr_secret,
        'sha256'
      ),
      'hex'
    );
    
    -- Update booking with new QR data including signature
    UPDATE public.bookings 
    SET qr_code_data = jsonb_set(v_qr_data, '{signature}', to_jsonb(v_signature))
    WHERE id = v_booking_record.id;
  END LOOP;

  RAISE NOTICE 'QR signatures regenerated for all bookings';
END;
$$ LANGUAGE plpgsql;

-- Execute the function to regenerate all signatures
-- IMPORTANT: This requires qr_signing_secret to be set as Supabase variable
-- For now, run this manually after setting the environment variable
-- SELECT public.regenerate_qr_signatures();

-- =============================================

-- =============================================
-- ALTER BOOKINGS TABLE - CHANGE SEAT_IDS TO JSONB
-- =============================================
-- If the table already exists with UUID[] type, alter it to JSONB
ALTER TABLE IF EXISTS public.bookings 
  ALTER COLUMN seat_ids DROP DEFAULT;
  
ALTER TABLE IF EXISTS public.bookings 
  ALTER COLUMN seat_ids TYPE JSONB USING '[]'::jsonb;
  
ALTER TABLE IF EXISTS public.bookings 
  ALTER COLUMN seat_ids SET DEFAULT '[]'::jsonb;


-- =============================================
-- ACTORS AND ROLES ENHANCEMENT
-- Add actors table and update ensemble cast structure
-- =============================================

-- Create actors table to store reusable actor profiles
CREATE TABLE IF NOT EXISTS public.actors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  birth_date DATE,
  contact_email TEXT,
  contact_phone TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Link to user account
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name) -- Ensure unique actor names for auto-complete
);

-- Create roles table to store character definitions
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ensemble_id UUID NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL, -- Character name in the play
  description TEXT,
  importance TEXT DEFAULT 'supporting' CHECK (importance IN ('lead', 'supporting', 'ensemble')),
  yellow_actor_id UUID REFERENCES public.actors(id) ON DELETE SET NULL,
  blue_actor_id UUID REFERENCES public.actors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ensemble_id, character_name) -- Unique character names per ensemble
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_actors_name ON public.actors(name);
CREATE INDEX IF NOT EXISTS idx_actors_user_id ON public.actors(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_ensemble_id ON public.roles(ensemble_id);
CREATE INDEX IF NOT EXISTS idx_roles_yellow_actor ON public.roles(yellow_actor_id);
CREATE INDEX IF NOT EXISTS idx_roles_blue_actor ON public.roles(blue_actor_id);

-- Row Level Security
ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for actors
DROP POLICY IF EXISTS "Anyone can view actors" ON public.actors;
CREATE POLICY "Anyone can view actors" ON public.actors
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage actors" ON public.actors;
CREATE POLICY "Admins can manage actors" ON public.actors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
  WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    )
  );

-- RLS Policies for roles
DROP POLICY IF EXISTS "Anyone can view roles" ON public.roles;
CREATE POLICY "Anyone can view roles" ON public.roles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;
CREATE POLICY "Admins can manage roles" ON public.roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
  WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    )
  );

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_actors_updated_at ON public.actors;
CREATE TRIGGER update_actors_updated_at 
  BEFORE UPDATE ON public.actors 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON public.roles;
CREATE TRIGGER update_roles_updated_at 
  BEFORE UPDATE ON public.roles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================
-- FEATURED ROLES - Actor Showcase
-- Allow actors to pin their proudest roles
-- =============================================
CREATE TABLE IF NOT EXISTS public.featured_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  notes TEXT, -- Personal notes about why this role is special
  featured_image_url TEXT, -- Optional custom image for this featured role
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role_id) -- Can't feature the same role twice
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_featured_roles_user_id ON public.featured_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_featured_roles_display_order ON public.featured_roles(user_id, display_order);

-- Row Level Security
ALTER TABLE public.featured_roles ENABLE ROW LEVEL SECURITY;

-- Anyone can view featured roles
DROP POLICY IF EXISTS "Anyone can view featured roles" ON public.featured_roles;
CREATE POLICY "Anyone can view featured roles" ON public.featured_roles
  FOR SELECT USING (true);

-- Users can manage their own featured roles
DROP POLICY IF EXISTS "Users can manage their own featured roles" ON public.featured_roles;
CREATE POLICY "Users can manage their own featured roles" ON public.featured_roles
  FOR ALL USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_featured_roles_updated_at ON public.featured_roles;


-- =============================================
-- FIX: Ensure ensemble_enrollments has correct status constraint
-- =============================================
-- Drop the old constraint if it exists (without payment_pending)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ensemble_enrollments_status_check' 
    AND contype = 'c'
  ) THEN
    ALTER TABLE public.ensemble_enrollments DROP CONSTRAINT ensemble_enrollments_status_check;
  END IF;
END $$;

-- Add the correct constraint with all status values including payment_pending
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ensemble_enrollments_status_check'
  ) THEN
    ALTER TABLE public.ensemble_enrollments ADD CONSTRAINT ensemble_enrollments_status_check 
      CHECK (status IN ('pending', 'yellow', 'blue', 'rejected', 'payment_pending', 'confirmed'));
  END IF;
END $$;


-- =============================================
-- END OF SCHEMA
-- =============================================

-- Now add the foreign key constraint to users table (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_users_actor_id'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT fk_users_actor_id 
      FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================
-- GIFT CARDS / VOUCHERS
-- Small incremental feature to allow issuance and redemption of gift cards
-- Add schema here per project policy (work in 000 file)
-- =============================================
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  initial_value_nok DECIMAL(10,2) NOT NULL DEFAULT 0,
  remaining_value_nok DECIMAL(10,2) NOT NULL DEFAULT 0,
  issued_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  issued_to_email TEXT,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON public.gift_cards(code);

CREATE TABLE IF NOT EXISTS public.gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  amount_nok DECIMAL(10,2) NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_gift_card_redemptions_gift_card ON public.gift_card_redemptions(gift_card_id);

-- RLS and policies for gift cards


-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_gift_cards_updated_at ON public.gift_cards;
CREATE TRIGGER update_gift_cards_updated_at BEFORE UPDATE ON public.gift_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed a sample gift card (development only)
INSERT INTO public.gift_cards (code, initial_value_nok, remaining_value_nok, issued_by, issued_to_email)
VALUES ('WELCOME-100', 100.00, 100.00, NULL, 'test@example.com')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- SEAT HOLDS - temporary reservations during checkout
-- Stores a JSON array of seat objects held for a short period
-- =============================================
CREATE TABLE IF NOT EXISTS public.seat_holds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hold_token UUID NOT NULL UNIQUE,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  seats JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of {section,row,number}
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_seat_holds_show_id ON public.seat_holds(show_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_token ON public.seat_holds(hold_token);

ALTER TABLE public.seat_holds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their seat holds" ON public.seat_holds;
CREATE POLICY "Users can manage their seat holds" ON public.seat_holds
  FOR ALL USING (user_id = auth.uid() OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.role = 'admin' OR u.role = 'superadmin'))))
  WITH CHECK (user_id = auth.uid() OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.role = 'admin' OR u.role = 'superadmin'))));

-- Trigger to update updated_at for seat_holds
ALTER TABLE public.seat_holds ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
DROP TRIGGER IF EXISTS update_seat_holds_updated_at ON public.seat_holds;
CREATE TRIGGER update_seat_holds_updated_at BEFORE UPDATE ON public.seat_holds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ATOMIC SEAT HOLD CREATION FUNCTION
-- Creates a seat hold under an advisory transaction lock to avoid races.
-- Usage: SELECT public.create_seat_hold(show_id, seats_jsonb, user_id, duration_seconds);
-- Returns: uuid hold_token or raises exception 'seats_conflict' on conflict
-- =============================================
CREATE OR REPLACE FUNCTION public.create_seat_hold(
  p_show_id UUID,
  p_seats JSONB,
  p_user_id UUID,
  p_duration_seconds INTEGER DEFAULT 300
) RETURNS UUID AS $$
DECLARE
  v_token UUID := uuid_generate_v4();
  v_expires TIMESTAMPTZ := NOW() + (p_duration_seconds || ' seconds')::interval;
  v_conflict_count INTEGER := 0;
  v_show_lock BIGINT;
BEGIN
  -- Use hash of show_id as advisory lock key
  v_show_lock := hashtext(p_show_id::text)::bigint;
  PERFORM pg_advisory_xact_lock(v_show_lock);

  -- Check for conflicting active holds for same show
  SELECT COUNT(1)
    INTO v_conflict_count
    FROM public.seat_holds sh
    WHERE sh.show_id = p_show_id
      AND sh.active = TRUE
      AND sh.expires_at > NOW()
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(sh.seats) AS s(seat)
        WHERE EXISTS (
          SELECT 1 FROM jsonb_array_elements(p_seats) AS r(req)
          WHERE (s.seat->> 'section') = (req->> 'section')
            AND (s.seat->> 'row') = (req->> 'row')
            AND ((s.seat->> 'number')::int) = ((req->> 'number')::int)
        )
      );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'seats_conflict';
  END IF;

  INSERT INTO public.seat_holds (hold_token, show_id, seats, user_id, expires_at, created_at, created_by, active)
  VALUES (v_token, p_show_id, p_seats, p_user_id, v_expires, NOW(), p_user_id, TRUE);

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- MISSING COLUMNS - Added from fix migrations
-- =============================================

-- admin_uuid expiration support (from add-admin-uuid-expiration.sql)
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS admin_uuid_expires_at TIMESTAMPTZ;

-- Update existing admin UUIDs to expire in 24 hours if not already set
UPDATE public.users 
SET admin_uuid_expires_at = NOW() + INTERVAL '24 hours'
WHERE admin_uuid IS NOT NULL 
  AND admin_uuid_expires_at IS NULL;

-- Ensemble waitlist and capacity management (from add-ensemble-waitlist-columns.sql)
ALTER TABLE public.ensembles
  ADD COLUMN IF NOT EXISTS max_actors INTEGER,
  ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS auto_accept_enabled BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.ensembles.max_actors IS 'Maximum number of actors allowed (NULL = unlimited)';
COMMENT ON COLUMN public.ensembles.waitlist_enabled IS 'Enable waitlist when ensemble is full';
COMMENT ON COLUMN public.ensembles.auto_accept_enabled IS 'Auto-accept enrollments when there''s space';


-- =============================================
-- RLS POLICIES - SHOW ATTENDANCES
-- =============================================
ALTER TABLE public.show_attendances ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_show_attendances_updated_at ON public.show_attendances;
CREATE TRIGGER update_show_attendances_updated_at
  BEFORE UPDATE ON public.show_attendances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_show_attendances_show_id ON public.show_attendances(show_id);
CREATE INDEX IF NOT EXISTS idx_show_attendances_user_id ON public.show_attendances(user_id);

DROP POLICY IF EXISTS "Users can view own show attendances" ON public.show_attendances;
CREATE POLICY "Users can view own show attendances" ON public.show_attendances
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own show attendances" ON public.show_attendances;
CREATE POLICY "Users can manage own show attendances" ON public.show_attendances
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage show attendances" ON public.show_attendances;
CREATE POLICY "Admins can manage show attendances" ON public.show_attendances
  FOR ALL USING (is_admin());


-- =============================================
-- VENUE SEAT MAP - Physical Layout (235 seats)
-- Based on actual theater layout
-- =============================================
UPDATE public.venues
SET
  capacity = 235,
  seat_map_config = '{
    "seats": [
      {"row": "1", "number": 1, "type": "available"},
      {"row": "1", "number": 2, "type": "available"},
      {"row": "1", "number": 3, "type": "available"},
      {"row": "1", "number": 4, "type": "available"},
      {"row": "1", "number": 5, "type": "available"},
      {"row": "1", "number": 6, "type": "available"},
      {"row": "1", "number": 7, "type": "available"},
      {"row": "1", "number": 8, "type": "available"},
      {"row": "1", "number": 9, "type": "available"},
      {"row": "1", "number": 10, "type": "available"},
      {"row": "1", "number": 11, "type": "available"},
      {"row": "1", "number": 12, "type": "available"},
      {"row": "1", "number": 13, "type": "available"},
      {"row": "1", "number": 14, "type": "available"},
      {"row": "1", "number": 15, "type": "available"},
      {"row": "1", "number": 16, "type": "available"},
      {"row": "1", "number": 17, "type": "available"},
      {"row": "1", "number": 18, "type": "available"},
      {"row": "1", "number": 19, "type": "available"},
      {"row": "1", "number": 20, "type": "available"},
      {"row": "1", "number": 21, "type": "available"},
      {"row": "1", "number": 22, "type": "available"},
      {"row": "1", "number": 23, "type": "available"},
      {"row": "1", "number": 24, "type": "available"},
      {"row": "1", "number": 25, "type": "available"},
      {"row": "2", "number": 1, "type": "available"},
      {"row": "2", "number": 2, "type": "available"},
      {"row": "2", "number": 3, "type": "available"},
      {"row": "2", "number": 4, "type": "available"},
      {"row": "2", "number": 5, "type": "available"},
      {"row": "2", "number": 6, "type": "available"},
      {"row": "2", "number": 7, "type": "available"},
      {"row": "2", "number": 8, "type": "available"},
      {"row": "2", "number": 9, "type": "available"},
      {"row": "2", "number": 10, "type": "available"},
      {"row": "2", "number": 11, "type": "available"},
      {"row": "2", "number": 12, "type": "available"},
      {"row": "2", "number": 13, "type": "available"},
      {"row": "2", "number": 14, "type": "available"},
      {"row": "2", "number": 15, "type": "available"},
      {"row": "2", "number": 16, "type": "available"},
      {"row": "2", "number": 17, "type": "available"},
      {"row": "2", "number": 18, "type": "available"},
      {"row": "2", "number": 19, "type": "available"},
      {"row": "2", "number": 20, "type": "available"},
      {"row": "2", "number": 21, "type": "available"},
      {"row": "2", "number": 22, "type": "available"},
      {"row": "2", "number": 23, "type": "available"},
      {"row": "2", "number": 24, "type": "available"},
      {"row": "2", "number": 25, "type": "available"},
      {"row": "3", "number": 1, "type": "available"},
      {"row": "3", "number": 2, "type": "available"},
      {"row": "3", "number": 3, "type": "available"},
      {"row": "3", "number": 4, "type": "available"},
      {"row": "3", "number": 5, "type": "available"},
      {"row": "3", "number": 6, "type": "available"},
      {"row": "3", "number": 7, "type": "available"},
      {"row": "3", "number": 8, "type": "available"},
      {"row": "3", "number": 9, "type": "available"},
      {"row": "3", "number": 10, "type": "available"},
      {"row": "3", "number": 11, "type": "available"},
      {"row": "3", "number": 12, "type": "available"},
      {"row": "3", "number": 13, "type": "available"},
      {"row": "3", "number": 14, "type": "available"},
      {"row": "3", "number": 15, "type": "available"},
      {"row": "3", "number": 16, "type": "available"},
      {"row": "3", "number": 17, "type": "available"},
      {"row": "3", "number": 18, "type": "available"},
      {"row": "3", "number": 19, "type": "available"},
      {"row": "3", "number": 20, "type": "available"},
      {"row": "3", "number": 21, "type": "available"},
      {"row": "3", "number": 22, "type": "available"},
      {"row": "3", "number": 23, "type": "available"},
      {"row": "3", "number": 24, "type": "available"},
      {"row": "3", "number": 25, "type": "available"},
      {"row": "4", "number": 1, "type": "available"},
      {"row": "4", "number": 2, "type": "available"},
      {"row": "4", "number": 3, "type": "available"},
      {"row": "4", "number": 4, "type": "available"},
      {"row": "4", "number": 5, "type": "available"},
      {"row": "4", "number": 6, "type": "available"},
      {"row": "4", "number": 7, "type": "available"},
      {"row": "4", "number": 8, "type": "available"},
      {"row": "4", "number": 9, "type": "available"},
      {"row": "4", "number": 10, "type": "available"},
      {"row": "4", "number": 11, "type": "available"},
      {"row": "4", "number": 12, "type": "available"},
      {"row": "4", "number": 13, "type": "available"},
      {"row": "4", "number": 14, "type": "available"},
      {"row": "4", "number": 15, "type": "available"},
      {"row": "4", "number": 16, "type": "available"},
      {"row": "4", "number": 17, "type": "available"},
      {"row": "4", "number": 18, "type": "available"},
      {"row": "4", "number": 19, "type": "available"},
      {"row": "4", "number": 20, "type": "available"},
      {"row": "4", "number": 21, "type": "available"},
      {"row": "4", "number": 22, "type": "available"},
      {"row": "4", "number": 23, "type": "available"},
      {"row": "4", "number": 24, "type": "available"},
      {"row": "4", "number": 25, "type": "available"},
      {"row": "5", "number": 1, "type": "available"},
      {"row": "5", "number": 2, "type": "available"},
      {"row": "5", "number": 3, "type": "available"},
      {"row": "5", "number": 4, "type": "available"},
      {"row": "5", "number": 5, "type": "available"},
      {"row": "5", "number": 6, "type": "available"},
      {"row": "5", "number": 7, "type": "available"},
      {"row": "5", "number": 8, "type": "available"},
      {"row": "5", "number": 9, "type": "available"},
      {"row": "5", "number": 10, "type": "available"},
      {"row": "5", "number": 11, "type": "available"},
      {"row": "5", "number": 12, "type": "available"},
      {"row": "5", "number": 13, "type": "available"},
      {"row": "5", "number": 14, "type": "available"},
      {"row": "5", "number": 15, "type": "available"},
      {"row": "5", "number": 16, "type": "available"},
      {"row": "5", "number": 17, "type": "available"},
      {"row": "5", "number": 18, "type": "available"},
      {"row": "5", "number": 19, "type": "available"},
      {"row": "5", "number": 20, "type": "available"},
      {"row": "5", "number": 21, "type": "available"},
      {"row": "5", "number": 22, "type": "available"},
      {"row": "5", "number": 23, "type": "available"},
      {"row": "5", "number": 24, "type": "available"},
      {"row": "5", "number": 25, "type": "available"},
      {"row": "6", "number": 13, "type": "available"},
      {"row": "6", "number": 14, "type": "available"},
      {"row": "6", "number": 15, "type": "available"},
      {"row": "6", "number": 16, "type": "available"},
      {"row": "6", "number": 17, "type": "available"},
      {"row": "6", "number": 18, "type": "available"},
      {"row": "6", "number": 19, "type": "available"},
      {"row": "6", "number": 20, "type": "available"},
      {"row": "6", "number": 21, "type": "available"},
      {"row": "6", "number": 22, "type": "available"},
      {"row": "6", "number": 23, "type": "available"},
      {"row": "6", "number": 24, "type": "available"},
      {"row": "6", "number": 25, "type": "available"},
      {"row": "7", "number": 13, "type": "available"},
      {"row": "7", "number": 14, "type": "available"},
      {"row": "7", "number": 15, "type": "available"},
      {"row": "7", "number": 16, "type": "available"},
      {"row": "7", "number": 17, "type": "available"},
      {"row": "7", "number": 18, "type": "available"},
      {"row": "7", "number": 19, "type": "available"},
      {"row": "7", "number": 20, "type": "available"},
      {"row": "7", "number": 21, "type": "available"},
      {"row": "7", "number": 22, "type": "available"},
      {"row": "7", "number": 23, "type": "available"},
      {"row": "7", "number": 24, "type": "available"},
      {"row": "7", "number": 25, "type": "available"},
      {"row": "8", "number": 13, "type": "available"},
      {"row": "8", "number": 14, "type": "available"},
      {"row": "8", "number": 15, "type": "available"},
      {"row": "8", "number": 16, "type": "available"},
      {"row": "8", "number": 17, "type": "available"},
      {"row": "8", "number": 18, "type": "available"},
      {"row": "8", "number": 19, "type": "available"},
      {"row": "8", "number": 20, "type": "available"},
      {"row": "8", "number": 21, "type": "available"},
      {"row": "8", "number": 22, "type": "available"},
      {"row": "8", "number": 23, "type": "available"},
      {"row": "8", "number": 24, "type": "available"},
      {"row": "8", "number": 25, "type": "available"},
      {"row": "9", "number": 13, "type": "available"},
      {"row": "9", "number": 14, "type": "available"},
      {"row": "9", "number": 15, "type": "available"},
      {"row": "9", "number": 16, "type": "available"},
      {"row": "9", "number": 17, "type": "available"},
      {"row": "9", "number": 18, "type": "available"},
      {"row": "9", "number": 19, "type": "available"},
      {"row": "9", "number": 20, "type": "available"},
      {"row": "9", "number": 21, "type": "available"},
      {"row": "9", "number": 22, "type": "available"},
      {"row": "9", "number": 23, "type": "available"},
      {"row": "9", "number": 24, "type": "available"},
      {"row": "9", "number": 25, "type": "available"},
      {"row": "10", "number": 13, "type": "available"},
      {"row": "10", "number": 14, "type": "available"},
      {"row": "10", "number": 15, "type": "available"},
      {"row": "10", "number": 16, "type": "available"},
      {"row": "10", "number": 17, "type": "available"},
      {"row": "10", "number": 18, "type": "available"},
      {"row": "10", "number": 19, "type": "available"},
      {"row": "10", "number": 20, "type": "available"},
      {"row": "10", "number": 21, "type": "available"},
      {"row": "10", "number": 22, "type": "available"},
      {"row": "10", "number": 23, "type": "available"},
      {"row": "10", "number": 24, "type": "available"},
      {"row": "10", "number": 25, "type": "available"}
    ]
  }'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000001';


-- =============================================
-- END OF COMPLETE SETUP
-- =============================================
-- After running this script:
--
-- 1. Register a new user account through the app
-- 2. Make yourself an admin by running:
--    UPDATE public.users SET role = 'superadmin' WHERE email = 'your@email.com';
--
-- 3. The database is now ready for use.
-- =============================================
