# 🎭 Teateret Platform - Implementation Guide

## Quick Start

### What Was Just Completed

You now have a fully functional **Kurs** feature with public-facing pages and a completely redesigned user profile system.

### 3 Critical Things to Do Next

#### 1️⃣ **UPDATE YOUR SUPABASE DATABASE**
Run this SQL in your Supabase SQL Editor:

```sql
-- Drop existing kurs table if it exists
DROP TABLE IF EXISTS public.kurs CASCADE;

-- Re-run the complete setup script
-- Copy entire contents of /scripts/000-complete-setup.sql and execute it
```

This creates:
- `kurs` table with correct columns (`duration_weeks`, `price_nok`)
- RLS policies for security
- Indexes for performance
- All other 12 tables and infrastructure

#### 2️⃣ **CREATE SAMPLE DATA** (Optional but recommended)
Go to Supabase SQL Editor and insert:

```sql
INSERT INTO public.kurs (
  id, title, slug, level, duration_weeks, max_participants,
  synopsis_short, synopsis_long, price_nok, is_published, featured
) VALUES
  (
    gen_random_uuid(),
    'Introduksjon til teater',
    'introduksjon-til-teater',
    'beginner',
    4,
    15,
    'Lær teatergrunnlaget',
    'En grundig introduksjon til teaterkunsten for helt nybegynnere',
    499.00,
    true,
    true
  ),
  (
    gen_random_uuid(),
    'Avansert skuespill',
    'avansert-skuespill',
    'advanced',
    8,
    12,
    'Fordypning i skuespillteknikk',
    'Ekstern og intern karakterutvikling på avansert nivå',
    799.00,
    true,
    false
  );
```

#### 3️⃣ **TEST IN YOUR BROWSER**
1. Visit: `http://localhost:3000/kurs` - See all courses
2. Visit: `http://localhost:3000` - Check navbar shows Kurs link
3. Log in and visit: `http://localhost:3000/min-side` - See new dashboard
4. Visit: `http://localhost:3000/min-side/innstillinger` - Test settings

---

## New Pages Overview

### Public-Facing Pages

#### `/kurs` - Kurs Catalog
**What users see**: 
- All available courses
- Featured courses at the top
- Search by level, duration, price
- Click "Se mer" to view course details

**Data source**: Published kurs from database
**Authentication**: Public (no login required)

#### `/kurs/[slug]` - Course Details
**What users see**:
- Full course information
- Instructor name
- Duration, level, participant count
- Course images/gallery
- Price and availability
- "Register" button

**Data source**: Single kurs record by slug
**Authentication**: Public (no login required)

#### `/` - Updated Navbar
**What changed**:
- New "Kurs" link in navigation menu
- Appears between "Forestillinger" and "Opptak"
- Mobile and desktop menu

---

### Authenticated Pages

#### `/min-side` - User Dashboard
**3 Tabs**:
1. **Billetter** - Active and past bookings
2. **Opptak** - Purchase history
3. **Profil** - Personal information

**What's displayed**:
- Quick stats (4 cards at top)
- Active bookings with QR codes
- Purchase history
- Personal details
- Link to settings

#### `/min-side/innstillinger` - Settings
**What users can do**:
- Update full name
- Update phone number
- Change password
- Log out

---

## Database Schema - Kurs Table

```sql
CREATE TABLE public.kurs (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  director TEXT,
  participants JSONB,
  genre TEXT[],
  duration_weeks INTEGER,
  level TEXT ('beginner'|'intermediate'|'advanced'|'mixed'),
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  banner_url TEXT,
  gallery_images JSONB,
  synopsis_short TEXT,
  synopsis_long TEXT,
  price_nok DECIMAL(10,2),
  is_published BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  tags JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Feature Checklist

### Kurs Feature
- [x] Database table created
- [x] Admin CRUD pages (create, edit, list, delete)
- [x] Public listing page (`/kurs`)
- [x] Public detail page (`/kurs/[slug]`)
- [x] TypeScript types defined
- [x] Navbar link added
- [ ] User registration system (future)
- [ ] Email confirmations (future)

### User Profile Feature
- [x] Modern dashboard redesign
- [x] Tabbed interface
- [x] Booking management
- [x] Purchase history
- [x] Profile information display
- [x] Settings page
- [x] Password change
- [ ] Avatar upload (future)
- [ ] Email preferences (future)

---

## Admin Panel

### Creating a Kurs
1. Go to: `http://localhost:3000/admin`
2. Click "Kurs" or "Nytt kurs" button
3. Fill in:
   - Title
   - Level (dropdown)
   - Duration in weeks
   - Max participants
   - Price in NOK
   - Images and descriptions
   - Toggle publish to make visible

