# InternMatch ET — Architecture

## System Overview

InternMatch ET is a multi-role web platform built on Next.js 16 (App Router) with Supabase as the backend. All data fetching for initial page loads happens server-side in Server Components; client interactions use Server Actions or lightweight client-side Supabase queries.

```
┌─────────────────────────────────────────────────────────┐
│                      Browser / Mobile                   │
│   Next.js App Router (React Server + Client Components) │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
         ┌─────────────▼──────────────┐
         │      Vercel Edge / Node    │
         │  Next.js Server (proxy.ts) │
         │  Server Actions / RSC      │
         │  Route Handlers (API)      │
         └─────────────┬──────────────┘
                       │ Supabase SDK
         ┌─────────────▼──────────────┐
         │         Supabase           │
         │  PostgreSQL + RLS          │
         │  Auth (JWT)                │
         │  Storage (S3-compatible)   │
         └────────────────────────────┘
```

## Data Flow

1. **Authentication** — Supabase Auth issues a JWT stored in an HTTP-only cookie. The proxy (`src/proxy.ts`) refreshes the session on every request, protecting routes before any page renders.

2. **Server Components** — Most pages fetch data directly from Supabase using the server client (`createClient()` from `src/lib/supabase/server.ts`). No exposed API keys; all queries run server-side.

3. **Server Actions** — Mutations (apply, save draft, approve placement, issue letter) are `'use server'` functions that validate with Zod and call Supabase with the server client.

4. **Client Components** — Used only for interactivity: forms, toasts, charts, message threads. They use `createClient()` from `src/lib/supabase/client.ts` (anon key only) for optimistic UI and real-time-like updates.

5. **Row Level Security** — Every table has RLS enabled. The database enforces access control independently of the application layer. Even if a Server Action has a bug, the database policy prevents unauthorised reads/writes.

## Role & Permission Matrix

| Action | Student | Company | Coordinator | Admin |
|--------|---------|---------|-------------|-------|
| Read open internships | ✓ | ✓ | ✓ | ✓ |
| Post internships | — | verified only | — | ✓ |
| Apply to internship | ✓ | — | — | — |
| View applicants | — | own only | — | ✓ |
| Schedule interview | — | own only | — | ✓ |
| Send offer | — | own only | — | ✓ |
| Approve placement | — | — | own uni | ✓ |
| Issue placement letter | — | — | own uni | ✓ |
| Submit logbook | ✓ | — | — | — |
| Review logbook | — | supervisor | view | ✓ |
| Submit evaluation | — | supervisor | — | ✓ |
| Issue certificate | — | own only | — | ✓ |
| Verify company | — | — | — | ✓ |
| View audit log | — | — | — | ✓ |

## Match Score Algorithm

See `src/lib/matching/matchScore.ts` for the full implementation. The algorithm is a pure function — no I/O, fully unit-tested.

**Formula (weights sum to 100):**

| Component | Weight | How |
|-----------|--------|-----|
| Skills overlap | 40 | `(matched_skills / required_skills) × 40` |
| Field/department | 20 | Exact match = 20, keyword match = 12, no data = 10 |
| Location fit | 15 | Remote = 15, same city = 15, different city = 3 |
| Availability | 15 | Duration diff ≤ 2 weeks = 8; mode preference match = 7 |
| Education level | 10 | Year ≥ required = 10, one below = 5, below = 0 |

Score is computed at application submission time and stored on the `applications` row.

## Key Technical Decisions

1. **Next.js 16 + Turbopack** — `create-next-app` installed Next.js 16 (not 14 as originally spec'd). Turbopack is the default bundler in development. `middleware.ts` was renamed to `proxy.ts` per Next.js 16 conventions.

2. **Tailwind v4** — No `tailwind.config.ts`; configuration lives in `globals.css` as `@theme {}` CSS variables. This is the Tailwind v4 approach.

3. **JSONB for flexible arrays** — Skills, languages, availability, and evaluation ratings are stored as JSONB. This avoids junction tables for MVP and is easy to extend.

4. **DB triggers for side effects** — Status history, notifications, and slot allocation are DB triggers (PostgreSQL functions). This ensures they fire even for direct DB access.

5. **Public verification via RPC** — `verify_document()` is a `SECURITY DEFINER` function granted to the `anon` role. This allows the public verification page to work without authentication while keeping no sensitive data exposed.

6. **ICS generation** — Server-side only, RFC 5545 compliant with line folding, no external dependencies.

7. **PDF CV** — Generated server-side with `pdf-lib`. Runs as a Next.js Route Handler (`/api/cv`). A4 format, ATS-friendly layout.

## Directory Structure

```
src/
├── app/                     # Next.js App Router pages
│   ├── [locale]/            # Locale-prefixed routes
│   │   ├── (auth)/          # Login, register, forgot/reset password
│   │   ├── (student)/       # /student/* — role-gated
│   │   ├── (company)/       # /company/* — role-gated
│   │   ├── (university)/    # /university/* — role-gated
│   │   ├── (admin)/         # /admin/* — role-gated
│   │   ├── internships/     # Public internship browse + detail
│   │   ├── companies/       # Public company listing + detail
│   │   ├── verify/[code]/   # Public document verification
│   │   └── ...              # About, contact, terms, privacy
│   └── api/                 # Route handlers (CV, ICS)
├── components/
│   ├── layout/              # Navbar, Footer, DashboardLayout
│   ├── internships/         # InternshipCard, InternshipFilters
│   └── shared/              # StatusBadge, ProfileCompleteness,
│                            # SkillTagInput, MessageThread, etc.
├── hooks/                   # useUser, useSupabase
├── i18n/                    # next-intl routing + request config
├── lib/
│   ├── supabase/            # client.ts, server.ts, middleware.ts
│   ├── actions/             # Server actions (profile, internships,
│   │                        #   applications, interviews, logbook,
│   │                        #   university)
│   ├── matching/            # computeMatchScore() + unit tests
│   ├── ics/                 # generateICS() — RFC 5545
│   └── pdf/                 # generateCVPDF() — pdf-lib
└── types/                   # TypeScript types (index.ts, database.ts)
```
