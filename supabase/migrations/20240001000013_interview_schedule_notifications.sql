-- Send students the interview details and link directly to their schedule.
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_student_id UUID;
  v_title      TEXT;
  v_body       TEXT;
  v_type       notification_type;
  v_link       TEXT;
  v_interview  interviews%ROWTYPE;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT student_id INTO v_student_id FROM applications WHERE id = NEW.id;

    IF NEW.status = 'interview_scheduled' THEN
      SELECT * INTO v_interview
      FROM interviews
      WHERE application_id = NEW.id AND status = 'scheduled'
      ORDER BY created_at DESC
      LIMIT 1;

      v_title := 'Interview scheduled';
      v_body := 'Your interview is scheduled for ' ||
        to_char(v_interview.scheduled_at AT TIME ZONE 'Africa/Addis_Ababa', 'FMDay, FMDD FMMonth YYYY at HH12:MI AM') ||
        ' EAT (' || replace(v_interview.mode::TEXT, '_', ' ') || ').';
      IF NULLIF(v_interview.location_or_link, '') IS NOT NULL THEN
        v_body := v_body || ' Details: ' || v_interview.location_or_link;
      END IF;
      IF NULLIF(v_interview.notes, '') IS NOT NULL THEN
        v_body := v_body || ' Notes: ' || v_interview.notes;
      END IF;
      v_type := 'interview_scheduled';
      v_link := '/student/interviews';
    ELSE
      v_title := CASE NEW.status
        WHEN 'under_review' THEN 'Your application is under review'
        WHEN 'shortlisted' THEN 'Congratulations! You have been shortlisted'
        WHEN 'offered' THEN 'You have received an internship offer!'
        WHEN 'accepted' THEN 'Offer accepted — your placement is confirmed'
        WHEN 'rejected' THEN 'Application update'
        WHEN 'withdrawn' THEN 'Application withdrawn'
        ELSE 'Application status updated'
      END;
      v_body := 'Your application status changed to: ' || NEW.status::TEXT;
      v_type := 'application_status_changed';
      v_link := '/student/applications';
    END IF;

    PERFORM create_notification(v_student_id, v_type, v_title, v_body, v_link);
  END IF;
  RETURN NEW;
END;
$$;
