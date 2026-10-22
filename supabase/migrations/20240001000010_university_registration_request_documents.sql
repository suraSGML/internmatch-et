CREATE TABLE university_registration_request_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES university_registration_requests(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_university_registration_request_documents_request
  ON university_registration_request_documents(request_id);

ALTER TABLE university_registration_request_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "university request documents: owner and admin read"
  ON university_registration_request_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM university_registration_requests r
      WHERE r.id = request_id
        AND r.user_id = auth.uid()
    )
    OR is_admin()
  );
