-- ============================================================
-- Migration 003: Companies
-- companies, company_members, verification_documents, fields, skills
-- ============================================================

-- ------------------------------------------------------------
-- fields: internship categories (IT, Accounting, Engineering…)
-- ------------------------------------------------------------
CREATE TABLE fields (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en   TEXT NOT NULL,
  name_am   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO fields (name_en, name_am) VALUES
  ('Information Technology',    'መረጃ ቴክኖሎጂ'),
  ('Accounting & Finance',      'አካውንቲንግ እና ፋይናንስ'),
  ('Engineering',               'ምህንድስና'),
  ('Health & Medicine',         'ጤና እና ህክምና'),
  ('Marketing & Sales',         'ማርኬቲንግ እና ሽያጭ'),
  ('Business Administration',   'ቢዝነስ አስተዳደር'),
  ('Law & Legal Services',      'ህግ እና ህጋዊ አገልግሎቶች'),
  ('Education & Training',      'ትምህርት እና ስልጠና'),
  ('Agriculture',               'ግብርና'),
  ('Architecture & Design',     'አርክቴክቸር እና ዲዛይን'),
  ('Logistics & Supply Chain',  'ሎጂስቲክስ እና አቅርቦት ሰንሰለት'),
  ('Human Resources',           'የሰው ኃይል አስተዳደር'),
  ('Media & Communications',    'ሚዲያ እና ኮሙኒኬሽን'),
  ('Environmental Science',     'የአካባቢ ሳይንስ'),
  ('Research & Development',    'ምርምር እና ልማት');

-- ------------------------------------------------------------
-- skills: canonical skill tags
-- ------------------------------------------------------------
CREATE TABLE skills (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO skills (name) VALUES
  ('Python'), ('JavaScript'), ('TypeScript'), ('Java'), ('C++'), ('C#'),
  ('SQL'), ('PostgreSQL'), ('MySQL'), ('MongoDB'),
  ('React'), ('Next.js'), ('Node.js'), ('Django'), ('Spring Boot'),
  ('AutoCAD'), ('MATLAB'), ('Revit'), ('SolidWorks'),
  ('Microsoft Excel'), ('Microsoft Word'), ('PowerPoint'), ('QuickBooks'),
  ('Financial Analysis'), ('Bookkeeping'), ('Auditing'),
  ('Marketing Research'), ('Social Media Marketing'), ('SEO'),
  ('Communication'), ('Teamwork'), ('Leadership'), ('Problem Solving'),
  ('Project Management'), ('Data Analysis'), ('Machine Learning'),
  ('Networking'), ('Cybersecurity'), ('Linux'), ('Git');

-- ------------------------------------------------------------
-- companies
-- ------------------------------------------------------------
CREATE TABLE companies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  description           TEXT,
  industry              TEXT,
  size                  TEXT CHECK (size IN ('1-10','11-50','51-200','201-500','500+')),
  logo_url              TEXT,
  address               TEXT,
  city                  TEXT,
  website               TEXT,
  contact_person        TEXT,
  registration_number   TEXT,
  status                verification_status NOT NULL DEFAULT 'pending',
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_owner ON companies(owner_id);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_slug ON companies(slug);

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- company_members
-- ------------------------------------------------------------
CREATE TABLE company_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_role   company_member_role NOT NULL DEFAULT 'recruiter',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, user_id)
);

CREATE INDEX idx_company_members_user ON company_members(user_id);
CREATE INDEX idx_company_members_company ON company_members(company_id);

-- ------------------------------------------------------------
-- verification_documents: uploaded docs for companies/universities
-- ------------------------------------------------------------
CREATE TABLE verification_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type    TEXT NOT NULL CHECK (owner_type IN ('company', 'university')),
  owner_id      UUID NOT NULL,
  file_path     TEXT NOT NULL,          -- Supabase storage path
  doc_type      document_type NOT NULL DEFAULT 'registration',
  review_note   TEXT,                   -- admin note after review
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_docs_owner ON verification_documents(owner_type, owner_id);

-- ------------------------------------------------------------
-- Function: generate a URL-safe slug from company name
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_slug(input TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  counter INTEGER := 0;
BEGIN
  base := lower(regexp_replace(
    regexp_replace(trim(input), '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  candidate := base;
  LOOP
    IF NOT EXISTS (SELECT 1 FROM companies WHERE slug = candidate) THEN
      RETURN candidate;
    END IF;
    counter := counter + 1;
    candidate := base || '-' || counter;
  END LOOP;
END;
$$;

-- Trigger: auto-generate slug for new companies
CREATE OR REPLACE FUNCTION set_company_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_company_slug
  BEFORE INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION set_company_slug();
