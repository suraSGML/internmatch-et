-- ============================================================
-- Migration 002: Core Profile Tables
-- profiles, student_profiles, education, experience, projects,
-- student_certifications, universities, departments, university_members
-- ============================================================

-- ------------------------------------------------------------
-- profiles: one row per auth.users, role and base fields
-- ------------------------------------------------------------
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'student',
  full_name     TEXT NOT NULL,
  phone         TEXT,
  city          TEXT,
  avatar_url    TEXT,
  is_suspended  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Base profile for every user. Extended by student_profiles, companies, etc.';

-- ------------------------------------------------------------
-- universities
-- ------------------------------------------------------------
CREATE TABLE universities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  logo_url      TEXT,
  letterhead    JSONB NOT NULL DEFAULT '{}',  -- {header_text, footer_text, logo_url, color}
  status        verification_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN universities.letterhead IS 'Settings used when generating placement letters: header_text, footer_text, logo_url, accent_color';

-- Sample placeholder universities (will be extended in seed.sql)
INSERT INTO universities (id, name, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Addis Ababa University', 'verified'),
  ('00000000-0000-0000-0000-000000000002', 'Debre Berhan University', 'verified'),
  ('00000000-0000-0000-0000-000000000003', 'Bahir Dar University', 'verified'),
  ('00000000-0000-0000-0000-000000000004', 'Hawassa University', 'verified'),
  ('00000000-0000-0000-0000-000000000005', 'Mekelle University', 'verified'),
  ('00000000-0000-0000-0000-000000000006', 'Jimma University', 'verified'),
  ('00000000-0000-0000-0000-000000000007', 'Adama Science and Technology University', 'verified');

-- ------------------------------------------------------------
-- departments
-- ------------------------------------------------------------
CREATE TABLE departments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_departments_university ON departments(university_id);

-- ------------------------------------------------------------
-- university_members: coordinators linked to a university
-- ------------------------------------------------------------
CREATE TABLE university_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_role     university_member_role NOT NULL DEFAULT 'coordinator',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (university_id, user_id)
);

CREATE INDEX idx_university_members_user ON university_members(user_id);

-- ------------------------------------------------------------
-- student_profiles: extended info for students/graduates
-- ------------------------------------------------------------
CREATE TABLE student_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  university_id         UUID REFERENCES universities(id) ON DELETE SET NULL,
  department_id         UUID REFERENCES departments(id) ON DELETE SET NULL,
  student_number        TEXT,
  year_of_study         SMALLINT CHECK (year_of_study BETWEEN 1 AND 7),
  expected_graduation   DATE,
  bio                   TEXT,
  -- JSONB arrays: [{name, level}] for skills, [{language, level}] for languages
  skills                JSONB NOT NULL DEFAULT '[]',
  languages             JSONB NOT NULL DEFAULT '[]',
  -- {github, linkedin, portfolio}
  links                 JSONB NOT NULL DEFAULT '{}',
  -- {start_date, duration_weeks, modes: ['on_site','remote','hybrid']}
  availability          JSONB NOT NULL DEFAULT '{}',
  cv_url                TEXT,                          -- uploaded CV (PDF)
  -- 'all_verified' = any verified company can see; 'applied_only' = only companies applied to
  visibility            TEXT NOT NULL DEFAULT 'all_verified'
                          CHECK (visibility IN ('all_verified', 'applied_only')),
  profile_complete_pct  SMALLINT NOT NULL DEFAULT 0 CHECK (profile_complete_pct BETWEEN 0 AND 100),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_profiles_user ON student_profiles(user_id);
CREATE INDEX idx_student_profiles_university ON student_profiles(university_id);

-- ------------------------------------------------------------
-- education: student education history
-- ------------------------------------------------------------
CREATE TABLE education (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  institution     TEXT NOT NULL,
  degree          TEXT NOT NULL,      -- e.g. "Bachelor of Science"
  field           TEXT NOT NULL,      -- e.g. "Computer Science"
  start_date      DATE,
  end_date        DATE,               -- NULL = current
  gpa             NUMERIC(3, 2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_education_student ON education(student_id);

-- ------------------------------------------------------------
-- experience: work / volunteer experience
-- ------------------------------------------------------------
CREATE TABLE experience (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  organization    TEXT NOT NULL,
  location        TEXT,
  start_date      DATE NOT NULL,
  end_date        DATE,
  is_current      BOOLEAN NOT NULL DEFAULT FALSE,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_experience_student ON experience(student_id);

-- ------------------------------------------------------------
-- projects
-- ------------------------------------------------------------
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  link            TEXT,
  start_date      DATE,
  end_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_student ON projects(student_id);

-- ------------------------------------------------------------
-- student_certifications: external certifications students hold
-- ------------------------------------------------------------
CREATE TABLE student_certifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  issuer          TEXT NOT NULL,
  issued_date     DATE,
  expiry_date     DATE,
  credential_url  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_certifications_student ON student_certifications(student_id);

-- ------------------------------------------------------------
-- Trigger: auto-update updated_at on profiles and student_profiles
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- Trigger: auto-create profile row when a new user signs up
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ------------------------------------------------------------
-- Function: compute profile completeness % for a student
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_student_profile_completeness(p_student_id UUID)
RETURNS SMALLINT LANGUAGE plpgsql AS $$
DECLARE
  sp student_profiles%ROWTYPE;
  pr profiles%ROWTYPE;
  score INTEGER := 0;
  total INTEGER := 10;
BEGIN
  SELECT * INTO sp FROM student_profiles WHERE id = p_student_id;
  SELECT * INTO pr FROM profiles WHERE id = sp.user_id;

  IF pr.full_name IS NOT NULL AND pr.full_name != '' THEN score := score + 1; END IF;
  IF pr.phone IS NOT NULL THEN score := score + 1; END IF;
  IF pr.city IS NOT NULL THEN score := score + 1; END IF;
  IF pr.avatar_url IS NOT NULL THEN score := score + 1; END IF;
  IF sp.bio IS NOT NULL AND sp.bio != '' THEN score := score + 1; END IF;
  IF jsonb_array_length(sp.skills) > 0 THEN score := score + 1; END IF;
  IF sp.university_id IS NOT NULL THEN score := score + 1; END IF;
  IF sp.department_id IS NOT NULL THEN score := score + 1; END IF;
  IF sp.cv_url IS NOT NULL OR jsonb_array_length(
      COALESCE((sp.links->>'github')::jsonb, '""'::jsonb)::jsonb, 0) > 0
  THEN score := score + 1; END IF;
  IF sp.availability != '{}' THEN score := score + 1; END IF;

  RETURN LEAST(ROUND((score::NUMERIC / total) * 100)::SMALLINT, 100);
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$;
