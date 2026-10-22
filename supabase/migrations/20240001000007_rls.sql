-- ============================================================
-- Migration 008: Row Level Security Policies
-- Enable RLS on every table with explicit, documented policies.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ────────────────────────────────────────────────────────────

-- Returns the current user's role from their profile
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Returns TRUE if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM profiles WHERE id = auth.uid()), FALSE);
$$;

-- Returns the company_id(s) the current user belongs to
CREATE OR REPLACE FUNCTION my_company_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM company_members WHERE user_id = auth.uid();
$$;

-- Returns the university_id(s) the current user coordinates
CREATE OR REPLACE FUNCTION my_university_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT university_id FROM university_members WHERE user_id = auth.uid();
$$;

-- ────────────────────────────────────────────────────────────
-- profiles
-- ────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile; admins read all
CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

-- Public read for basic info (name, avatar) — needed for company member listings
CREATE POLICY "profiles: public basic read"
  ON profiles FOR SELECT
  USING (TRUE);  -- fine-grained column security handled at app layer

-- Users can update only their own profile
CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Admins can update any profile (e.g., suspend)
CREATE POLICY "profiles: admin update"
  ON profiles FOR UPDATE
  USING (is_admin());

-- profile row is created by the handle_new_user trigger (SECURITY DEFINER)
-- No INSERT policy needed for regular users

-- ────────────────────────────────────────────────────────────
-- student_profiles
-- ────────────────────────────────────────────────────────────
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Student can read/update their own profile
CREATE POLICY "student_profiles: own"
  ON student_profiles FOR ALL
  USING (user_id = auth.uid());

-- Verified companies can read student profiles where visibility = 'all_verified'
CREATE POLICY "student_profiles: verified company read"
  ON student_profiles FOR SELECT
  USING (
    visibility = 'all_verified'
    AND EXISTS (
      SELECT 1 FROM company_members cm
      JOIN companies c ON c.id = cm.company_id
      WHERE cm.user_id = auth.uid() AND c.status = 'verified'
    )
  );

-- Companies can read profiles of students who applied to their internships
CREATE POLICY "student_profiles: applied company read"
  ON student_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM applications a
      JOIN internships i ON i.id = a.internship_id
      WHERE a.student_id = student_profiles.user_id
        AND i.company_id IN (SELECT my_company_ids())
    )
  );

-- University coordinators can read their own university's students
CREATE POLICY "student_profiles: coordinator read"
  ON student_profiles FOR SELECT
  USING (
    university_id IN (SELECT my_university_ids())
    OR is_admin()
  );

-- Admins full access
CREATE POLICY "student_profiles: admin"
  ON student_profiles FOR ALL
  USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- education, experience, projects, student_certifications
-- ────────────────────────────────────────────────────────────
ALTER TABLE education              ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience             ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_certifications ENABLE ROW LEVEL SECURITY;

-- Students manage their own records; companies/coordinators/admins read
CREATE POLICY "education: own"
  ON education FOR ALL
  USING (student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()));

CREATE POLICY "education: company read"
  ON education FOR SELECT
  USING (
    student_id IN (
      SELECT sp.id FROM student_profiles sp
      WHERE sp.user_id IN (
        SELECT a.student_id FROM applications a
        JOIN internships i ON i.id = a.internship_id
        WHERE i.company_id IN (SELECT my_company_ids())
      )
    ) OR is_admin()
  );

-- Repeat the same pattern for experience, projects, certifications
CREATE POLICY "experience: own"
  ON experience FOR ALL
  USING (student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()));

CREATE POLICY "experience: company read"
  ON experience FOR SELECT
  USING (
    student_id IN (
      SELECT sp.id FROM student_profiles sp
      WHERE sp.user_id IN (
        SELECT a.student_id FROM applications a
        JOIN internships i ON i.id = a.internship_id
        WHERE i.company_id IN (SELECT my_company_ids())
      )
    ) OR is_admin()
  );

CREATE POLICY "projects: own"
  ON projects FOR ALL
  USING (student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()));

CREATE POLICY "projects: company read"
  ON projects FOR SELECT
  USING (is_admin() OR student_id IN (
    SELECT sp.id FROM student_profiles sp
    WHERE sp.user_id IN (
      SELECT a.student_id FROM applications a
      JOIN internships i ON i.id = a.internship_id
      WHERE i.company_id IN (SELECT my_company_ids())
    )
  ));

