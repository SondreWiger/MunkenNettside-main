-- ========================================================================================================
-- TEATERET PLATFORM - COMPLETE DATABASE SETUP
-- This single script creates the entire database schema, RLS policies, functions, indexes, and seed data
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
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


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
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'yellow', 'blue', 'rejected')),
  role TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Ukjent'),
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
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
  FOR SELECT USING (is_published = TRUE);

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
  FOR SELECT USING (is_published = TRUE);

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
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can insert own ensemble enrollments" ON public.ensemble_enrollments;
CREATE POLICY "Users can insert own ensemble enrollments" ON public.ensemble_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update ensemble enrollments" ON public.ensemble_enrollments;
CREATE POLICY "Admins can update ensemble enrollments" ON public.ensemble_enrollments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete ensemble enrollments" ON public.ensemble_enrollments;
CREATE POLICY "Admins can delete ensemble enrollments" ON public.ensemble_enrollments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
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
ON CONFLICT (key) DO NOTHING;

-- Insert a sample venue
INSERT INTO public.venues (id, name, address, postal_code, city, capacity, seat_map_config, accessibility_info, parking_info, public_transport) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Hovedscenen',
    'Teaterveien 1',
    '0123',
    'Oslo',
    150,
    '{
      "sections": [
        {
          "name": "Parkett",
          "rows": [
            {"number": "A", "seats": [1,2,3,4,5,6,7,8,9,10]},
            {"number": "B", "seats": [1,2,3,4,5,6,7,8,9,10]},
            {"number": "C", "seats": [1,2,3,4,5,6,7,8,9,10]},
            {"number": "D", "seats": [1,2,3,4,5,6,7,8,9,10]},
            {"number": "E", "seats": [1,2,3,4,5,6,7,8,9,10]}
          ]
        },
        {
          "name": "Balkong",
          "rows": [
            {"number": "F", "seats": [1,2,3,4,5,6,7,8]},
            {"number": "G", "seats": [1,2,3,4,5,6,7,8]}
          ]
        }
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
-- DELETE ALL FORESTILLINGER (SHOWS)
-- =============================================
-- This will delete all shows and associated seats
DELETE FROM public.seats WHERE show_id IN (SELECT id FROM public.shows);
DELETE FROM public.shows;
