-- University coordinator access and new-institution registration requests.
CREATE TABLE IF NOT EXISTS university_registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  university_id UUID REFERENCES universities(id) ON DELETE SET NULL,
  requested_university_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT university_registration_request_target CHECK (
    university_id IS NOT NULL OR NULLIF(trim(requested_university_name), '') IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_university_registration_requests_status
  ON university_registration_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_university_registration_requests_user
  ON university_registration_requests(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_university_registration_requests_one_pending_per_user
  ON university_registration_requests(user_id)
  WHERE status = 'pending';

ALTER TABLE university_registration_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "university registration requests: owner read"
  ON university_registration_requests;
CREATE POLICY "university registration requests: owner read"
  ON university_registration_requests FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "university registration requests: coordinator submit"
  ON university_registration_requests;
CREATE POLICY "university registration requests: coordinator submit"
  ON university_registration_requests FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'university'
    )
  );
