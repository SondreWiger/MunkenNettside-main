Yes.

# Documentation expansion — TODO

# Critical Fixes Completed (Jan 15, 2026)
- [x] Fixed all TypeScript compilation errors (window.gtag, ButtonProps, Response destructuring)
- [x] Created complete waitlist API endpoints for ensembles and kurs
  - GET /api/ensembles/[id]/waitlist - View waitlist
  - POST /api/ensembles/[id]/waitlist - Add to waitlist
  - DELETE /api/ensembles/[id]/waitlist - Remove from waitlist
  - POST /api/ensembles/[id]/waitlist/promote - Auto-promote next person
  - Same for /api/kurs/[id]/waitlist/*
- [x] Added ErrorBoundary component to root layout with user-friendly error display
- [x] Cleaned SQL duplicates (removed duplicate admin_roadmap section)
- [x] Added logger utility (lib/utils/logger.ts) for conditional console logging
- [x] Verified PayPal integration (already complete for tickets, recordings, and kurs)
- [x] Added accessibility improvements (ARIA labels, role attributes, descriptive text)

# Current Session (COMPLETED)
- [x] Fixed mobile seat map UX - complete rewrite of unified-seat-booking.tsx with mobile-first design
- [x] Added ensemble capacity settings (max_actors, waitlist_enabled, auto_accept_enabled)
- [x] Added kurs capacity settings (waitlist_enabled, auto_accept_enabled)
- [x] Created waitlist tables in SQL schema (ensemble_waitlist, kurs_waitlist)
- [x] Reworked user management for scale (pagination, search, filtering, tabs)

# Recent tasks (in-progress)
- [x] Replace QR-first admin onboarding with email-only verification (send code via email)
- [x] Disable QR verification endpoint and remove QR scanner from login flow
- [x] Add `superadmin` role with appropriate server and RLS policy updates
- [ ] Cleanup: consider removing QR columns/tables and QR email helpers if fully deprecated

# Admin Panel Redesign (COMPLETED)
- [x] Redesigned admin layout with grouped sidebar navigation
- [x] Added 4 navigation groups: Oversikt, Innhold, Salg, System
- [x] Mobile dropdown menu for admin navigation
- [x] Redesigned admin dashboard with live data panels
- [x] Compact stat cards in 5-column grid
- [x] Recent bookings and upcoming shows panels
- [x] Quick actions grid with 6 items
- [x] Removed duplicate /admin/settings folder (kept /admin/innstillinger)

# Admin Subpages UI/UX Overhaul (COMPLETED)
- [x] /admin/bestillinger - Stats cards, improved search, better booking list cards
- [x] /admin/ensembler - Card grid layout, stage colors, dropdown actions
- [x] /admin/forestillinger - Date-based grouping, timeline-style cards
- [x] /admin/rabattkoder - Usage progress bars, card grid, copy functionality
- [x] /admin/venues - Icon cards, seat map status indicator
- [x] /admin/brukere - Consistent header styling
- [x] /admin/innstillinger - Section icons, grouped form layout
- [x] /admin/kurs - Participant progress bars, level colors, card grid
- [x] /admin/statistics - Revenue gradient card, enrollment stats cards
- [x] /admin/scan - Added page header

Goal: Cover the entire codebase with developer-facing documentation under `/use`.

Tasks:
- [ ] Add page for `components/` (overview, common UI primitives, how to add new components).
- [ ] Add page for `layout/` (Header/Footer, app/layout.tsx, theme tokens).
- [ ] Add page for `lib/supabase/` describing client/server/admin usage and security rules.
- [ ] Add page for `scripts/` and `scripts/000-complete-setup.sql` (migrations, seeds, idempotency practices).
- [ ] Add page for `testing` and `CI` (how to run tests, lint, tsc, CI workflow in .github/workflows).
- [ ] Add page for `design` (Design_Styling_Plan.md and Tailwind tokens usage).
- [ ] Add page for `payments` (PAYPAL_SETUP.md, webhook handling and idempotency hints).
- [ ] Add page for `server patterns` (App Router notes, route handler signatures, error handling).
- [ ] Add page for `security` (RLS, service-role key handling, secrets guidance).
- [ ] Add page for `seatmap` (lib/seat-map-types.ts, seat locking/reservation logic).
- [ ] Update `lib/docs.ts` index with the new pages and add links in sidebar.
- [ ] Add small examples and links to key files for each page.

Implementation notes:
- I'll create pages under `app/use/*` for each item above and add short but precise content including file references and commands.
- After adding pages, I'll run `pnpm -s tsc --noEmit` and fix any issues.
I'll write a tracked TODO list for the planning task (inventory, gap analysis, fixes, roadmap and first implementation steps).

This file now lists only the remaining, unimplemented items and next actions. Implemented items were removed.

Remaining gaps and prioritized TODOs

Payments & finance
  - Stripe/PSP integration (checkout sessions, webhooks, refunds, subscriptions)
  - Transaction logs and accounting export support

Seat management & booking
  - Reliable seat locking / holds with DB-level concurrency protection
  - Waitlists and automated release workflows
  - Group bookings and corporate booking flows with invoicing

Box office & operations
  - Offline POS import (CSV) and reconciliation UI
  - Box office daily takings dashboard and exports

Revenue features
  - Dynamic pricing rules and promo management
  - Concessions / merchandise module and fulfillment flow

Marketing & CRM
  - Email automation and campaign integration
  - Promo/affiliate/referral tracking

Platform & infra
  - CI for DB migrations and automated migration testing
  - RLS and role-permission hardening for admin UIs
  - Multi-language support and mobile-first UX improvements
- Audience & product (monetization beyond tickets)
  - Memberships/subscriptions (recurring revenue)
  - Donations / fundraising pages / sponsor packages
  - Merch & concessions (online ordering, pickup)
  - Paid recordings / streaming (video purchases, DRM / access tokens)
  - Upsells and cross-sell in checkout (recordings, merch)
- Marketing & CRM
  - Newsletter / email campaigns, segmentation, automation
  - Promotional codes, affiliate/referral programs
  - Analytics (sales, traffic, conversion), dashboards
  - Event pages and SEO
- Operations & staff tools
  - Admin dashboard (shows, venues, pricing, seatmap editor)
  - Scheduling (rehearsals, tech, cast calendars)
  - Staff permissions & role management, trusted devices
  - Reporting & exports (daily sales, deposits, attendance)
  - Audit logs, security (admin action logs), RLS
- Customer experience & support
  - Account management (profiles, family accounts)
  - Refund/customer service flows, messaging
  - Accessibility support and accessible seating
  - Multi-language, multi-currency (if needed)
- Integrations & extensibility
  - Ticket scanners, access control hardware
  - Accounting systems (Fortnox, Xero), CRM (HubSpot)
  - Payment processors, SMS gateways, push notifications
  - External booking/reseller APIs
- Developer & ops needs
  - Automated migrations, CI, monitoring, scaling, backups
  - Performance for high-demand ticket drops and load spikes

2) What this platform already has (based on repository)
- Core data models and RLS:
  - Users, roles, admin_uuid/admin_verified, admin_devices, admin_action_logs
  - Ensembles (productions), kurs (courses), series, shows, recordings
  - Venues, seats, seat_map_config
  - Shows, seats, bookings, purchases, video_access_tokens
  - Discount codes, site_settings
- Ticketing / sales features:
  - Booking records (bookings table) and seat records
  - Seat maps in venues and seat_map_config (seat-map editor components present)
  - Payment integrations hints: PayPal connect and Vipps references, purchase flows
  - Price tiers, booking_reference, QR code data + QR signature regeneration function
- Admin / security:
  - Admin verification flow (admin_verifications), trusted devices (admin_devices)
  - Admin action logs (audit)
  - RLS policies for most tables
- Audience features:
  - Family accounts, enrollment requests (for courses/ensembles), recordings purchases
  - Video purchases and access tokens
- Utilities & infra:
  - Supabase helpers (server & client), site_settings table, 000-complete-setup.sql
  - Notifications via Supabase Realtime (user-notifications component)
  - Newsletter subscription hook in footer
- Existing work you/assistant added:
  - Productions page, admin reorder UI, trusted-devices UI, guard for realtime fallback (we applied the patch)
  - Several API endpoints for site_settings and admin devices (some caused duplicate-export error to fix)

3) Gaps (what's missing vs what theatres commonly need to earn money)
- Core missing or partial:
  - Robust payment provider coverage (Stripe/PSP integration with recurring subscriptions, webhooks, refunds)
  - Solid POS / offline box office flows and imports
  - Gift cards/vouchers, manual ticket issuance, reseller/freelancer sales
  - Season passes and subscriptions with recurring billing
  - Waitlists & automated seat-release workflows
  - Group bookings / corporate booking workflows & invoicing
  - Dynamic pricing engine (price rules, surge, time-based)
  - QR scanner verification endpoint and gate-control integration (server-side verify)
  - Concessions & merchandise store and order fulfillment
- Marketing & growth:
  - Email automation / campaign scheduling, segments, templates
  - Promo/affiliate/referral management and tracking
  - Analytics dashboards (sales by show/date, conversion funnels)
- Operations & reporting:
  - Detailed financial reports, accounting exports, payout reconciliation
  - Staff scheduling / rehearsal calendars / cast management
  - Box office dashboards with daily takings and reconciliation UI
- Security & reliability:
  - Complete CI + deployment for db migrations and seeds; automated migration testing
  - More thorough admin UI access controls and per-role permissions
- UX & accessibility:
  - Mobile-first ticket purchases, progressive web app features for offline scanning
  - Multi-language support across public pages
- Data & integrations:
  - Export/import tools for legacy offline sales and bulk data
  - API for partners/resellers to create bookings programmatically

4) Prioritized implementation plan (phases with tasks, acceptance, rough effort)
Note: I'll keep estimates as Small (1-3 days), Medium (1-2 weeks), Large (3-8+ weeks).

Phase 0 — Stability & unblockers (Immediate, high priority)
- Task A: Fix duplicate-export route error and re-run full typecheck/lint (Small)
  - Files: investigate route.ts and any other route with duplicate GET export; remove duplicates or merge/rename.
  - Acceptance: tsc/lint passes; dev server runs without route export errors.
- Task B: Verify admin verification flow end-to-end (Small)
  - Confirm Admin UUID prompt appears, request-code and verify-code endpoints work, admin_device cookie set, and trusted devices appear in admin UI.
  - Acceptance: walk-through reproducing flow.
- Task C: Monitoring & realtime fallback (Small) — done: user-notifications guard added.
  - Acceptance: no WebSocket crash; polling fallback works.

Phase 1 — Core ticketing & payments (highest revenue impact)
- Task 1.1: Solidify payment provider integrations (Medium)
  - Add Stripe (or chosen PSP) integration: checkout sessions, webhooks, refunds, recurring subscription support.
  - Files: `app/api/payment/stripe/*`, webhooks handlers, update purchases schema for processor metadata.
  - DB: add transaction logs table.
  - Acceptance: test payments, webhooks handling, refunds.
- Task 1.2: Reliable seat locking and checkout locking + waitlist (Medium)
  - Implement seat-reservation holds with expiration and concurrency protections (DB transactions).
  - Files: `app/api/booking/*`, seat locking logic in server.
  - Acceptance: no double-book under simulated parallel attempts.
- Task 1.3: QR/mobile tickets + scanner verify endpoint (Small → Medium)
  - Create server endpoint to verify QR tickets (validate signature) and a minimal scanner UI for staff.
  - Files: route.ts, `app/box-office/scanner/*`.
  - Acceptance: scanning verifies ticket and marks used; logs audit.
- Task 1.4: Gift cards / vouchers (Small)
  - Add DB tables & APIs; integrate redemption into checkout.
  - Files: 000-complete-setup.sql (add table), `app/api/gift-cards/*`.
  - Acceptance: create and redeem a sample gift card.

Phase 2 — Box office & operations (medium term)
- Task 2.1: Offline POS and import workflow (Medium)
  - CSV import of offline sales to create bookings; reconciliation UI.
  - Acceptance: admin can import CSV sales and reconcile totals.
- Task 2.2: Group and corporate bookings + invoicing (Medium)
  - Booking flow for groups, deposits, and invoice generation.
- Task 2.3: Merchandise & concessions (Medium)
  - Small e-commerce module linked to events and pickup/fulfillment.

Phase 3 — Recurring revenue & marketing (larger)
- Task 3.1: Memberships & subscriptions (Large)
  - Recurring billing, perks mapping, membership management UI.
- Task 3.2: Donations & fundraising pages (Small)
  - Donation forms, receipts, donor lists.
- Task 3.3: Email automation & CRM integrations (Medium)
  - Segments, campaign sending, integration with Mailgun/Sendgrid and/or HubSpot.

Phase 4 — Reporting, analytics & integrations (larger)
- Task 4.1: Finance & accounting exports (Medium)
  - Daily deposit reports, journal exports.
- Task 4.2: Advanced analytics & dashboards (Medium)
  - Sales by show, conversion, retention, cohort analysis.
- Task 4.3: Third-party integrations (Large)
  - Ticket resellers, access control hardware, accounting software.

5) Database migration guidance (where to add schema changes)
- Per repository rules, all new/updated SQL must be added to 000-complete-setup.sql (or other `000-*` file if following their pattern). We'll:
  - Add tables for: gift_cards, vouchers, waitlists, subscriptions (memberships), offline_sales, concessions_items, invoices, transactions.
  - Add indexes and RLS policies that follow existing conventions.
- Example small migration items: gift_cards table and transactions table — implement first.

6) Quick wins (can be implemented now, small effort)
- Finish duplicate-export fix and run full tsc/lint (unblocks everything).
- Add gift-card schema + redemption API (Small, incremental).
- Add QR scanner verify endpoint (Small) to support box office check-in quickly.
- Add offline import endpoint (CSV) minimal implementation for immediate box office use.

7) Longer-term / higher-effort capabilities
- Dynamic pricing engine, recurring subscriptions, full POS hardware integration, staff scheduling and payroll integration, full CRM. These require product design, compliance checks, and multiple iterations.

8) Suggested immediate next actions (concrete, ordered)
- A. Re-run TypeScript & lint, fix duplicate export (TODO #3). I can fix this if you want — I will:
  - Search for duplicate route files that export GET for same path, open and resolve.
- B. Verify admin flow end-to-end (TODO #2). After A finishes and dev server restarts, test login flow and code verification.
- C. Add a small schema change for gift cards in 000-complete-setup.sql (TODO #6) and a minimal API to issue/redeem (Small).
- D. Implement QR verify endpoint and a tiny scanner UI (Small) so front-of-house staff can validate tickets.

9) Risk & edge cases
- Concurrency: seat reservation race conditions — need DB-level locking or advisory locks.
- Payments: require careful webhook idempotency and reconciliation.
- Compliance: storing payment info and PII requires secure handling. Use hosted PSP flows and do not store raw card data.
- RLS & admin flows: tests required to ensure admin-only endpoints are protected by RLS and server checks.

10) Acceptance criteria examples (for a few items)
- Gift card: Admin can create a gift card with value and code; user redeems code at checkout and remainder stored; tests for double redemption prevented.
- QR verify: Scanner endpoint validates signature, marks ticket used, returns seat/customer info.
- Seat locking: In simulated concurrent requests, only one booking completes for same seat.

## Theme tokens and appearance admin (in-progress / done)
- [x] Add `theme_tokens` seed + default values to `scripts/000-complete-setup.sql`
- [x] Add admin API to GET/POST `theme_tokens` (`app/api/admin/site-settings/theme-tokens/route.ts`) with validation
- [x] Add admin UI (`components/admin/site-appearance.tsx`) with live preview, presets, import/export
- [x] SSR injection of theme tokens in `app/layout.tsx` (applies CSS variables on server render)
- [x] Use theme tokens in email templates (`lib/email/*.tsx`) and seat map defaults (`lib/seat-map-types.ts`)
- [x] Add simple token validation util and a small test script (`scripts/test-theme-tokens.mjs`)

Remaining work:
- Sweep remaining components and assets (SVGs, inline styles) to use tokens or CSS variables
- Add visual/regression tests (Playwright or Percy) for key pages
- Add accessibility/contrast check to CI for theme updates
- Allow per-site preset management and import/export from admin UI (import implemented; allow saving presets)

*** End of theme tasks ***