### Publishing vs. Featured
- **Published**: Course appears in public `/kurs` page
- **Featured**: Course appears at top of `/kurs` page

---

## Troubleshooting

### Kurs not showing in `/kurs`
**Check**:
1. Is `kurs` table created in Supabase? (Check Tables tab)
2. Is `is_published` set to `true` for your test courses?
3. Check browser console for errors (F12 → Console tab)

### Login not working
**Check**:
1. Supabase credentials in `.env` file
2. User registered in Supabase Auth
3. User profile created in `public.users` table

### Settings page showing blank
**Check**:
1. User is logged in
2. User profile exists in database
3. Browser console for errors

---

## Future Features to Implement

### Kurs System
- [ ] User registration/enrollment system
- [ ] Attendee roster
- [ ] Course completion certificates
- [ ] Class schedule management
- [ ] Waiting list functionality

### User Profile
- [ ] Profile avatar upload
- [ ] Email notification preferences
- [ ] Two-factor authentication
- [ ] Account deletion
- [ ] Download data export

### General Platform
- [ ] Search/filter functionality
- [ ] User reviews and ratings
- [ ] Payment integration improvements
- [ ] Email templates
- [ ] Analytics dashboard

---

## Tech Stack Used

**Frontend**:
- Next.js 16 (Server components)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Lucide React icons

**Backend**:
- Supabase (PostgreSQL)
- Row-Level Security (RLS)
- Auth service
- Server-side data fetching

**UI/UX**:
- Responsive design
- Mobile-first approach
- Accessible components
- Toast notifications (sonner)

---

## File Structure

```
app/
├── kurs/
│   ├── page.tsx              (Listing page)
│   └── [slug]/
│       └── page.tsx          (Detail page)
├── min-side/
│   ├── page.tsx              (Dashboard - redesigned)
│   └── innstillinger/
│       └── page.tsx          (Settings - new)
├── admin/
│   ├── kurs/
│   │   ├── page.tsx          (List kurs)
│   │   ├── ny/
│   │   │   └── page.tsx      (Create kurs)
│   │   └── [id]/
│   │       └── page.tsx      (Edit kurs)
│   └── ...

components/
├── layout/
│   └── header.tsx            (Updated with Kurs link)
└── ...

lib/
├── types.ts                  (Kurs type definitions)
└── ...

scripts/
└── 000-complete-setup.sql    (Updated with duration_weeks & price_nok)
```

---

## Support & Debugging

### Enable Debug Logging
Add to any page component:
```typescript
console.log('Current user:', user);
console.log('Kurs data:', kursData);
```

### Check Network Requests
1. Open browser DevTools (F12)
2. Go to Network tab
3. Look for failing requests
4. Check response status and error messages

### Supabase Console
1. Go to https://app.supabase.com
2. Select your project
3. Check:
   - Tables (verify schema)
   - Logs (check for errors)
   - Auth (verify users)

---

## Next Phase Priorities

1. **Kurs Registration System** (Week 1)
   - User can register for courses
   - Payment integration
   - Confirmation emails

2. **Enhanced Profile** (Week 2)
   - Avatar upload
   - Course registrations view
   - Certificate downloads

3. **Testing & QA** (Week 3)
   - Complete feature audit
   - Performance optimization
   - Security review

---

**Questions?** Check:
- This document (you're reading it!)
- Dev server logs: `tail -100 /tmp/dev.log`
- Browser console: F12 → Console
- Supabase dashboard: https://app.supabase.com
