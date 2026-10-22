-- Send new application notifications to the applicant pipeline rather than
-- the internship editor/details page.
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
    '/company/internships/' || NEW.internship_id::TEXT || '/applicants'
  );
  RETURN NEW;
END;
$$;

-- Correct existing notifications created by the previous trigger.
UPDATE notifications
SET link = rtrim(link, '/') || '/applicants'
WHERE type = 'application_received'
  AND link ~ '^/company/internships/[^/]+/?$';
