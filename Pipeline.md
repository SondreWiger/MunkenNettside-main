## Pipeline — small features to full-site roadmap

Yes.

This document describes a repeatable, secure, design-focused workflow for working on small features and the larger plan to finish the site. I wrote it so the assistant (and you) can follow the same process every time. Keep this file as the canonical pipeline; I will adhere to it unless you tell me otherwise.

## Quick contract (for every task)
- Inputs: short description, acceptance criteria, priority, optional designs/assets, branch name (feature/*). If a DB change is required, include SQL change details and target migration (see SQL rules below).
- Outputs: a working branch, minimal tests (unit/integration), a short PR description, and a release checklist (build, lint, tests passing).
- Error modes: failing tests, lint/type errors, DB migration conflicts, or security warnings.
- Success: PR approved, merged to `main` with a passing CI and deployed to staging.

## Principles
- Small commits, descriptive messages, one feature per branch.
- Security-first: treat user data and auth flows as sensitive. Validate inputs and sanitize outputs.
- Design parity: pages should match provided designs (or improve them with a short note). Use existing component library and Tailwind tokens.
- Test where it matters: business logic, payment flows, seat/reservation logic, and API endpoints.
- Communicate: open an issue or short ticket with acceptance criteria; I will ask clarifying questions if anything is missing.

## How to approach a small development (idea → done)
1. Capture: write a one-paragraph description and 3 acceptance criteria in an issue or a short message here.
2. Scoping (10–30 min): I will propose a minimal implementation (files to change, data flows, whether DB changes needed). You approve or tweak.
3. Branch & contract: create branch `feature/<short-name>` and add the contract (inputs/outputs) to the PR description.
4. Implement: make focused commits. Follow existing patterns: Next.js App Router pages under `app/`, API routes under `app/api/`, and UI in `components/`.
   - UI changes: reuse `components/ui/*` and `components/layout/*`. Keep styles in `app/globals.css` or component-level styles.
   - Data: use existing `lib/supabase/` helpers for DB access; prefer server components for data fetching unless interactivity requires client components.
5. Tests: add small unit tests for logic in `lib/` and a lightweight integration (e2e) where payments or booking flows change.
6. PR: include a short testing checklist, screenshots (if UI), and the acceptance criteria. Use the PR template below.
7. Review: I’ll update or iterate quickly on feedback. Keep reviews fast — 1–2 reviewers max for small tasks.
8. Merge & deploy: after CI passes, merge and push to staging. Verify the feature on staging with the test checklist.

PR description template (short):
- Title: [feature] short summary
- Description: what changed and why.
- Files changed: list of important files.
- Acceptance: copy-paste criteria and indicate pass/fail for each.
- Testing steps: quick manual steps and any environment variables required.

## Security checklist (apply to every PR that touches auth/payment/data)
- Validate and sanitize all user inputs server-side.
- Do not log secrets or full payment data.
- Use prepared statements or library helpers for DB queries (avoid string concat SQL).
- Check third-party packages for known vulnerabilities (run `pnpm audit` / `npm audit`).
- Ensure RLS policies and migrations remain intact; if changing tables, update `scripts/000-complete-setup.sql` or `scripts/000-...` as required (see SQL rules below).

## SQL rules (critical)
- ALWAYS work updates and new SQL in the `scripts/000-complete-setup.sql` (or other `000-*` file as agreed). Do not create new top-level SQL files unless necessary.
- Run SQL against a local/staging DB first. Keep backups and use transactions where appropriate.
- When modifying data shapes: add a backward-compatible migration (add columns first, backfill, then switch code, then remove old columns in a later migration).

## Design & UX rules
- Follow the Tailwind tokens in `tailwind.config.mjs` and the components in `components/ui/`.
- Maintain accessibility: semantic HTML, aria attributes for dynamic components, and keyboard focus for modals.
- For new pages, mock with static data first; then wire to API.
- Screenshots for visual changes required in PRs.

## Collaboration & communication
- Use this assistant as your pair programmer — give a concise task and acceptance criteria and I’ll implement it.
- If you want design work, attach a screenshot or a Figma link and mark required breakpoints.
- Code review: comment inline; I’ll respond and update the branch. If something needs deeper discussion, we move to a short thread or call.

## Tests, CI and linting
- Add fast unit tests for pure logic (lib/). Keep tests deterministic.
- CI should run: lint, typecheck, unit-tests, build. If a PR adds pages or server routes, run a minimal production build in CI to catch SSR issues.
- Required checks: `lint`, `typecheck`, `test`, `build`.

## Release & deployment
- Merge to `main` once PR approved and CI green.
- Deploy to staging automatically (CI/CD). Manually test important flows (login, booking, purchase, seat reservation).
- When ready, deploy to production during a low-traffic window.

## Monitoring & rollback
- Add basic monitoring for errors (Sentry or similar) and logs for payments.
- Keep deploys traceable: tag releases and include migration IDs.
- For severe issues: revert the PR and quickly run a rollback migration if DB changes are unsafe.

## Larger site-wide roadmap (finish the site)
Phase A — Stabilize core flows (1–2 weeks)
- Inventory: finalize route map (`site-map.mmd`) and critical APIs.
- Stabilize booking flows: reserve → purchase → confirmation. Add tests and monitoring.
- Harden auth: passwordless and verify flows; ensure redirects and `redirect` query parameters work.

Phase B — Admin and tooling (1–2 weeks)
- Finish admin pages for venues, ensembles, shows, courses and discount codes.
- Add admin safety checks (rate-limits, CSRF protections on server routes, authentication checks on admin APIs).

Phase C — Polishing, accessibility and performance (1–2 weeks)
- Visual polish and design pass; accessibility audit and fixes.
- Optimize images, add caching headers for static assets, and review Next.js caching strategies.

Phase D — Launch prep and hardening (1 week)
- Final security audit, load testing for booking flows, and rollback plan.

Phase E — Post-launch
- Monitor for errors and metrics. Prioritize critical fixes and user feedback.

## Edge cases & risks
- Race conditions on seat reservations: implement optimistic locking or careful transactional logic in server routes.
- Payment failures: ensure idempotency and recovery paths.
- DB schema drift: maintain migration discipline and avoid destructive migrations without backups.

## How you (manager) and I (assistant) will cooperate
- You: provide clear tasks with acceptance criteria, priority, and design assets if relevant.
- Me (assistant): implement, ask clarifying questions, open PRs, run local checks, and iterate quickly.
- We: keep a short TODO for the sprint in `TODO.md` (the assistant will keep it updated). I will update progress after each major action.

## Lightweight governance & PR rules
- One feature = one branch. Keep PRs < 300 lines if possible.
- Include a short PR description and the test checklist. Approve when tests pass and acceptance criteria satisfied.

## Files to check first when starting a task
- UI: `components/ui/*`, `components/layout/*`
- Pages: `app/.../page.tsx`, `app/layout.tsx`
- APIs: `app/api/.../route.ts`
- DB: `scripts/000-complete-setup.sql` (or other `000-*.sql` files)

## Final note
Keep this file synced with how we actually work. If any rule needs to change, update `Pipeline.md` and I will follow the new rules.

---
If you want, I can now:
- Add a short PR template file with the PR description & test checklist.
- Convert this to a checklist JSON used by the assistant.
