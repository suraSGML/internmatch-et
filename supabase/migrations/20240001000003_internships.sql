-- ============================================================
-- Migration 004: Internships
-- internships, internship_skills, internship_questions
-- ============================================================

CREATE TABLE internships (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field_id                    UUID REFERENCES fields(id) ON DELETE SET NULL,
  -- posted by (company member who created it)
  posted_by                   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title                       TEXT NOT NULL,
  description                 TEXT NOT NULL,
  requirements                TEXT,                   -- free-text requirements
  required_skills             JSONB NOT NULL DEFAULT '[]',  -- [{name, level?}]
  required_department         TEXT,                   -- e.g. "Computer Science"
  required_year_min           SMALLINT,               -- min year of study
  location_city               TEXT,
  work_mode                   work_mode NOT NULL DEFAULT 'on_site',
  duration_weeks              SMALLINT NOT NULL CHECK (duration_weeks > 0),
  start_date                  DATE,
  deadline                    DATE NOT NULL,
  slots                       SMALLINT NOT NULL DEFAULT 1 CHECK (slots > 0),
  filled_slots                SMALLINT NOT NULL DEFAULT 0,
  is_paid                     BOOLEAN NOT NULL DEFAULT FALSE,
  stipend_amount              NUMERIC(12, 2),         -- ETB, NULL if unpaid
  benefits                    TEXT,
  responsibilities            TEXT,
  supervisor_id               UUID REFERENCES profiles(id) ON DELETE SET NULL,
  requires_university_approval BOOLEAN NOT NULL DEFAULT FALSE,
  status                      internship_status NOT NULL DEFAULT 'draft',
  views_count                 INTEGER NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure filled_slots never exceeds slots (additional check at offer-accept trigger)
  CONSTRAINT chk_filled_slots CHECK (filled_slots <= slots)
);

CREATE INDEX idx_internships_company ON internships(company_id);
CREATE INDEX idx_internships_field ON internships(field_id);
CREATE INDEX idx_internships_status ON internships(status);
CREATE INDEX idx_internships_deadline ON internships(deadline);
CREATE INDEX idx_internships_city ON internships(location_city);
CREATE INDEX idx_internships_work_mode ON internships(work_mode);

-- Full-text search index
CREATE INDEX idx_internships_fts ON internships
  USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE TRIGGER trg_internships_updated_at
  BEFORE UPDATE ON internships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- internship_questions: optional screening questions per internship
-- ------------------------------------------------------------
CREATE TABLE internship_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id   UUID NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  question        TEXT NOT NULL,
  is_required     BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_internship_questions_internship ON internship_questions(internship_id);

-- ------------------------------------------------------------
-- saved_internships
-- ------------------------------------------------------------
CREATE TABLE saved_internships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  internship_id   UUID NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, internship_id)
);

CREATE INDEX idx_saved_internships_user ON saved_internships(user_id);

-- ------------------------------------------------------------
-- saved_searches
-- ------------------------------------------------------------
CREATE TABLE saved_searches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  -- JSON filter object: {field_id, city, work_mode, is_paid, keyword, ...}
  filters     JSONB NOT NULL DEFAULT '{}',
  alert_on    BOOLEAN NOT NULL DEFAULT TRUE,   -- receive email alerts for new matches
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
