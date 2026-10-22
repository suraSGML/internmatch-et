# Phase 2 Summary — Database

## Status: ✅ Complete

## Migration Files (9 total)

| File | What it creates |
|------|----------------|
| `20240001000000_enums.sql` | 16 enum types (user_role, application_status, placement_status, etc.) |
| `20240001000001_profiles.sql` | profiles, universities (7 seeded), departments, university_members, student_profiles, education, experience, projects, student_certifications. Triggers: handle_new_user (auto-creates profile on signup), update_updated_at |
| `20240001000002_companies.sql` | fields (15 categories, EN+AM), skills (40 tags), companies, company_members, verification_documents. Trigger: auto-slug generation |
| `20240001000003_internships.sql` | internships (with FTS index), internship_questions, saved_internships, saved_searches |
| `20240001000004_applications.sql` | applications (unique constraint prevents duplicates), application_answers, application_events (auto-logged by trigger), application_notes, interviews, offers. Trigger: handle_offer_accepted (transactional slot allocation with FOR UPDATE lock) |
| `20240001000005_placements.sql` | placements, placement_letters (unique public_code), logbook_entries (unique per week), evaluations (midterm+final), certificates. Function: get_logbook_summary(), generate_public_code() |
| `20240001000006_messaging.sql` | messages, notifications, reports, audit_logs (append-only via RULE), announcements. Triggers: notify_application_status_change, notify_new_application, notify_logbook_update. Functions: create_notification(), write_audit_log(), verify_document() |
| `20240001000007_rls.sql` | RLS enabled on every table. Helper functions: auth_role(), is_admin(), my_company_ids(), my_university_ids(). 50+ explicit policies. verify_document() granted to anon role |
| `20240001000008_storage.sql` | Storage policies for 5 buckets: avatars (public), company-logos (public), cvs (private), verification-docs (private), logbook-attachments (private) |

## Seed Data
`supabase/seed.sql` is intentionally disabled; local database resets do not insert mock accounts or sample activity. The previous demo records can be removed from a disposable test database with `supabase/cleanup_demo_seed.sql`.

## RLS Tests
`supabase/tests/rls_test.sql` — 12 test cases covering:
- Student cannot read another student's applications
- Company cannot see applications for another company's internship
- Coordinator can only see their own university's students
- Student cannot update another student's logbook
- Student cannot insert an internship
- Slot over-allocation is blocked
- Public verify_document() works without auth
- Audit log is append-only

## Key Design Decisions
1. **JSONB for flexible arrays** (skills, languages, availability) — easier to query and extend than junction tables for MVP; can be normalized later
2. **Triggers for automation** — status history, slot allocation, notifications all happen at DB level, not app layer — prevents bypassing via direct DB access
3. **SECURITY DEFINER functions** for cross-table operations (notifications, audit logs) — avoids RLS recursion issues
4. **FOR UPDATE locks** in offer acceptance trigger — prevents race conditions when multiple offers are accepted simultaneously
5. **append-only audit log** via PostgreSQL RULE — cannot be tampered with even by service role

## How to Apply
```bash
supabase start          # start local Supabase
supabase db reset       # apply migrations; no mock data is seeded
npx supabase gen types typescript --local > src/types/database.ts
```
