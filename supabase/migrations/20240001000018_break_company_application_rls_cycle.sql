-- Prevent application policies from recursively evaluating applications through internships.
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

DROP POLICY IF EXISTS "applications: company read" ON applications;
CREATE POLICY "applications: company read"
  ON applications FOR SELECT
  USING (can_company_access_application(id));

DROP POLICY IF EXISTS "applications: company update" ON applications;
CREATE POLICY "applications: company update"
  ON applications FOR UPDATE
  USING (can_company_access_application(id));
