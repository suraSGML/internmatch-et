CREATE OR REPLACE FUNCTION create_placement_after_offer_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application applications%ROWTYPE;
  v_internship internships%ROWTYPE;
  v_university_id UUID;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT * INTO v_application
    FROM applications
    WHERE id = NEW.application_id;

    SELECT * INTO v_internship
    FROM internships
    WHERE id = v_application.internship_id;

    SELECT university_id INTO v_university_id
    FROM student_profiles
    WHERE user_id = v_application.student_id;

    IF v_university_id IS NULL THEN
      RAISE EXCEPTION 'Your student profile must be linked to a university before accepting an internship offer.'
        USING ERRCODE = '23514';
    END IF;

    INSERT INTO placements (
      application_id,
      student_id,
      company_id,
      university_id,
      start_date,
      end_date,
      status
    )
    VALUES (
      v_application.id,
      v_application.student_id,
      v_internship.company_id,
      v_university_id,
      NEW.start_date,
      NEW.end_date,
      'pending_approval'
    )
    ON CONFLICT (application_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_placement_after_offer_acceptance
  AFTER UPDATE OF status ON offers
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION create_placement_after_offer_acceptance();

CREATE OR REPLACE FUNCTION notify_placement_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body TEXT;
  v_type notification_type;
  v_company_name TEXT;
  v_internship_title TEXT;
  v_coordinator RECORD;
BEGIN
  SELECT i.title, c.name
  INTO v_internship_title, v_company_name
  FROM applications a
  JOIN internships i ON i.id = a.internship_id
  JOIN companies c ON c.id = i.company_id
  WHERE a.id = NEW.application_id;

  IF TG_OP = 'INSERT' THEN
    v_title := 'Placement awaiting university approval';
    v_body := coalesce(v_internship_title, 'Internship') || ' at ' ||
      coalesce(v_company_name, 'the company') ||
      ' was accepted by the student and is awaiting university approval.';
    PERFORM create_notification(
      NEW.student_id,
      'general',
      'Your offer was accepted',
      v_body,
      '/student/placement'
    );

    IF NEW.university_id IS NOT NULL THEN
      FOR v_coordinator IN
        SELECT user_id FROM university_members WHERE university_id = NEW.university_id
      LOOP
        PERFORM create_notification(
          v_coordinator.user_id,
          'general',
          v_title,
          v_body,
          '/university/placements'
        );
      END LOOP;
    END IF;
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    v_type := CASE NEW.status
      WHEN 'approved' THEN 'placement_approved'::notification_type
      WHEN 'rejected' THEN 'placement_rejected'::notification_type
      ELSE 'general'::notification_type
    END;

    v_title := CASE NEW.status
      WHEN 'approved' THEN 'Your placement was approved'
      WHEN 'rejected' THEN 'Your placement was rejected'
      WHEN 'active' THEN 'Your placement is now active'
      WHEN 'completed' THEN 'Your placement was marked completed'
      WHEN 'terminated' THEN 'Your placement was terminated'
      ELSE 'Your placement status was updated'
    END;

    v_body := coalesce(v_internship_title, 'Internship') || ' at ' ||
      coalesce(v_company_name, 'the company') ||
      ' is now ' || replace(NEW.status::TEXT, '_', ' ') || '.';
    IF NEW.status = 'rejected' AND NULLIF(NEW.rejection_reason, '') IS NOT NULL THEN
      v_body := v_body || ' Reason: ' || NEW.rejection_reason;
    END IF;

    PERFORM create_notification(
      NEW.student_id,
      v_type,
      v_title,
      v_body,
      '/student/placement'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_placement_status_change
  AFTER INSERT OR UPDATE OF status ON placements
  FOR EACH ROW
  EXECUTE FUNCTION notify_placement_status_change();

-- Populate placements for accepted offers created before this workflow was installed.
INSERT INTO placements (
  application_id,
  student_id,
  company_id,
  university_id,
  start_date,
  end_date,
  status
)
SELECT
  a.id,
  a.student_id,
  i.company_id,
  sp.university_id,
  o.start_date,
  o.end_date,
  'pending_approval'
FROM offers o
JOIN applications a ON a.id = o.application_id
JOIN internships i ON i.id = a.internship_id
JOIN student_profiles sp ON sp.user_id = a.student_id
WHERE o.status = 'accepted'
  AND sp.university_id IS NOT NULL
ON CONFLICT (application_id) DO NOTHING;
