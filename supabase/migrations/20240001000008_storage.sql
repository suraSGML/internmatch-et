-- ============================================================
-- Migration 009: Storage Buckets and Policies
-- Creates Supabase Storage buckets with access policies.
-- ============================================================

-- NOTE: Supabase Storage buckets are created via the Supabase Dashboard
-- or the Management API. This migration documents them and sets up
-- the storage.objects RLS policies.
-- Run this AFTER creating the buckets in the Supabase Dashboard:
--   1. avatars          (public)
--   2. company-logos    (public)
--   3. cvs              (private)
--   4. verification-docs (private)
--   5. logbook-attachments (private)

-- ------------------------------------------------------------
-- avatars bucket (public — profile photos)
-- Path pattern: avatars/{user_id}/avatar.{ext}
-- ------------------------------------------------------------
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars: user upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "avatars: user update own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "avatars: user delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ------------------------------------------------------------
-- company-logos bucket (public)
-- Path pattern: company-logos/{company_id}/logo.{ext}
-- ------------------------------------------------------------
CREATE POLICY "company-logos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

CREATE POLICY "company-logos: member upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-logos'
    AND EXISTS (
      SELECT 1 FROM company_members
      WHERE user_id = auth.uid()
        AND company_id::TEXT = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "company-logos: member update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'company-logos'
    AND EXISTS (
      SELECT 1 FROM company_members
      WHERE user_id = auth.uid()
        AND company_id::TEXT = (storage.foldername(name))[1]
    )
  );

-- ------------------------------------------------------------
-- cvs bucket (private — student CVs)
-- Path pattern: cvs/{user_id}/{filename}
-- Only the student and companies they applied to can read
-- ------------------------------------------------------------
CREATE POLICY "cvs: student upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "cvs: student read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Companies can read CVs of students who applied to their internships
CREATE POLICY "cvs: company read applied"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] IN (
      SELECT a.student_id::TEXT
      FROM applications a
      JOIN internships i ON i.id = a.internship_id
      WHERE i.company_id IN (SELECT my_company_ids())
    )
  );

-- Coordinators can read CVs of their university's students
CREATE POLICY "cvs: coordinator read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] IN (
      SELECT sp.user_id::TEXT
      FROM student_profiles sp
      WHERE sp.university_id IN (SELECT my_university_ids())
    )
  );

CREATE POLICY "cvs: admin read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cvs' AND is_admin());

CREATE POLICY "cvs: student delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ------------------------------------------------------------
-- verification-docs bucket (private — company/university docs)
-- Path pattern: verification-docs/{owner_type}/{owner_id}/{filename}
-- Only owner and admins can read
-- ------------------------------------------------------------
CREATE POLICY "verification-docs: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (
      (storage.foldername(name))[1] = 'company'
      AND (storage.foldername(name))[2] IN (
        SELECT company_id::TEXT FROM company_members WHERE user_id = auth.uid()
      )
    ) OR (
      (storage.foldername(name))[1] = 'university'
      AND (storage.foldername(name))[2] IN (
        SELECT university_id::TEXT FROM university_members WHERE user_id = auth.uid()
      )
    ) OR is_admin()
  );

CREATE POLICY "verification-docs: owner/admin read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND (
      (storage.foldername(name))[1] = 'company'
      AND (storage.foldername(name))[2] IN (
        SELECT company_id::TEXT FROM company_members WHERE user_id = auth.uid()
      )
    ) OR (
      (storage.foldername(name))[1] = 'university'
      AND (storage.foldername(name))[2] IN (
        SELECT university_id::TEXT FROM university_members WHERE user_id = auth.uid()
      )
    ) OR is_admin()
  );

-- ------------------------------------------------------------
-- logbook-attachments bucket (private)
-- Path pattern: logbook-attachments/{placement_id}/{entry_id}/{filename}
-- ------------------------------------------------------------
CREATE POLICY "logbook-attachments: student upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logbook-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT id::TEXT FROM placements WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "logbook-attachments: participant read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'logbook-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT id::TEXT FROM placements
      WHERE student_id = auth.uid()
         OR company_id IN (SELECT my_company_ids())
         OR university_id IN (SELECT my_university_ids())
    ) OR is_admin()
  );