CREATE POLICY "student_certifications: own"
  ON student_certifications FOR ALL
  USING (student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()));

CREATE POLICY "student_certifications: admin"
  ON student_certifications FOR SELECT
  USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- universities, departments
-- ────────────────────────────────────────────────────────────
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments  ENABLE ROW LEVEL SECURITY;

-- Everyone can read universities (for search/dropdowns)
CREATE POLICY "universities: public read"
  ON universities FOR SELECT USING (TRUE);

-- Only admins can insert/update universities
CREATE POLICY "universities: admin write"
  ON universities FOR ALL USING (is_admin());

CREATE POLICY "departments: public read"
  ON departments FOR SELECT USING (TRUE);

CREATE POLICY "departments: admin write"
  ON departments FOR ALL USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- university_members
-- ────────────────────────────────────────────────────────────
ALTER TABLE university_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "university_members: own read"
  ON university_members FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "university_members: coordinator read"
  ON university_members FOR SELECT
  USING (university_id IN (SELECT my_university_ids()));

CREATE POLICY "university_members: admin write"
  ON university_members FOR ALL USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- fields, skills
-- ────────────────────────────────────────────────────────────
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fields: public read"  ON fields FOR SELECT USING (TRUE);
CREATE POLICY "fields: admin write"  ON fields FOR ALL   USING (is_admin());
CREATE POLICY "skills: public read"  ON skills FOR SELECT USING (TRUE);
CREATE POLICY "skills: admin write"  ON skills FOR ALL   USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- companies
-- ────────────────────────────────────────────────────────────
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Public can read verified companies
CREATE POLICY "companies: public read verified"
  ON companies FOR SELECT
  USING (status = 'verified' OR id IN (SELECT my_company_ids()) OR is_admin());

-- Company members can update their own company
CREATE POLICY "companies: member update"
  ON companies FOR UPDATE
  USING (id IN (SELECT my_company_ids()));

-- Owner can insert a company
CREATE POLICY "companies: owner insert"
  ON companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Admins full access
CREATE POLICY "companies: admin"
  ON companies FOR ALL USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- company_members
-- ────────────────────────────────────────────────────────────
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members: own read"
  ON company_members FOR SELECT
  USING (user_id = auth.uid() OR company_id IN (SELECT my_company_ids()) OR is_admin());

CREATE POLICY "company_members: owner manage"
  ON company_members FOR ALL
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    ) OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- verification_documents
-- ────────────────────────────────────────────────────────────
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- Company/university owners can insert their own docs
CREATE POLICY "verification_docs: owner insert"
  ON verification_documents FOR INSERT
  WITH CHECK (
    (owner_type = 'company'     AND owner_id IN (SELECT my_company_ids()))
    OR (owner_type = 'university' AND owner_id IN (SELECT my_university_ids()))
    OR is_admin()
  );

-- Only admins and the owner can read docs
CREATE POLICY "verification_docs: owner/admin read"
  ON verification_documents FOR SELECT
  USING (
    (owner_type = 'company'     AND owner_id IN (SELECT my_company_ids()))
    OR (owner_type = 'university' AND owner_id IN (SELECT my_university_ids()))
    OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- internships
-- ────────────────────────────────────────────────────────────
ALTER TABLE internships ENABLE ROW LEVEL SECURITY;

-- Public can read open internships from verified companies
CREATE POLICY "internships: public read open"
  ON internships FOR SELECT
  USING (
    (status = 'open' AND company_id IN (
      SELECT id FROM companies WHERE status = 'verified'
    ))
    OR company_id IN (SELECT my_company_ids())
    OR is_admin()
  );

-- Only verified company members can insert internships
CREATE POLICY "internships: verified company insert"
  ON internships FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT cm.company_id FROM company_members cm
      JOIN companies c ON c.id = cm.company_id
      WHERE cm.user_id = auth.uid() AND c.status = 'verified'
    )
  );

-- Company members can update their own internships
CREATE POLICY "internships: company update"
  ON internships FOR UPDATE
  USING (company_id IN (SELECT my_company_ids()));

-- Admins full access
CREATE POLICY "internships: admin"
  ON internships FOR ALL USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- internship_questions
