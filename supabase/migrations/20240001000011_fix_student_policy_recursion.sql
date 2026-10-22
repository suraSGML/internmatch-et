-- Avoid recursive RLS evaluation between student_profiles and applications.
CREATE OR REPLACE FUNCTION is_student_at_my_university(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
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

DROP POLICY IF EXISTS "applications: coordinator read" ON applications;

CREATE POLICY "applications: coordinator read"
  ON applications FOR SELECT
  USING (
    is_student_at_my_university(student_id)
    OR is_admin()
  );
