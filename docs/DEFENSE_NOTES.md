# InternMatch ET — Defense Notes

## Problem Statement

Ethiopian universities produce tens of thousands of graduates each year, yet the internship
placement process remains manual: Excel sheets, paper letters, phone calls, and WhatsApp groups.
Students struggle to find relevant opportunities; companies have no structured way to reach
qualified candidates; university coordinators have no visibility into where their students are
placed or how they are progressing.

**InternMatch ET** solves this by providing a dedicated, Ethiopia-specific platform that
replaces manual processes with a structured, digital workflow.

---

## Differentiation from a General Job Board

| Feature | General Job Board | InternMatch ET |
|---------|------------------|----------------|
| Match scoring | ❌ | ✓ Transparent 5-component formula |
| University integration | ❌ | ✓ Placement approval, letters, logbook |
| Weekly logbook | ❌ | ✓ Supervisor review, approval workflow |
| Verifiable certificates | ❌ | ✓ QR code, public verification page |
| Placement letters | ❌ | ✓ University-issued, QR-verified |
| Internship-specific filters | ❌ | ✓ Duration, university approval, year |
| Ethiopian context | ❌ | ✓ ETB, Amharic, Ethiopian cities |
| Scam prevention | ❌ | ✓ Verified companies, payment warnings |

---

## Design Decisions

### 1. Why Supabase?
Supabase provides PostgreSQL (full SQL, triggers, RLS), Auth (JWT, email/password, Google),
and Storage in a single managed service. For a student project with a tight timeline,
it eliminates the need to build and operate an auth system or file storage from scratch.
Row Level Security means security policies are enforced at the database level — not just
in application code — which is architecturally sound.

### 2. Why Next.js App Router (Server Components)?
Server Components allow data fetching and rendering on the server, which reduces JavaScript
bundle size and improves page load speed on slow mobile connections — a primary concern for
Ethiopian users. Client Components are used only where interactivity is required.

### 3. Why a Weighted Formula Instead of ML?
The match score uses a transparent, explainable formula (skills × 40 + field × 20 +
location × 15 + availability × 15 + education × 10). This is appropriate for an MVP because:
- It is explainable to users ("matches 4 of 6 required skills")
- It is easy to unit-test (14 tests, all passing)
- It does not require training data or GPU infrastructure
- It can be replaced with vector embeddings later without changing the public interface

### 4. Why DB Triggers for Side Effects?
Status history, notifications, and slot allocation happen in PostgreSQL triggers, not
application code. This ensures they fire even if a developer calls Supabase directly,
and prevents bugs from bypassing important business logic.

### 5. Why JSONB for Skills and Ratings?
Storing skills as `[{name, level}]` JSONB avoids junction tables for MVP. The data is queried
in application code (the match algorithm), not with complex SQL joins. This is a deliberate
trade-off: easier to develop now, can be normalised later for reporting.

### 6. Why i18n from Day One?
Ethiopia has multiple languages. Building i18n in from the start (next-intl, English + Amharic)
means adding Afaan Oromo or Tigrinya later requires only a new `messages/{locale}.json` file
— no architectural changes.

---

## Limitations

1. **No real-time push notifications** — Notifications are fetched on page load/navigation.
   Real-time would require Supabase Realtime subscriptions (planned for future).

2. **CV PDF uses Helvetica only** — `pdf-lib`'s standard fonts do not support Ethiopic script.
   Amharic CV labels are transliterated to Latin. Full Amharic PDF requires embedding a
   custom Ethiopic font (e.g. Noto Serif Ethiopic).

3. **Match score is not personalised** — The formula uses static weights. A recommendation
   system with user feedback loops would improve accuracy over time.

4. **No mobile app** — The web app is mobile-responsive but not a native app. PWA or
   React Native is a natural next step.

5. **No Ethiopian calendar display** — Dates are stored and displayed as Gregorian.
   Ethiopian calendar conversion is a display-only change that can be added later.

6. **Email notifications not wired** — The Resend integration is scaffolded but email
   sending is not fully implemented. In-app notifications work fully.

---

## Future Work

| Feature | Notes |
|---------|-------|
| AI matching with embeddings | Replace weighted formula with sentence-transformer embeddings for skill and description matching |
| Telegram bot | Notify students of new matching internships and interview reminders via Telegram (very popular in Ethiopia) |
| Mobile app | React Native with shared Supabase backend |
| Ethiopian calendar | Display-only conversion; Gregorian stored in DB |
| More languages | Afaan Oromo, Tigrinya — only need new `messages/` files |
| Job placement after graduation | Extend the platform to full-time job placement |
| Employer branding | Company pages with photos, culture content, employee testimonials |
| Analytics dashboard | Admin platform-wide statistics with Recharts |
| Rate limiting middleware | Per-IP rate limiting on auth and form endpoints |

---

## Testing Summary

### Unit Tests (Vitest)
- **`matchScore.test.ts`** — 14 tests covering all algorithm branches:
  full match, zero match, partial match, remote location, year requirements,
  empty skills, case-insensitivity

### Manual Test Flows (to demonstrate at defense)
1. Register as student → onboarding → complete profile → browse internships → apply
2. Register as company → get verified (admin) → post internship → review applicants → schedule interview → send offer
3. Student accepts offer → university coordinator approves placement → issues placement letter
4. Intern submits weekly logbook → supervisor approves → coordinator views
5. Supervisor submits final evaluation → issues completion certificate → verify at `/verify/[code]`
6. Download `.ics` calendar invite from student interviews page
7. Download CV PDF from student CV page
8. Export placement CSV from university reports page

---

## Key Metrics (seed data)

- 12 users across 4 roles
- 4 verified companies (IT, finance, telecom)
- 5 internships (IT, accounting, marketing)
- 6 applications in various statuses
- 1 active placement with 4 logbook entries (2 approved, 1 submitted, 1 draft)
- 1 mid-term evaluation (all 5 criteria rated)
- 1 placement letter with verifiable code `IM-DEMO0001`
