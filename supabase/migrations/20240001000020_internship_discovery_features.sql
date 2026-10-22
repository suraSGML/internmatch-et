-- In-app alerts for saved searches and student listing reports.
COMMENT ON COLUMN saved_searches.alert_on IS
  'When true, create in-app notifications for new internships matching this saved search.';

CREATE TABLE IF NOT EXISTS listing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id UUID NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 1000),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'dismissed', 'action_taken')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (internship_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_reports_status_created
  ON listing_reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS user_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reminder_key TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, reminder_key)
);

ALTER TABLE user_reminders ENABLE ROW LEVEL SECURITY;

ALTER TABLE listing_reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_user_has_platform_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND role::TEXT = p_role
  );
$$;

REVOKE ALL ON FUNCTION current_user_has_platform_role(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION current_user_has_platform_role(TEXT) TO authenticated;

DROP POLICY IF EXISTS "listing_reports: student create" ON listing_reports;
CREATE POLICY "listing_reports: student create"
  ON listing_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid() AND current_user_has_platform_role('student'));

DROP POLICY IF EXISTS "listing_reports: reporter read" ON listing_reports;
CREATE POLICY "listing_reports: reporter read"
  ON listing_reports FOR SELECT
  USING (reporter_id = auth.uid() AND current_user_has_platform_role('student'));

DROP POLICY IF EXISTS "listing_reports: admin read" ON listing_reports;
CREATE POLICY "listing_reports: admin read"
  ON listing_reports FOR SELECT
  USING (current_user_has_platform_role('admin'));

DROP POLICY IF EXISTS "listing_reports: admin update" ON listing_reports;
CREATE POLICY "listing_reports: admin update"
  ON listing_reports FOR UPDATE
  USING (current_user_has_platform_role('admin'))
  WITH CHECK (current_user_has_platform_role('admin'));

CREATE OR REPLACE FUNCTION notify_matching_saved_searches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status <> 'open'
     OR NEW.deadline < (NOW() AT TIME ZONE 'Africa/Addis_Ababa')::DATE
     OR (TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT DISTINCT
    ss.user_id,
    'general',
    'New internship matches your saved search',
    NEW.title || ' is now open. View your saved searches to see this match.',
    '/student/searches'
  FROM saved_searches ss
  JOIN companies c ON c.id = NEW.company_id AND c.status = 'verified'
  WHERE ss.alert_on
    AND (
      COALESCE(ss.filters ->> 'field_id', '') = ''
      OR ss.filters ->> 'field_id' = NEW.field_id::TEXT
    )
    AND (
      COALESCE(ss.filters ->> 'city', '') = ''
      OR ss.filters ->> 'city' = COALESCE(NEW.location_city, '')
    )
    AND (
      COALESCE(ss.filters ->> 'work_mode', '') = ''
      OR ss.filters ->> 'work_mode' = NEW.work_mode::TEXT
    )
    AND (
      COALESCE(ss.filters ->> 'is_paid', '') = ''
      OR ss.filters ->> 'is_paid' = NEW.is_paid::TEXT
    )
    AND (
      COALESCE(ss.filters ->> 'keyword', '') = ''
      OR NEW.title ILIKE '%' || (ss.filters ->> 'keyword') || '%'
      OR NEW.description ILIKE '%' || (ss.filters ->> 'keyword') || '%'
    )
    AND (
      COALESCE(ss.filters ->> 'duration_min', '') = ''
      OR (
        ss.filters ->> 'duration_min' ~ '^[0-9]+$'
        AND NEW.duration_weeks >= (ss.filters ->> 'duration_min')::INTEGER
      )
    )
    AND (
      COALESCE(ss.filters ->> 'duration_max', '') = ''
      OR (
        ss.filters ->> 'duration_max' ~ '^[0-9]+$'
        AND NEW.duration_weeks <= (ss.filters ->> 'duration_max')::INTEGER
      )
    )
    AND (
      COALESCE(ss.filters ->> 'stipend_min', '') = ''
      OR (
        ss.filters ->> 'stipend_min' ~ '^[0-9]+([.][0-9]+)?$'
        AND NEW.is_paid
        AND NEW.stipend_amount >= (ss.filters ->> 'stipend_min')::NUMERIC
      )
    )
    AND (
      COALESCE(ss.filters ->> 'stipend_max', '') = ''
      OR (
        ss.filters ->> 'stipend_max' ~ '^[0-9]+([.][0-9]+)?$'
        AND NEW.is_paid
        AND NEW.stipend_amount <= (ss.filters ->> 'stipend_max')::NUMERIC
      )
    )
    AND (
      COALESCE(ss.filters ->> 'required_year_min', '') = ''
      OR (
        ss.filters ->> 'required_year_min' ~ '^[0-9]+$'
        AND (
          NEW.required_year_min IS NULL
          OR NEW.required_year_min <= (ss.filters ->> 'required_year_min')::SMALLINT
        )
      )
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_matching_saved_searches ON internships;
CREATE TRIGGER trg_notify_matching_saved_searches
  AFTER INSERT OR UPDATE OF status ON internships
  FOR EACH ROW
  EXECUTE FUNCTION notify_matching_saved_searches();
