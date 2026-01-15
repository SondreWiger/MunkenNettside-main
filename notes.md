# Project Understanding Notes

## Project Overview
**Teateret** - Norwegian Theater Platform

This is a comprehensive theater management platform built with Next.js, Supabase, and TypeScript. The platform handles multiple aspects of theater operations.

### Core Features
1. **Theater Productions & Performances** - Managing shows, performances, and productions
2. **Ticket Booking System** - Complete booking flow with seat selection
3. **User Management** - Customer accounts, actor profiles, staff/admin roles  
4. **Family Account System** - Parent-child account connections with permissions
5. **PayPal Integration** - Payment processing for tickets
6. **Recording System** - "Opptak" (recordings/auditions) with purchase capabilities
7. **Ensemble Management** - Groups/classes with enrollment system
8. **Box Office Management** - Staff tools for ticket sales

### Technical Stack
- **Frontend**: Next.js 14+ (App Router), React, TypeScript
- **Styling**: Tailwind CSS with custom theme system
- **UI Components**: Radix UI primitives
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth
- **Payments**: PayPal integration
- **Deployment**: Vercel
- **Analytics**: Vercel Analytics

### Application Structure
```
app/
├── page.tsx                    # Homepage
├── forestillinger/            # Shows/Performances
├── opptak/                    # Recordings/Auditions  
├── billetter/                 # My tickets
├── kurs/                      # Courses
├── ensemble/                  # Groups/ensembles
├── dashboard/                 # User dashboard & settings
├── actor/[id]/               # Actor profiles
├── skuespiller/              # Actor-specific tools
├── admin/                    # Admin dashboard & tools
│   ├── ensembler/           # Manage ensembles
│   ├── forestillinger/      # Manage shows
│   ├── bestillinger/        # Manage bookings  
│   ├── brukere/            # Manage users
│   ├── venues/             # Manage venues
│   └── statistics/         # Platform statistics
├── api/                     # API routes
├── legal/                   # Legal documents
├── use/                     # Developer documentation
└── ...
```

### Key User Flows
1. **Customer**: Browse shows → Book tickets → View tickets → Access recordings
2. **Actor**: Profile management → Schedule viewing → Wardrobe info
3. **Admin**: Dashboard → Manage shows/users/bookings → Statistics
4. **Family**: Parent connects child accounts → Manage permissions → Enrollment

### Database Architecture (from 000-complete-setup.sql)
- **Users table** - Extended auth with roles, profiles, family connections
- **Family connections** - Parent-child account relationships
- **Performances** - Show scheduling and venue management
- **Bookings** - Ticket purchases with seat selection
- **Recordings (Opptak)** - Digital content with purchase system
- **Ensembles** - Groups/classes with enrollment
- **Venues & Seatmaps** - Physical theater layout management

### Key Norwegian Terms
- **Forestillinger** = Performances/Shows
- **Opptak** = Recordings/Auditions  
- **Billetter** = Tickets
- **Ensemble** = Groups/Classes
- **Kasse** = Box Office
- **Skuespiller** = Actor
- **Innstillinger** = Settings

### Current State
- Platform is under active development with construction warning
- Recent focus on admin onboarding and QR removal
- Comprehensive SQL setup with RLS policies
- Family account system recently implemented
- PayPal integration with webhook handling
- Developer documentation system in `/use/`

### Architecture Patterns
- Server-side rendering with theme tokens
- Row Level Security (RLS) for data access
- Service role for admin operations
- Client/server Supabase client separation
- Theme customization system
- Email-based verification system

The platform is a sophisticated theater management system with user management, booking capabilities, and content delivery features.