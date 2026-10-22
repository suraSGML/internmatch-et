-- ============================================================
-- Migration 007: Messaging, Notifications, Reports, Audit
-- messages, notifications, reports, audit_logs
-- ============================================================

-- ------------------------------------------------------------
-- messages: per-application thread between student and company
-- ------------------------------------------------------------
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_application ON messages(application_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL DEFAULT 'general',
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,          -- relative URL to navigate to
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at)
  WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ------------------------------------------------------------
-- Function: create a notification (used by triggers and server actions)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type    notification_type,
  p_title   TEXT,
  p_body    TEXT DEFAULT NULL,
  p_link    TEXT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (p_user_id, p_type, p_title, p_body, p_link);
END;
$$;

-- ------------------------------------------------------------
-- Trigger: notify student when application status changes
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_student_id UUID;
  v_title      TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT student_id INTO v_student_id FROM applications WHERE id = NEW.id;

    v_title := CASE NEW.status
      WHEN 'under_review'        THEN 'Your application is under review'
      WHEN 'shortlisted'         THEN 'Congratulations! You have been shortlisted'
      WHEN 'interview_scheduled' THEN 'Interview scheduled for your application'
      WHEN 'offered'             THEN 'You have received an internship offer!'
      WHEN 'accepted'            THEN 'Offer accepted — your placement is confirmed'
      WHEN 'rejected'            THEN 'Application update'
      WHEN 'withdrawn'           THEN 'Application withdrawn'
      ELSE 'Application status updated'
    END;

    PERFORM create_notification(
      v_student_id,
      'application_status_changed',
      v_title,
      'Your application status changed to: ' || NEW.status::TEXT,
      '/student/applications'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_app_status
  AFTER UPDATE OF status ON applications
  FOR EACH ROW EXECUTE FUNCTION notify_application_status_change();

-- Trigger: notify company when new application arrives
CREATE OR REPLACE FUNCTION notify_new_application()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_company_owner UUID;
  v_internship_title TEXT;
BEGIN
  SELECT c.owner_id, i.title
  INTO v_company_owner, v_internship_title
  FROM internships i
  JOIN companies c ON c.id = i.company_id
  WHERE i.id = NEW.internship_id;

  PERFORM create_notification(
    v_company_owner,
    'application_received',
    'New application received',
    'A student applied for: ' || v_internship_title,
    '/company/internships/' || NEW.internship_id::TEXT
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_application
  AFTER INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION notify_new_application();

-- Trigger: notify student when logbook entry is approved/needs revision
CREATE OR REPLACE FUNCTION notify_logbook_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_student_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('approved', 'needs_revision') THEN
    SELECT student_id INTO v_student_id
    FROM placements WHERE id = NEW.placement_id;

    PERFORM create_notification(
      v_student_id,
      CASE NEW.status
        WHEN 'approved' THEN 'logbook_approved'::notification_type
        ELSE 'logbook_needs_revision'::notification_type
      END,
      CASE NEW.status
        WHEN 'approved' THEN 'Logbook entry approved'
        ELSE 'Logbook entry needs revision'
      END,
      CASE NEW.status
        WHEN 'approved' THEN 'Your logbook entry for week starting ' || NEW.week_start::TEXT || ' was approved.'
        ELSE 'Please revise your logbook entry: ' || COALESCE(NEW.supervisor_comment, '')
      END,
      '/student/logbook'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_logbook
  AFTER UPDATE OF status ON logbook_entries
  FOR EACH ROW EXECUTE FUNCTION notify_logbook_update();

-- ------------------------------------------------------------
-- reports: abuse / scam reports
-- ------------------------------------------------------------
CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type   TEXT NOT NULL CHECK (target_type IN ('internship','company','user')),
  target_id     UUID NOT NULL,
  reason        report_reason NOT NULL DEFAULT 'other',
  details       TEXT,
  status        report_status NOT NULL DEFAULT 'open',
  resolved_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  resolution_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);

-- ------------------------------------------------------------
-- audit_logs: immutable action history
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,     -- e.g. 'company.verified', 'certificate.revoked'
  target_type   TEXT,
  target_id     UUID,
  details       JSONB NOT NULL DEFAULT '{}',
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Audit log is append-only — prevent updates and deletes
CREATE RULE audit_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- Function: write audit log entry
CREATE OR REPLACE FUNCTION write_audit_log(
  p_actor_id    UUID,
  p_action      TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id   UUID DEFAULT NULL,
  p_details     JSONB DEFAULT '{}'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (p_actor_id, p_action, p_target_type, p_target_id, p_details);
END;
$$;

-- ------------------------------------------------------------
-- announcements: coordinator broadcasts to their students
-- ------------------------------------------------------------
CREATE TABLE announcements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,  -- NULL = all departments
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_university ON announcements(university_id);

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
