-- ============================================================
-- Migration 006: Placements, Logbook, Evaluations, Certificates
-- placements, placement_letters, logbook_entries, evaluations, certificates
-- ============================================================

-- ------------------------------------------------------------
-- placements
-- ------------------------------------------------------------
CREATE TABLE placements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE RESTRICT,
  student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  university_id   UUID REFERENCES universities(id) ON DELETE SET NULL,
  supervisor_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  start_date      DATE NOT NULL,
  end_date        DATE,
  status          placement_status NOT NULL DEFAULT 'pending_approval',
  approved_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_placements_student ON placements(student_id);
CREATE INDEX idx_placements_company ON placements(company_id);
CREATE INDEX idx_placements_university ON placements(university_id);
CREATE INDEX idx_placements_status ON placements(status);

CREATE TRIGGER trg_placements_updated_at
  BEFORE UPDATE ON placements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- Function: generate a unique, URL-safe public verification code
-- Used for placement letters and certificates
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_public_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  code TEXT;
BEGIN
  -- Format: IM-XXXXXX (6 uppercase alphanumeric characters)
  LOOP
    code := 'IM-' || upper(substring(md5(random()::text || now()::text) FROM 1 FOR 8));
    -- Ensure uniqueness across both tables
    EXIT WHEN NOT EXISTS (SELECT 1 FROM placement_letters WHERE public_code = code)
              AND NOT EXISTS (SELECT 1 FROM certificates WHERE public_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- NOTE: placement_letters and certificates tables are created below,
-- so generate_public_code() references them forward — this is fine in PostgreSQL
-- as the function body is executed at runtime, not at definition time.

-- ------------------------------------------------------------
-- placement_letters
-- ------------------------------------------------------------
CREATE TABLE placement_letters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id    UUID NOT NULL REFERENCES placements(id) ON DELETE RESTRICT,
  public_code     TEXT NOT NULL UNIQUE DEFAULT generate_public_code(),
  issued_by       UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ,
  revoked_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  revoke_reason   TEXT
);

CREATE INDEX idx_placement_letters_placement ON placement_letters(placement_id);
CREATE INDEX idx_placement_letters_code ON placement_letters(public_code);

-- ------------------------------------------------------------
-- logbook_entries
-- ------------------------------------------------------------
CREATE TABLE logbook_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id        UUID NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
  week_start          DATE NOT NULL,
  week_end            DATE NOT NULL,
  tasks               TEXT NOT NULL,
  skills_practiced    TEXT,
  challenges          TEXT,
  hours               NUMERIC(5, 1) NOT NULL CHECK (hours > 0),
  attachment_urls     JSONB NOT NULL DEFAULT '[]',
  status              logbook_status NOT NULL DEFAULT 'draft',
  supervisor_comment  TEXT,
  approved_at         TIMESTAMPTZ,
  approved_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One entry per week per placement
  UNIQUE (placement_id, week_start),
  CONSTRAINT chk_week_dates CHECK (week_end > week_start)
);

CREATE INDEX idx_logbook_placement ON logbook_entries(placement_id);
CREATE INDEX idx_logbook_status ON logbook_entries(status);

CREATE TRIGGER trg_logbook_updated_at
  BEFORE UPDATE ON logbook_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- Function: auto-calculate logbook totals for a placement
-- Returns {weeks_completed, total_hours, approval_rate}
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_logbook_summary(p_placement_id UUID)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  total_weeks   INTEGER;
  approved_weeks INTEGER;
  total_hours   NUMERIC;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status IN ('submitted', 'approved')),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COALESCE(SUM(hours) FILTER (WHERE status = 'approved'), 0)
  INTO total_weeks, approved_weeks, total_hours
  FROM logbook_entries
  WHERE placement_id = p_placement_id;

  RETURN jsonb_build_object(
    'weeks_completed', total_weeks,
    'approved_weeks',  approved_weeks,
    'total_hours',     total_hours,
    'approval_rate',   CASE WHEN total_weeks > 0
                         THEN ROUND((approved_weeks::NUMERIC / total_weeks) * 100)
                         ELSE 0 END
  );
END;
$$;

-- ------------------------------------------------------------
-- evaluations
-- ------------------------------------------------------------
CREATE TABLE evaluations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id    UUID NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
  type            evaluation_type NOT NULL,
  -- ratings: {punctuality, technical_skills, communication, teamwork, initiative}
  -- each value 1-5
  ratings         JSONB NOT NULL DEFAULT '{}',
  comments        TEXT,
  recommendation  TEXT,
  submitted_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  visible_to_student BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (placement_id, type)
);

CREATE INDEX idx_evaluations_placement ON evaluations(placement_id);

-- ------------------------------------------------------------
-- certificates
-- ------------------------------------------------------------
CREATE TABLE certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id    UUID NOT NULL UNIQUE REFERENCES placements(id) ON DELETE RESTRICT,
  public_code     TEXT NOT NULL UNIQUE DEFAULT generate_public_code(),
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by       UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  revoked_at      TIMESTAMPTZ,
  revoked_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  revoke_reason   TEXT,
  -- Snapshot of data at issuance: {student_name, company_name, role, duration, hours, supervisor}
  data            JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_certificates_placement ON certificates(placement_id);
CREATE INDEX idx_certificates_code ON certificates(public_code);