-- ────────────────────────────────────────────────────────────
ALTER TABLE internship_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internship_questions: public read"
  ON internship_questions FOR SELECT
  USING (internship_id IN (SELECT id FROM internships WHERE status = 'open'));

CREATE POLICY "internship_questions: company manage"
  ON internship_questions FOR ALL
  USING (
    internship_id IN (
      SELECT id FROM internships WHERE company_id IN (SELECT my_company_ids())
    ) OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- saved_internships, saved_searches
-- ────────────────────────────────────────────────────────────
ALTER TABLE saved_internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_internships: own"
  ON saved_internships FOR ALL USING (user_id = auth.uid());

CREATE POLICY "saved_searches: own"
  ON saved_searches FOR ALL USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- applications
-- ────────────────────────────────────────────────────────────
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Students see only their own applications
CREATE POLICY "applications: student own"
  ON applications FOR SELECT
  USING (student_id = auth.uid());

-- Students can insert (apply)
CREATE POLICY "applications: student insert"
  ON applications FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Students can withdraw (update status to 'withdrawn' only)
CREATE POLICY "applications: student withdraw"
  ON applications FOR UPDATE
  USING (student_id = auth.uid() AND status != 'withdrawn')
  WITH CHECK (status = 'withdrawn');

-- Company members see applications for their internships
CREATE POLICY "applications: company read"
  ON applications FOR SELECT
  USING (
    internship_id IN (
      SELECT id FROM internships WHERE company_id IN (SELECT my_company_ids())
    )
  );

-- Company members can update application status
CREATE POLICY "applications: company update"
  ON applications FOR UPDATE
  USING (
    internship_id IN (
      SELECT id FROM internships WHERE company_id IN (SELECT my_company_ids())
    )
  );

-- Coordinators see applications for their university's students
CREATE POLICY "applications: coordinator read"
  ON applications FOR SELECT
  USING (
    student_id IN (
      SELECT user_id FROM student_profiles
      WHERE university_id IN (SELECT my_university_ids())
    ) OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- application_answers, application_events, application_notes
-- ────────────────────────────────────────────────────────────
ALTER TABLE application_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_notes   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "application_answers: student own"
  ON application_answers FOR ALL
  USING (
    application_id IN (SELECT id FROM applications WHERE student_id = auth.uid())
  );

CREATE POLICY "application_answers: company read"
  ON application_answers FOR SELECT
  USING (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN internships i ON i.id = a.internship_id
      WHERE i.company_id IN (SELECT my_company_ids())
    ) OR is_admin()
  );

CREATE POLICY "application_events: read own"
  ON application_events FOR SELECT
  USING (
    application_id IN (SELECT id FROM applications WHERE student_id = auth.uid())
    OR application_id IN (
      SELECT a.id FROM applications a
      JOIN internships i ON i.id = a.internship_id
      WHERE i.company_id IN (SELECT my_company_ids())
    )
    OR is_admin()
  );

-- Events are written by triggers (SECURITY DEFINER), no INSERT policy needed
CREATE POLICY "application_notes: company manage"
  ON application_notes FOR ALL
  USING (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN internships i ON i.id = a.internship_id
      WHERE i.company_id IN (SELECT my_company_ids())
    ) OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- interviews, offers
-- ────────────────────────────────────────────────────────────
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interviews: student read"
  ON interviews FOR SELECT
  USING (
    application_id IN (SELECT id FROM applications WHERE student_id = auth.uid())
  );

CREATE POLICY "interviews: company manage"
  ON interviews FOR ALL
  USING (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN internships i ON i.id = a.internship_id
      WHERE i.company_id IN (SELECT my_company_ids())
    ) OR is_admin()
  );

CREATE POLICY "offers: student read"
  ON offers FOR SELECT
  USING (
    application_id IN (SELECT id FROM applications WHERE student_id = auth.uid())
  );

-- Students can update offer status (accept/decline)
CREATE POLICY "offers: student respond"
  ON offers FOR UPDATE
  USING (
    application_id IN (SELECT id FROM applications WHERE student_id = auth.uid())
  )
  WITH CHECK (status IN ('accepted', 'declined'));

