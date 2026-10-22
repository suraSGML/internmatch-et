# InternMatch ET

**InternMatch ET** is a production-quality internship matching, tracking, and placement platform built for Ethiopia. It connects students and fresh graduates with companies, and gives universities tools to manage and monitor student placements.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Forms | React Hook Form + Zod |
| Data fetching | Server Components + TanStack Query |
| i18n | next-intl (English + Amharic) |
| Charts | Recharts (Phase 9) |
| PDF | pdf-lib (Phase 8 & 9) |
| Email | Resend (Phase 6+) |
| Deployment | Vercel + Supabase Cloud |

## Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project (free tier works) — [supabase.com](https://supabase.com)

## Setup

### 1. Clone and install

```bash
cd internmatch-et
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Supabase project URL and anon key (from Supabase Dashboard → Project Settings → API).

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/en` (English) by default.

Switch to Amharic: [http://localhost:3000/am](http://localhost:3000/am)

### 4. Run migrations (Phase 2+)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Generate TypeScript types
npx supabase gen types typescript --project-id your-project-ref > src/types/database.ts
```

### 5. Reset local database

```bash
supabase db reset   # rebuilds the local database; no demo accounts are seeded
```

## Project Structure

```
internmatch-et/
├── src/
│   ├── app/
│   │   └── [locale]/               # Locale-prefixed routes (en, am)
│   │       ├── (auth)/             # Auth pages (login, register, etc.)
│   │       ├── (student)/          # Student dashboard routes
│   │       ├── (company)/          # Company dashboard routes
│   │       ├── (university)/       # University coordinator routes
│   │       ├── (admin)/            # Admin routes
│   │       ├── layout.tsx          # Root locale layout + i18n provider
│   │       └── page.tsx            # Home page
│   ├── components/
│   │   ├── layout/                 # Navbar, Footer, DashboardLayout
│   │   └── ui/                     # shadcn/ui components
│   ├── hooks/                      # useUser, useSupabase
│   ├── i18n/                       # next-intl routing + request config
│   ├── lib/
│   │   ├── supabase/               # client.ts, server.ts, middleware.ts
│   │   └── utils.ts                # cn(), formatETB(), formatDate()
│   ├── middleware.ts               # Auth + locale + role routing
│   └── types/                      # TypeScript types (index.ts, database.ts)
├── messages/
│   ├── en.json                     # English translations
│   └── am.json                     # Amharic translations
├── supabase/
│   ├── migrations/                 # SQL migration files (Phase 2)
│   └── seed.sql                    # Intentionally empty; no mock data is loaded
├── .env.example                    # Environment variable template
└── next.config.ts                  # Next.js + next-intl config
```

## Build Phases

- [x] **Phase 1**: Foundation — project setup, auth, i18n, base layout, home page
- [ ] **Phase 2**: Database — migrations, RLS policies, storage buckets, triggers, seed data
- [ ] **Phase 3**: Profiles & onboarding — student, company, university profiles; admin verification
- [ ] **Phase 4**: Internships & discovery — CRUD, browse, search, filters, detail pages
- [ ] **Phase 5**: Applications & matching — apply flow, match score algorithm, applicant pipeline
- [ ] **Phase 6**: Interviews & offers — scheduling, `.ics` download, offers, slot handling, messaging
- [ ] **Phase 7**: University module — placement approval, placement letters with QR, student tracking
- [ ] **Phase 8**: Logbook, evaluations, certificates — weekly logbook, evaluations, completion certs, verification page
- [ ] **Phase 9**: CV builder & dashboards — CV PDF templates, dashboards, charts, CSV/PDF reports
- [ ] **Phase 10**: Polish & launch — performance, a11y, SEO, security review, tests, deployment guide

## User Roles

| Role | Access |
|---|---|
| `student` | Profile, CV, applications, logbook, certificates |
| `company` | Post internships, review applicants, manage interns |
| `university` | Approve placements, issue letters, monitor logbooks |
| `admin` | Verify companies/universities, moderate, platform stats |

## Testing (Phase 10)

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

## Deployment (Phase 10)

See `docs/ARCHITECTURE.md` for full deployment guide.

Quick start:
1. Push to GitHub
2. Import to Vercel, set environment variables
3. Link Supabase project, push migrations

## Documentation

- `docs/ARCHITECTURE.md` — System overview, data flow, role matrix
- `docs/DATABASE.md` — ERD and table explanations
- `docs/USER_GUIDE.md` — User guides for each role
- `docs/DEFENSE_NOTES.md` — Problem statement, design decisions, limitations, future work
