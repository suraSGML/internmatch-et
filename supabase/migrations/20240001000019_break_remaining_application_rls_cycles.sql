-- Evaluate cross-table access checks without re-entering the protected table policies.
CREATE OR REPLACE FUNCTION can_company_access_application(p_application_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM applications a
    JOIN internships i ON i.id = a.internship_id
    JOIN company_members cm ON cm.company_id = i.company_id
    WHERE a.id = p_application_id
      AND cm.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION can_company_access_application(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION can_company_access_application(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION can_company_read_student_profile(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM applications a
    JOIN internships i ON i.id = a.internship_id
    JOIN company_members cm ON cm.company_id = i.company_id
    WHERE a.student_id = p_student_id
      AND cm.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION can_company_read_student_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION can_company_read_student_profile(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION is_student_at_my_university(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM student_profiles sp
    JOIN university_members um ON um.university_id = sp.university_id
    WHERE sp.user_id = p_student_id
      AND um.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION is_student_at_my_university(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_student_at_my_university(UUID) TO authenticated;

DROP POLICY IF EXISTS "applications: company read" ON applications;
CREATE POLICY "applications: company read"
  ON applications FOR SELECT
  USING (can_company_access_application(id));

DROP POLICY IF EXISTS "applications: company update" ON applications;
CREATE POLICY "applications: company update"
  ON applications FOR UPDATE
  USING (can_company_access_application(id));

DROP POLICY IF EXISTS "applications: coordinator read" ON applications;
CREATE POLICY "applications: coordinator read"
  ON applications FOR SELECT
  USING (is_student_at_my_university(student_id) OR is_admin());

DROP POLICY IF EXISTS "student_profiles: applied company read" ON student_profiles;
CREATE POLICY "student_profiles: applied company read"
  ON student_profiles FOR SELECT
  USING (can_company_read_student_profile(user_id));