CREATE POLICY "offers: company manage"
  ON offers FOR ALL
  USING (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN internships i ON i.id = a.internship_id
      WHERE i.company_id IN (SELECT my_company_ids())
    ) OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- placements
-- ────────────────────────────────────────────────────────────
ALTER TABLE placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "placements: student own"
  ON placements FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "placements: company read"
  ON placements FOR SELECT
  USING (company_id IN (SELECT my_company_ids()));

CREATE POLICY "placements: coordinator manage"
  ON placements FOR ALL
  USING (
    university_id IN (SELECT my_university_ids()) OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- placement_letters
-- ────────────────────────────────────────────────────────────
ALTER TABLE placement_letters ENABLE ROW LEVEL SECURITY;

-- Students and companies can read letters for their placement
CREATE POLICY "placement_letters: student/company read"
  ON placement_letters FOR SELECT
  USING (
    placement_id IN (
      SELECT id FROM placements
      WHERE student_id = auth.uid()
         OR company_id IN (SELECT my_company_ids())
         OR university_id IN (SELECT my_university_ids())
    ) OR is_admin()
  );

-- Only verified coordinators can issue letters
CREATE POLICY "placement_letters: coordinator issue"
  ON placement_letters FOR INSERT
  WITH CHECK (
    issued_by = auth.uid()
    AND placement_id IN (
      SELECT id FROM placements
      WHERE university_id IN (SELECT my_university_ids())
    )
  );

-- Coordinators and admins can revoke
CREATE POLICY "placement_letters: coordinator revoke"
  ON placement_letters FOR UPDATE
  USING (
    placement_id IN (
      SELECT id FROM placements
      WHERE university_id IN (SELECT my_university_ids())
    ) OR is_admin()
  );

-- Public can read letter by code (for verification page — handled via public function)
-- See verify function below

-- ────────────────────────────────────────────────────────────
-- logbook_entries
-- ────────────────────────────────────────────────────────────
ALTER TABLE logbook_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logbook: student manage"
  ON logbook_entries FOR ALL
  USING (
    placement_id IN (SELECT id FROM placements WHERE student_id = auth.uid())
  );

CREATE POLICY "logbook: supervisor manage"
  ON logbook_entries FOR ALL
  USING (
    placement_id IN (
      SELECT id FROM placements WHERE supervisor_id = auth.uid()
        OR company_id IN (SELECT my_company_ids())
    )
  );

CREATE POLICY "logbook: coordinator read"
  ON logbook_entries FOR SELECT
  USING (
    placement_id IN (
      SELECT id FROM placements WHERE university_id IN (SELECT my_university_ids())
    ) OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- evaluations
-- ────────────────────────────────────────────────────────────
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluations: student read if visible"
  ON evaluations FOR SELECT
  USING (
    (placement_id IN (SELECT id FROM placements WHERE student_id = auth.uid())
     AND visible_to_student = TRUE)
    OR placement_id IN (
      SELECT id FROM placements WHERE company_id IN (SELECT my_company_ids())
    )
    OR placement_id IN (
      SELECT id FROM placements WHERE university_id IN (SELECT my_university_ids())
    )
    OR is_admin()
  );

CREATE POLICY "evaluations: supervisor submit"
  ON evaluations FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND placement_id IN (
      SELECT id FROM placements
      WHERE supervisor_id = auth.uid()
         OR company_id IN (SELECT my_company_ids())
    )
  );

-- ────────────────────────────────────────────────────────────
-- certificates
-- ────────────────────────────────────────────────────────────
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certificates: student/company/coordinator read"
  ON certificates FOR SELECT
  USING (
    placement_id IN (
      SELECT id FROM placements
      WHERE student_id = auth.uid()
         OR company_id IN (SELECT my_company_ids())
         OR university_id IN (SELECT my_university_ids())
    ) OR is_admin()
  );

CREATE POLICY "certificates: company issue"
  ON certificates FOR INSERT
  WITH CHECK (
    issued_by = auth.uid()
    AND placement_id IN (
      SELECT id FROM placements WHERE company_id IN (SELECT my_company_ids())
    )
  );

CREATE POLICY "certificates: revoke"
  ON certificates FOR UPDATE
  USING (
    placement_id IN (
      SELECT id FROM placements WHERE company_id IN (SELECT my_company_ids())
    ) OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- messages
-- ────────────────────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages: participant read/write"
  ON messages FOR ALL
  USING (
    -- sender is current user
    sender_id = auth.uid()
    OR
    -- or current user is the student on this application
    application_id IN (SELECT id FROM applications WHERE student_id = auth.uid())
    OR
    -- or current user is from the company on this application
    application_id IN (
      SELECT a.id FROM applications a
      JOIN internships i ON i.id = a.internship_id
      WHERE i.company_id IN (SELECT my_company_ids())
    )
  );

-- ────────────────────────────────────────────────────────────
-- notifications
-- ────────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: own"
  ON notifications FOR ALL USING (user_id = auth.uid());

-- Notifications are created by SECURITY DEFINER triggers — no INSERT policy for regular users

-- ────────────────────────────────────────────────────────────
-- reports
-- ────────────────────────────────────────────────────────────
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Anyone can file a report
CREATE POLICY "reports: insert"
  ON reports FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Reporter can read their own reports
CREATE POLICY "reports: reporter read"
  ON reports FOR SELECT USING (reporter_id = auth.uid() OR is_admin());

-- Only admins can update (change status, resolve)
CREATE POLICY "reports: admin manage"
  ON reports FOR ALL USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- audit_logs
-- ────────────────────────────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "audit_logs: admin only"
  ON audit_logs FOR SELECT USING (is_admin());

-- Inserted only via SECURITY DEFINER function write_audit_log()
CREATE POLICY "audit_logs: system insert"
  ON audit_logs FOR INSERT WITH CHECK (is_admin());

-- ────────────────────────────────────────────────────────────
-- announcements
-- ────────────────────────────────────────────────────────────
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Students at the same university can read announcements
CREATE POLICY "announcements: student read"
  ON announcements FOR SELECT
  USING (
    university_id IN (
      SELECT university_id FROM student_profiles WHERE user_id = auth.uid()
    )
    OR university_id IN (SELECT my_university_ids())
    OR is_admin()
  );

CREATE POLICY "announcements: coordinator write"
  ON announcements FOR ALL
  USING (
    university_id IN (SELECT my_university_ids()) OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- PUBLIC VERIFICATION FUNCTION
-- Allows anyone (including unauthenticated) to verify a code
-- Returns only non-sensitive fields
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION verify_document(p_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check placement letters
  SELECT jsonb_build_object(
    'type',         'placement_letter',
    'valid',        pl.revoked_at IS NULL,
    'holder_name',  pr.full_name,
    'organization', c.name,
    'role',         i.title,
    'start_date',   pla.start_date,
    'end_date',     pla.end_date,
    'issued_at',    pl.issued_at,
    'revoked',      pl.revoked_at IS NOT NULL
  )
  INTO result
  FROM placement_letters pl
  JOIN placements pla ON pla.id = pl.placement_id
  JOIN profiles pr ON pr.id = pla.student_id
  JOIN applications a ON a.id = pla.application_id
  JOIN internships i ON i.id = a.internship_id
  JOIN companies c ON c.id = pla.company_id
  WHERE pl.public_code = p_code;

  IF result IS NOT NULL THEN RETURN result; END IF;

  -- Check certificates
  SELECT jsonb_build_object(
    'type',         'certificate',
    'valid',        cert.revoked_at IS NULL,
    'holder_name',  pr.full_name,
    'organization', c.name,
    'role',         i.title,
    'start_date',   pla.start_date,
    'end_date',     pla.end_date,
    'issued_at',    cert.issued_at,
    'revoked',      cert.revoked_at IS NOT NULL
  )
  INTO result
  FROM certificates cert
  JOIN placements pla ON pla.id = cert.placement_id
  JOIN profiles pr ON pr.id = pla.student_id
  JOIN applications a ON a.id = pla.application_id
  JOIN internships i ON i.id = a.internship_id
  JOIN companies c ON c.id = pla.company_id
  WHERE cert.public_code = p_code;

  IF result IS NOT NULL THEN RETURN result; END IF;

  RETURN jsonb_build_object('valid', FALSE, 'error', 'Code not found');
END;
$$;

-- Grant execute to anonymous (unauthenticated) users for verification page
GRANT EXECUTE ON FUNCTION verify_document(TEXT) TO anon;
