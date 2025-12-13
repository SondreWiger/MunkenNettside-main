-- Add ALL missing user profile customization columns
-- Run this in Supabase SQL Editor

-- Basic profile columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio_short TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Profile customization columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_tint TEXT DEFAULT '#6366f1';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS banner_style TEXT DEFAULT 'gradient' CHECK (banner_style IN ('gradient', 'solid', 'image', 'pattern'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'default' CHECK (theme_preference IN ('default', 'minimal', 'vibrant', 'dark', 'light'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_border_color TEXT DEFAULT '#e5e7eb';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_text_color TEXT DEFAULT '#000000';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS custom_css TEXT;

-- Social media columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tiktok_url TEXT;

-- Additional profile info
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS favorite_quote TEXT;

-- Array columns for interests, skills, languages
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS languages_spoken TEXT[];

-- Privacy settings
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_social_links BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_achievements BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_featured_roles BOOLEAN DEFAULT true;
